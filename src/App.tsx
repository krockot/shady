import './App.css';

import React from 'react';

import { LocalPersistent } from './base/LocalPersistent';
import { deepCopy } from './base/Util';
import {
  Blueprint,
  deserializeBlueprint,
  serializeBlueprint,
  SerializedBlueprint,
} from './gpu/Blueprint';
import { FrameProducer } from './gpu/FrameProducer';
import { ShaderCompilationResults } from './gpu/program/Program';
import { ControlPanel } from './ui/ControlPanel';
import { Display, DisplayConfig } from './ui/Display';
import { Editor } from './ui/Editor';
import { AppState } from './AppState';

interface Props {
  appState: LocalPersistent<AppState>;
}

interface State extends AppState {
  compilationResults: ShaderCompilationResults;
}

class App extends React.Component<Props, State> {
  private frameProducer_: FrameProducer;
  private blueprint_: Blueprint;

  constructor(props: Props) {
    super(props);

    this.state = {
      ...this.props.appState.value,
      compilationResults: new Map(),
    };

    this.blueprint_ = deserializeBlueprint(this.state.blueprint);

    this.frameProducer_ = new FrameProducer();
    this.frameProducer_.setBlueprint(this.blueprint_);
  }

  componentDidMount() {
    this.frameProducer_.onShadersCompiled = this.onShadersCompiled_;
  }

  componentDidUpdate() {
    this.props.appState.value = this.state;
    this.frameProducer_.setBlueprint(this.blueprint_);
  }

  componentWillUnmount() {
    this.frameProducer_.stop();
  }

  onDisplayConfigChange = (change: Partial<DisplayConfig>) => {
    this.setState((state, props) => {
      return {
        displayConfig: Object.assign({ ...state.displayConfig }, change),
      };
    });
  };

  onFullscreenChange_ = () => {
    this.frameProducer_.reconfigure();
  };

  onBlueprintChange_ = async () => {
    this.frameProducer_.setBlueprint(this.blueprint_);
    this.setState({ blueprint: await serializeBlueprint(this.blueprint_) });
  };

  onShadersCompiled_ = (compilationResults: ShaderCompilationResults) => {
    this.setState({ compilationResults });
  };

  onSaveBlueprint_ = async (name: string) => {
    const serialized = await serializeBlueprint(this.blueprint_);
    this.setState((state, props) => ({
      savedBlueprints: {
        ...state.savedBlueprints,
        [name]: serialized,
      },
    }));
  };

  onLoadBlueprint_ = async (name: string) => {
    const blueprint = this.state.savedBlueprints[name];
    if (!blueprint) {
      return;
    }

    this.blueprint_ = deserializeBlueprint(blueprint);
    const reserialized = await serializeBlueprint(this.blueprint_);

    this.setState(state => {
      const blueprints = state.savedBlueprints;
      blueprints[name] = reserialized;
      return {
        blueprint: deepCopy(blueprint),
        savedBlueprints: blueprints,
      };
    });
  };

  onImportBlueprint_ = (blueprint: SerializedBlueprint) => {
    this.blueprint_ = deserializeBlueprint(blueprint);
    this.setState({ blueprint });
  };

  onDeleteBlueprint_ = (name: string) => {
    this.setState((state, props) => {
      delete state.savedBlueprints[name];
      return { savedBlueprints: state.savedBlueprints };
    });
  };

  onCodeMirrorThemeChange_ = (name: string) => {
    this.setState({ codeMirrorTheme: name });
  };

  render() {
    const renderDisplay = (canvas: HTMLCanvasElement) => {
      let resolution: { width: number; height: number };
      const config = this.state.displayConfig;
      if (config.resolution.mode === 'pixel') {
        const pixelSize =
          config.resolution.pixelSize! >= 1 ? config.resolution.pixelSize! : 1;
        resolution = {
          width: canvas.clientWidth / pixelSize,
          height: canvas.clientHeight / pixelSize,
        };
      } else {
        resolution = { ...config.resolution.framebufferSize! };
      }

      this.frameProducer_.render(canvas, resolution);
    };

    return (
      <div className="App">
        <div className="App-header">
          <div className="App-title">WebGPU Playground</div>
        </div>
        <div className="App-top">
          <div className="App-canvas">
            <Display render={renderDisplay} config={this.state.displayConfig} />
          </div>
          <div className="App-editor">
            <Editor
              compilationResults={this.state.compilationResults}
              blueprint={this.blueprint_}
              onBlueprintChange={this.onBlueprintChange_}
              codeMirrorTheme={this.state.codeMirrorTheme}
            />
          </div>
        </div>
        <div className="App-bottom">
          <ControlPanel
            blueprint={this.blueprint_}
            displayConfig={this.state.displayConfig}
            onDisplayConfigChange={this.onDisplayConfigChange}
            savedBlueprints={this.state.savedBlueprints}
            onSaveBlueprint={this.onSaveBlueprint_}
            onLoadBlueprint={this.onLoadBlueprint_}
            onImportBlueprint={this.onImportBlueprint_}
            onDeleteBlueprint={this.onDeleteBlueprint_}
            codeMirrorTheme={this.state.codeMirrorTheme}
            onCodeMirrorThemeChange={this.onCodeMirrorThemeChange_}
          />
        </div>
      </div>
    );
  }
}

export default App;
