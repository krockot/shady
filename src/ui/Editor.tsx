import './Editor.css';

import React from 'react';

import { Blueprint } from '../gpu/Blueprint';
import { BUILTIN_UNIFORMS_WGSL } from '../gpu/BuiltinUniforms';
import { BlueprintEditor } from './BlueprintEditor';
import { CodeEditor } from './CodeEditor';
import { TabContainer } from './TabContainer';

interface Props {
  blueprint: Blueprint;
  onBlueprintChange: () => void;

  compilationInfo: Record<string, GPUCompilationInfo>;
}

export class Editor extends React.Component<Props> {
  render() {
    const shaders = Object.entries(this.props.blueprint.shaders);
    return (
      <div className="Editor">
        <TabContainer
          tabs={[
            { key: 'Blueprint', title: 'Blueprint', mutable: false },
            { key: 'Uniforms', title: 'Uniforms', mutable: false },
            ...shaders.map(([id, shader]) => ({
              key: id,
              title: shader.name,
              mutable: true,
              onClose: () => this.removeShader_(id),
              onRename: (newName: string) => this.renameShader_(id, newName),
            })),
          ]}
        >
          <BlueprintEditor
            blueprint={this.props.blueprint}
            onChange={this.props.onBlueprintChange}
          />
          <CodeEditor
            key="Uniforms"
            contents={BUILTIN_UNIFORMS_WGSL}
            mutable={false}
            onChange={() => ({})}
          />
          {shaders.map(([id, shader]) => (
            <CodeEditor
              key={id}
              compilationInfo={this.props.compilationInfo[id]}
              contents={shader.code}
              mutable={true}
              onChange={code => {
                shader.code = code;
                this.props.onBlueprintChange();
              }}
            />
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
