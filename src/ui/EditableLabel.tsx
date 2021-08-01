import './EditableLabel.css';

import React from 'react';

interface Props {
  value: string;
  enabled?: boolean;
  emptyText?: string;
  onChange: (value: string) => void;
}

interface State {
  value: string;
  isEditing: boolean;
}

export class EditableLabel extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      value: props.value ?? '',
      isEditing: false,
    };
  }

  render() {
    const isEmpty = this.state.value === '';
    const isEditing = this.state.isEditing;
    const editingClass = isEditing ? 'Editing' : 'NotEditing';
    const emptyClass = isEmpty ? 'Empty' : 'NotEmpty';
    const defaultValue = !isEmpty
      ? this.state.value
      : this.props.emptyText ?? '';
    return (
      <input
        className={`EditableLabel ${editingClass} ${emptyClass}`}
        type="text"
        onKeyDown={this.onKeyDown_}
        onBlur={this.onFocusOut_}
        defaultValue={defaultValue}
        readOnly={!isEditing}
        onClick={this.onClick_}
        autoFocus
      />
    );
  }

  onClick_ = (e: React.MouseEvent<HTMLInputElement>) => {
    if (this.props.enabled === false) {
      return;
    }
    this.setState({ isEditing: true });
  };

  commit_ = (untrimmedValue: string) => {
    const value = untrimmedValue.trim();
    if (value === '') {
      this.setState({ isEditing: false });
      return;
    }
    this.setState({ value, isEditing: false });
    this.props.onChange(value);
  };

  onKeyDown_ = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      this.commit_(e.currentTarget.value);
    } else if (e.key === 'Escape') {
      this.setState({ isEditing: false });
    }
  };

  onFocusOut_ = (e: React.FocusEvent<HTMLInputElement>) => {
    this.commit_(e.currentTarget.value);
  };
}
