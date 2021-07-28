import './ControlPanel.css';

import React from 'react';

import { DisplayConfig } from './Display';
import { Blueprint } from '../gpu/Blueprint';

interface Props {
  displayConfig: DisplayConfig;
  onDisplayConfigChange: (change: Partial<DisplayConfig>) => void;
  savedBlueprints: Record<string, Blueprint>;
  onSaveBlueprint: (name: string) => void;
  onLoadBlueprint: (name: string) => void;
  onDeleteBlueprint: (name: string) => void;
}

interface State {
  displayOptionsVisible: boolean;
  loadMenuVisible: boolean;
}

export class ControlPanel extends React.Component<Props, State> {
  private pixelSizeToggleRef_: React.RefObject<HTMLInputElement>;
  private pixelSizeRef_: React.RefObject<HTMLInputElement>;
  private framebufferWidthRef_: React.RefObject<HTMLInputElement>;
  private framebufferHeightRef_: React.RefObject<HTMLInputElement>;

  constructor(props: Props) {
    super(props);
    this.state = {
      displayOptionsVisible: false,
      loadMenuVisible: false,
    };

    this.pixelSizeToggleRef_ = React.createRef();
    this.pixelSizeRef_ = React.createRef();
    this.framebufferWidthRef_ = React.createRef();
    this.framebufferHeightRef_ = React.createRef();
  }

  render() {
    const displayConfig = this.props.displayConfig;
    const makeAspectOption = (ratio: string) => (
      <label>
        <input
          type="radio"
          name="aspect"
          value={ratio}
          onChange={this.setAspectRatio_}
          checked={ratio === displayConfig.aspect}
        />
        {ratio}
      </label>
    );

    return (
      <div className="ControlPanel">
        <button className="Toggle" onClick={this.toggleDisplayOptions_}>
          ⚙️
        </button>
        <button className="Toggle" onClick={this.enterFullscreen_}>
          🖥️
        </button>
        {this.state.displayOptionsVisible && (
          <div className="DisplayOptionsPanel">
            <h1>Display Options</h1>
            <h2>Aspect Ratio</h2>
            {makeAspectOption('None')}
            {makeAspectOption('1:1')}
            {makeAspectOption('4:3')}
            {makeAspectOption('16:9')}
            {makeAspectOption('16:10')}
            <h2>Resolution</h2>
            <label>
              <input
                type="radio"
                name="resolution"
                value="pixel"
                ref={this.pixelSizeToggleRef_}
                onChange={this.updateResolution_}
                checked={displayConfig.resolution.mode === 'pixel'}
              />
              Fixed Pixel Size
              <input
                type="number"
                name="pixelSize"
                value={displayConfig.resolution.pixelSize ?? 1}
                ref={this.pixelSizeRef_}
                style={{ width: '3em', marginLeft: '1em' }}
                onChange={this.updateResolution_}
              />
            </label>
            <label>
              <input
                type="radio"
                name="resolution"
                value="framebuffer"
                onChange={this.updateResolution_}
                checked={displayConfig.resolution.mode === 'framebuffer'}
              />
              Fixed Framebuffer Size
              <input
                type="text"
                name="framebufferWidth"
                style={{ width: '4em', marginLeft: '1em' }}
                ref={this.framebufferWidthRef_}
                value={displayConfig.resolution.framebufferSize?.width ?? 4}
                onChange={this.updateResolution_}
              />
              x
              <input
                type="text"
                name="framebufferHeight"
                style={{ width: '4em' }}
                ref={this.framebufferHeightRef_}
                value={displayConfig.resolution.framebufferSize?.height ?? 4}
                onChange={this.updateResolution_}
              />
            </label>
          </div>
        )}
        <button className="Toggle" onClick={this.saveBlueprint_}>
          💾
        </button>
        <button className="Toggle" onClick={this.toggleLoadBlueprintPanel_}>
          📂
        </button>
        {this.state.loadMenuVisible && (
          <div className="LoadBlueprintPanel">
            <h1>Saved Shaders</h1>
            {Object.entries(this.props.savedBlueprints).map(
              ([name, blueprint]) => {
                return (
                  <div key={name} className="LoadMenuItem">
                    <div
                      className="LoadMenuName"
                      onClick={() => this.loadBlueprint_(name)}
                    >
                      {name}
                    </div>
                    <button
                      className="LoadMenuRemove"
                      onClick={() => this.deleteBlueprint_(name)}
                    >
                      x
                    </button>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    );
  }

  saveBlueprint_ = () => {
    const name = prompt('Name it!');
    if (name === null || name === '') {
      return;
    }

    this.props.onSaveBlueprint(name);
  };

  loadBlueprint_ = (name: string) => {
    this.props.onLoadBlueprint(name);
    this.toggleLoadBlueprintPanel_();
  };

  deleteBlueprint_ = (name: string) => {
    this.props.onDeleteBlueprint(name);
  };

  toggleLoadBlueprintPanel_ = () => {
    this.setState((state, props) => ({
      loadMenuVisible: !state.loadMenuVisible,
    }));
  };

  toggleDisplayOptions_ = () => {
    this.setState((state, props) => ({
      displayOptionsVisible: !state.displayOptionsVisible,
    }));
  };

  enterFullscreen_ = async () => {
    document.querySelector('canvas')!.requestFullscreen();
  };

  setAspectRatio_ = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.props.onDisplayConfigChange({ aspect: e.currentTarget.value });
    this.toggleDisplayOptions_();
  };

  updateResolution_ = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.currentTarget!;
    if (
      target === this.pixelSizeToggleRef_.current ||
      target.name === 'pixelSize'
    ) {
      const pixelSize = parseInt(this.pixelSizeRef_.current!.value);
      if (!isNaN(pixelSize)) {
        this.props.onDisplayConfigChange({
          resolution: {
            mode: 'pixel',
            pixelSize,
          },
        });
      }
      return;
    }

    const framebufferSize = {
      width: parseInt(this.framebufferWidthRef_.current!.value),
      height: parseInt(this.framebufferHeightRef_.current!.value),
    };
    if (isNaN(framebufferSize.width) || isNaN(framebufferSize.height)) {
      return;
    }

    this.props.onDisplayConfigChange({
      resolution: {
        mode: 'framebuffer',
        framebufferSize,
      },
    });
  };
}
