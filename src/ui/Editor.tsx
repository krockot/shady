import './Editor.css';

import React from 'react';

import { Blueprint } from '../gpu/Blueprint';
import { BlueprintEditor } from './BlueprintEditor';
import { CodeEditor } from './CodeEditor';
import { TabContainer, Tab } from './TabContainer';

interface Props {
  blueprint: Blueprint;
  onBlueprintChange: () => void;

  compilationInfo: Record<string, GPUCompilationInfo>;
}

export class Editor extends React.Component<Props> {
  render() {
    return (
      <div className="Editor">
        <TabContainer>
          <Tab title="Blueprint">
            <BlueprintEditor
              blueprint={this.props.blueprint}
              onChange={this.props.onBlueprintChange}
            />
          </Tab>
          {Object.entries(this.props.blueprint.shaders).map(([id, shader]) => (
            <Tab
              key={shader.name}
              title={shader.name}
              removable={true}
              renameable={true}
              onClose={() => this.removeShader_(id)}
              onRename={newName => this.renameShader_(id, newName)}
            >
              <CodeEditor
                compilationInfo={this.props.compilationInfo[id]}
                contents={shader.code}
                onChange={code => {
                  shader.code = code;
                  this.props.onBlueprintChange();
                }}
              />
            </Tab>
          ))}
        </TabContainer>
      </div>
    );
  }

  removeShader_ = (id: string) => {
    delete this.props.blueprint.shaders[id];
    this.props.onBlueprintChange();
  };

  renameShader_ = (id: string, newName: string) => {
    this.props.blueprint.shaders[id].name = newName;
    this.props.onBlueprintChange();
  };
}
