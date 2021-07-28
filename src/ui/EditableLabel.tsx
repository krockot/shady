import './EditableLabel.css';

import React from 'react';

interface Props {
  value: string;
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
    return (
      <div className="EditableLabel">
        {this.state.isEditing ? (
          <input
            className="LabelText"
            type="text"
            onChange={this.onChange_}
            onKeyDown={this.onKeyDown_}
            onBlur={this.onFocusOut_}
            value={this.state.value}
            autoFocus
          />
        ) : (
          <div
            className={`Label ${this.state.value === '' ? 'Empty' : ''}`}
            onClick={this.onClick_}
          >
            {this.state.value !== ''
              ? this.state.value
              : this.props.emptyText ?? ''}
          </div>
        )}
      </div>
    );
  }

  onClick_ = () => {
    this.setState({ isEditing: true });
  };

  onChange_ = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    this.setState({ value });
    this.props.onChange(value);
  };

  onKeyDown_ = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      this.setState({ isEditing: false });
    }
  };

  onFocusOut_ = () => {
    this.setState({ isEditing: false });
  };
}
