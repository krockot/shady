import './TabContainer.css';

import React, { ReactNode } from 'react';

import { EditableLabel } from './EditableLabel';

interface Props {
  children: ReactNode;
}

interface State {
  activeTab: number;
}

export class TabContainer extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      activeTab: 0,
    };
  }

  render() {
    return (
      <div className="TabContainer">
        <div className="TabStrip">{this.renderTabs_()}</div>
        <div className="ContentArea">{this.renderActiveTabContent_()}</div>
      </div>
    );
  }

  renderTabs_() {
    const children = React.Children.toArray(this.props.children);
    return children.map((child, i) => {
      if (!React.isValidElement(child)) {
        return null;
      }

      const active = this.state.activeTab === i;
      const z = children.length - i;
      return (
        <div
          key={i}
          style={{ zIndex: active ? children.length : z }}
          className={`${active ? 'Tab Active' : 'Tab Inactive'}
                      ${child.props.removable ? 'Removable' : 'Permanent'}`}
          onClick={_ => this.setActiveTab_(i)}
        >
          {child.props.renameable ? (
            <EditableLabel
              value={child.props.title}
              onChange={child.props.onRename}
            />
          ) : (
            child.props.title
          )}
          {child.props.removable && (
            <button className="RemoveButton" onClick={child.props.onClose}>
              x
            </button>
          )}
        </div>
      );
    });
  }

  setActiveTab_(tab: number) {
    this.setState({ activeTab: tab });
  }

  renderActiveTabContent_() {
    const children = React.Children.toArray(this.props.children);
    if (children.length === 0) {
      return;
    }

    let tab = this.state.activeTab;
    if (tab >= children.length) {
      this.setActiveTab_(0);
      return children[0];
    }

    return children[tab];
  }
}

interface TabProps {
  title: string;
  removable?: boolean;
  renameable?: boolean;
  onClose?: () => void;
  onRename?: (newName: string) => void;
}

export class Tab extends React.Component<TabProps> {
  render() {
    if (this.props.children) {
      return this.props.children;
    }
    return <div />;
  }
}
