import './App.css';

import React from 'react';

import { LocalPersistent } from './base/LocalPersistent';
import { deepCopy } from './base/Util';
import { Blueprint } from './gpu/Blueprint';
import { FrameProducer } from './gpu/FrameProducer';
import { BASIC } from './presets/Basic';
import { BOIDS } from './presets/Boids';
import { INSTANCES } from './presets/Instances';
import { ControlPanel } from './ui/ControlPanel';
import { Display, DisplayConfig } from './ui/Display';
import { Editor } from './ui/Editor';

interface Props {}

interface PersistableState {
  blueprint: Blueprint;
  savedBlueprints: Record<string, Blueprint>;
  displayConfig: DisplayConfig;
}

const DEFAULT_STATE: PersistableState = {
  blueprint: BASIC,
  savedBlueprints: {
    Basic: BASIC,
    Boids: BOIDS,
    Instances: INSTANCES,
  },
  displayConfig: {
    aspect: '1:1',
    resolution: { mode: 'pixel', pixelSize: 1 },
  },
};

interface State extends PersistableState {
  compilationInfo: Record<string, GPUCompilationInfo>;
}

class App extends React.Component<Props, State> {
  private persistentState_: LocalPersistent<PersistableState>;
  private frameProducer_: FrameProducer;

  constructor(props: Props) {
    super(props);

    this.persistentState_ = new LocalPersistent<PersistableState>({
      key: 'gpu-app-state',
      default: DEFAULT_STATE,
    });
    this.state = {
      ...this.persistentState_.value,
      compilationInfo: {},
    };

    this.frameProducer_ = new FrameProducer();
    this.frameProducer_.setBlueprint(this.state.blueprint);
  }

  componentDidMount() {
    this.frameProducer_.onShadersCompiled = this.onShadersCompiled_;
  }

  componentDidUpdate() {
    this.persistentState_.value = this.state;
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
    compilationInfo: Record<string, GPUCompilationInfo>
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

    this.setState({ blueprint });
  };

  onDeleteBlueprint_ = (name: string) => {
    this.setState((state, props) => {
      delete state.savedBlueprints[name];
      return { savedBlueprints: state.savedBlueprints };
    });
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
            />
          </div>
        </div>
        <div className="App-bottom">
          <ControlPanel
            displayConfig={this.state.displayConfig}
            onDisplayConfigChange={this.onDisplayConfigChange}
            savedBlueprints={this.state.savedBlueprints}
            onSaveBlueprint={this.onSaveBlueprint_}
            onLoadBlueprint={this.onLoadBlueprint_}
            onDeleteBlueprint={this.onDeleteBlueprint_}
          />
        </div>
      </div>
    );
  }
}

export default App;
