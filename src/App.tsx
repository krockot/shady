import './App.css';

import React from 'react';

import { LocalPersistent } from './base/LocalPersistent';
import { deepCopy } from './base/Util';
import { Blueprint, canonicalize } from './gpu/Blueprint';
import { ShaderCompilationInfo } from './gpu/Executable';
import { FrameProducer } from './gpu/FrameProducer';
import { ControlPanel } from './ui/ControlPanel';
import { Display, DisplayConfig } from './ui/Display';
import { Editor } from './ui/Editor';
import { AppState } from './AppState';

interface Props {
  appState: LocalPersistent<AppState>;
}

interface State extends AppState {
  compilationInfo: Record<string, ShaderCompilationInfo>;
}

class App extends React.Component<Props, State> {
  private frameProducer_: FrameProducer;

  constructor(props: Props) {
    super(props);

    this.state = {
      ...this.props.appState.value,
      compilationInfo: {},
    };

    canonicalize(this.state.blueprint);

    this.frameProducer_ = new FrameProducer();
    this.frameProducer_.setBlueprint(this.state.blueprint);
  }

  componentDidMount() {
    this.frameProducer_.onShadersCompiled = this.onShadersCompiled_;
  }

  componentDidUpdate() {
    this.props.appState.value = this.state;
    this.frameProducer_.setBlueprint(this.state.blueprint);
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

  onBlueprintChange_ = () => {
    this.frameProducer_.setBlueprint(this.state.blueprint);
  };

  onShadersCompiled_ = (
    compilationInfo: Record<string, ShaderCompilationInfo>
  ) => {
    this.setState({ compilationInfo });
  };

  onSaveBlueprint_ = (name: string) => {
    this.setState((state, props) => ({
      savedBlueprints: {
        ...state.savedBlueprints,
        [name]: deepCopy(state.blueprint),
      },
    }));
  };

  onLoadBlueprint_ = (name: string) => {
    const blueprint = deepCopy(this.state.savedBlueprints[name]);
    if (!blueprint) {
      return;
    }

    canonicalize(blueprint);
    this.setState({ blueprint });
  };

  onImportBlueprint_ = (blueprint: Blueprint) => {
    canonicalize(blueprint);
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
              compilationInfo={this.state.compilationInfo}
              blueprint={this.state.blueprint}
              onBlueprintChange={this.onBlueprintChange_}
              codeMirrorTheme={this.state.codeMirrorTheme}
            />
          </div>
        </div>
        <div className="App-bottom">
          <ControlPanel
            blueprint={this.state.blueprint}
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
