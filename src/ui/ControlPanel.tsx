import './ControlPanel.css';

import React from 'react';

import { Blueprint } from '../gpu/Blueprint';
import { CODE_MIRROR_THEMES } from './CodeMirrorThemes';
import { DisplayConfig } from './Display';
import { LabeledField } from './LabeledField';

interface Props {
  displayConfig: DisplayConfig;
  onDisplayConfigChange: (change: Partial<DisplayConfig>) => void;
  savedBlueprints: Record<string, Blueprint>;
  onSaveBlueprint: (name: string) => void;
  onLoadBlueprint: (name: string) => void;
  onDeleteBlueprint: (name: string) => void;
  codeMirrorTheme: string;
  onCodeMirrorThemeChange: (name: string) => void;
}

interface State {
  optionsVisible: boolean;
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
      optionsVisible: false,
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
        <button
          className="Toggle"
          title="Options"
          onClick={this.toggleOptions_}
        >
          ⚙️
        </button>
        <button
          className="Toggle"
          title="Toggle Fullscreen"
          onClick={this.enterFullscreen_}
        >
          🖥️
        </button>
        {this.state.optionsVisible && (
          <div className="OptionsPanel">
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
            <h1>Editor Options</h1>
            <LabeledField label="Theme">
              <select
                value={this.props.codeMirrorTheme}
                onChange={e =>
                  this.props.onCodeMirrorThemeChange(e.currentTarget.value)
                }
              >
                {CODE_MIRROR_THEMES.map(theme => {
                  return <option value={theme}>{theme}</option>;
                })}
              </select>
            </LabeledField>
          </div>
        )}
        <button
          className="Toggle"
          onClick={this.saveBlueprint_}
          title="Save Blueprint"
        >
          💾
        </button>
        <button
          className="Toggle"
          onClick={this.toggleLoadBlueprintPanel_}
          title="Load Blueprint"
        >
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

  toggleOptions_ = () => {
    this.setState((state, props) => ({
      optionsVisible: !state.optionsVisible,
    }));
  };

  enterFullscreen_ = async () => {
    document.querySelector('canvas')!.requestFullscreen();
  };

  setAspectRatio_ = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.props.onDisplayConfigChange({ aspect: e.currentTarget.value });
    this.toggleOptions_();
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
