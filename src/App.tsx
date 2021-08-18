import './App.css';

import React from 'react';
import { FlowTransform } from 'react-flow-renderer';

import { LocalPersistent } from './base/LocalPersistent';
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
import { AppData } from './AppData';

interface Props {
  data: LocalPersistent<AppData>;
}

export interface AppState {
  blueprint: Blueprint;
  savedBlueprints: Record<string, SerializedBlueprint>;
  displayConfig: DisplayConfig;
  codeMirrorTheme: string;
  editorViewTransform: FlowTransform;
  compilationResults: ShaderCompilationResults;
}

class App extends React.Component<Props, AppState> {
  private frameProducer_: FrameProducer;

  constructor(props: Props) {
    super(props);

    this.state = {
      blueprint: deserializeBlueprint(this.data.blueprint),
      savedBlueprints: this.data.savedBlueprints,
      displayConfig: this.data.displayConfig,
      codeMirrorTheme: this.data.codeMirrorTheme,
      editorViewTransform: this.data.editorViewTransform,
      compilationResults: new Map(),
    };

    this.frameProducer_ = new FrameProducer();
    this.frameProducer_.setBlueprint(this.state.blueprint);
  }

  get data() {
    return this.props.data.value;
  }

  updateData_(update: Partial<AppData>) {
    const data = this.props.data.value;
    Object.assign(data, update);
    this.props.data.value = data;
  }

  componentDidMount() {
    this.frameProducer_.onShadersCompiled = this.onShadersCompiled_;
  }

  async componentDidUpdate() {
    const blueprint = this.state.blueprint;
    this.frameProducer_.setBlueprint(blueprint);
    this.updateData_({
      blueprint: await serializeBlueprint(blueprint),
      savedBlueprints: this.state.savedBlueprints,
      displayConfig: this.state.displayConfig,
      codeMirrorTheme: this.state.codeMirrorTheme,
      editorViewTransform: this.state.editorViewTransform,
    });
  }

  componentWillUnmount() {
    this.frameProducer_.stop();
  }

  onDisplayConfigChange = (change: Partial<DisplayConfig>) => {
    this.setState(state => {
      return {
        displayConfig: Object.assign({ ...state.displayConfig }, change),
      };
    });
  };

  onBlueprintChange_ = (blueprint: Blueprint) => {
    this.setState({ blueprint });
  };

  onViewTransformChange_ = (transform: FlowTransform) => {
    this.setState({ editorViewTransform: transform });
  };

  onShadersCompiled_ = (compilationResults: ShaderCompilationResults) => {
    this.setState({ compilationResults });
  };

  onSaveBlueprint_ = async (name: string) => {
    const serialized = await serializeBlueprint(this.state.blueprint);
    this.setState(state => ({
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
    this.onBlueprintChange_(deserializeBlueprint(blueprint));
  };

  onImportBlueprint_ = (blueprint: SerializedBlueprint) => {
    this.onBlueprintChange_(deserializeBlueprint(blueprint));
  };

  onDeleteBlueprint_ = (name: string) => {
    this.setState(state => {
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
              blueprint={this.state.blueprint}
              onBlueprintChange={this.onBlueprintChange_}
              codeMirrorTheme={this.state.codeMirrorTheme}
              viewTransform={this.state.editorViewTransform}
              onViewTransformChange={this.onViewTransformChange_}
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
