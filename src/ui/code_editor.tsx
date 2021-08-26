import './code_editor.css';

import 'codemirror/keymap/sublime';

import CodeMirror, { IEditorInstance } from '@uiw/react-codemirror';
import React from 'react';

import { ShaderCompilationMessage } from '../gpu/program/shader_cache';

interface Props {
  compilationMessages?: ShaderCompilationMessage[];
  contents: string;
  mutable: boolean;
  onChange: (contents: string) => void;
  theme: string;
}

export class CodeEditor extends React.Component<Props> {
  private isDecorating_: boolean;
  private editorRef_: React.RefObject<IEditorInstance>;

  constructor(props: Props) {
    super(props);
    this.isDecorating_ = false;
    this.editorRef_ = React.createRef();
  }

  shouldComponentUpdate(nextProps: Props) {
    return nextProps.theme !== this.props.theme;
  }

  refresh() {
    const cm = this.editorRef_.current;
    if (cm) {
      cm.editor.refresh();
    }
  }

  render() {
    return (
      <div className="CodeEditor">
        <CodeMirror
          ref={this.editorRef_}
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

  onChange_ = (e: CodeMirror.Editor, change: CodeMirror.EditorChange) => {
    this.props.onChange(e.getValue());
  };

  onUpdate_ = (e: CodeMirror.Editor) => {
    if (this.isDecorating_) {
      return;
    }

    this.isDecorating_ = true;
    e.getAllMarks().forEach(m => m.clear());
    e.clearGutter('GutterMessages');
    for (const m of this.props.compilationMessages ?? []) {
      const className = `MarkedText-${m.type}`;
      const line = m.lineNum;
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
