import './CodeEditor.css';

import 'codemirror/keymap/sublime';

import CodeMirror from '@uiw/react-codemirror';
import React from 'react';

import { BUILTIN_UNIFORMS_WGSL } from '../gpu/BuiltinUniforms';
import { ShaderCompilationInfo } from '../gpu/Executable';

const BUILTIN_WGSL_NUM_LINES = BUILTIN_UNIFORMS_WGSL.split(/\r\n|\r|\n/).length;

interface Props {
  compilationInfo?: ShaderCompilationInfo;
  contents: string;
  mutable: boolean;
  onChange: (contents: string) => void;
  theme: string;
}

export class CodeEditor extends React.Component<Props> {
  private isDecorating_: boolean;

  constructor(props: Props) {
    super(props);
    this.isDecorating_ = false;
  }

  render() {
    return (
      <div className="CodeEditor">
        <CodeMirror
          value={this.props.contents}
          onChange={this.onChange_}
          onUpdate={this.onUpdate_}
          options={{
            theme: this.props.theme,
            keyMap: 'sublime',
            mode: 'rust',
            gutters: ['GutterMessages'],
            readOnly: !this.props.mutable,
          }}
        />
      </div>
    );
  }

  onChange_ = (e: CodeMirror.Editor, change: CodeMirror.EditorChange[]) => {
    this.props.onChange(e.getValue());
  };

  onUpdate_ = (e: CodeMirror.Editor) => {
    if (this.isDecorating_) {
      return;
    }

    this.isDecorating_ = true;
    e.getAllMarks().forEach(m => m.clear());
    e.clearGutter('GutterMessages');
    for (const m of this.props.compilationInfo?.messages ?? []) {
      const className = `MarkedText-${m.type}`;
      const line = m.lineNum - BUILTIN_WGSL_NUM_LINES;
      e.markText(
        { line, ch: m.linePos - 1 },
        { line, ch: m.linePos + m.length - 1 },
        { className }
      );
      const marker = document.createElement('div');
      marker.classList.add('Marker', `Marker-${m.type}`);
      e.setGutterMarker(line, 'GutterMessages', marker);
    }
    this.isDecorating_ = false;
  };
}
