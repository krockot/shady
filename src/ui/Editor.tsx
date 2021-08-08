import './Editor.css';

import React from 'react';

import { Blueprint } from '../gpu/Blueprint';
import { BUILTIN_UNIFORMS_WGSL } from '../gpu/BuiltinUniforms';
import { ShaderCompilationInfo } from '../gpu/Executable';
import { BlueprintEditor } from './BlueprintEditor';
import { CodeEditor } from './CodeEditor';
import { TabContainer } from './TabContainer';

interface Props {
  blueprint: Blueprint;
  onBlueprintChange: () => void;

  compilationInfo: Record<string, ShaderCompilationInfo>;

  codeMirrorTheme: string;
}

export const Editor = (props: Props) => {
  const removeShader = (id: string) => {
    delete props.blueprint.shaders[id];
    props.onBlueprintChange();
  };

  const renameShader = (id: string, newName: string) => {
    props.blueprint.shaders[id].name = newName;
    props.onBlueprintChange();
  };

  const refreshEditor = (ref: React.RefObject<CodeEditor>) => {
    if (ref.current) {
      ref.current.refresh();
    }
  };

  const shaders = Object.entries(props.blueprint.shaders);
  const uniformsRef : React.RefObject<CodeEditor> = React.createRef();
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
            onActivate: () => { refreshEditor(uniformsRef); },
          },
          ...shaders.map(([id, shader], index) => ({
            key: id,
            title: shader.name,
            mutable: true,
            onActivate: () => { refreshEditor(refs[index]); },
            onClose: () => removeShader(id),
            onRename: (newName: string) => renameShader(id, newName),
          })),
        ]}
      >
        <BlueprintEditor
          blueprint={props.blueprint}
          onChange={props.onBlueprintChange}
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
            compilationInfo={props.compilationInfo[id]}
            contents={shader.code}
            mutable={true}
            onChange={code => {
              shader.code = code;
              props.onBlueprintChange();
            }}
            theme={props.codeMirrorTheme}
          />
        ))}
      </TabContainer>
    </div>
  );
};
