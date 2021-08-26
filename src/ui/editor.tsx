import './editor.css';

import React from 'react';
import { FlowTransform } from 'react-flow-renderer';

import { deepCopy } from '../base/util';
import { Blueprint, ShaderID } from '../blueprint/blueprint';
import { BUILTIN_UNIFORMS_WGSL } from '../gpu/builtin_uniforms';
import { ShaderCompilationResults } from '../gpu/program/program';
import { BlueprintEditor } from './blueprint_editor';
import { CodeEditor } from './code_editor';
import { TabContainer } from './tab_container';

interface Props {
  blueprint: Blueprint;
  onBlueprintChange: (blueprint: Blueprint) => void;
  compilationResults: ShaderCompilationResults;
  viewTransform: FlowTransform;
  onViewTransformChange: (transform: FlowTransform) => void;
  codeMirrorTheme: string;
}

export const Editor = (props: Props) => {
  const removeShader = (id: ShaderID) => {
    const blueprint = deepCopy(props.blueprint);
    delete blueprint.shaders[id];
    props.onBlueprintChange(blueprint);
  };

  const renameShader = (id: ShaderID, newName: string) => {
    const blueprint = deepCopy(props.blueprint);
    blueprint.shaders[id].name = newName;
    props.onBlueprintChange(blueprint);
  };

  const refreshEditor = (ref: React.RefObject<CodeEditor>) => {
    if (ref.current) {
      ref.current.refresh();
    }
  };

  const shaders = Object.entries(props.blueprint.shaders);
  const uniformsRef: React.RefObject<CodeEditor> = React.createRef();
  const refs: React.RefObject<CodeEditor>[] = shaders.map(() =>
    React.createRef()
  );

  return (
    <div className="Editor">
      <TabContainer
        tabs={[
          { key: 'Blueprint', title: 'Blueprint', mutable: false },
          {
            key: 'Uniforms',
            title: 'Uniforms',
            mutable: false,
            onActivate: () => {
              refreshEditor(uniformsRef);
            },
          },
          ...shaders.map(([id, shader], index) => ({
            key: id,
            title: shader.name,
            mutable: true,
            onActivate: () => {
              refreshEditor(refs[index]);
            },
            onClose: () => removeShader(id),
            onRename: (newName: string) => renameShader(id, newName),
          })),
        ]}
      >
        <BlueprintEditor
          blueprint={props.blueprint}
          transform={props.viewTransform}
          onChange={props.onBlueprintChange}
          onTransformChange={props.onViewTransformChange}
        />
        <CodeEditor
          ref={uniformsRef}
          key="Uniforms"
          contents={BUILTIN_UNIFORMS_WGSL}
          mutable={false}
          onChange={() => ({})}
          theme={props.codeMirrorTheme}
        />
        {shaders.map(([id, shader], index) => (
          <CodeEditor
            key={id}
            ref={refs[index]}
            compilationMessages={props.compilationResults.get(shader.id)}
            contents={shader.code}
            mutable={true}
            onChange={code => {
              const blueprint = deepCopy(props.blueprint);
              blueprint.shaders[id].code = code;
              props.onBlueprintChange(blueprint);
            }}
            theme={props.codeMirrorTheme}
          />
        ))}
      </TabContainer>
    </div>
  );
};
