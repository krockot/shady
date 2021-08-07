import './TabContainer.css';

import React, { ReactNode } from 'react';

import { EditableLabel } from './EditableLabel';

interface TabDescriptor {
  key: string;
  title: string;
  mutable: boolean;
  onClose?: () => void;
  onRename?: (newName: string) => void;
}

interface Props {
  tabs: TabDescriptor[];
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

  componentDidUpdate() {
    const numChildren = React.Children.count(this.props.children);
    if (this.state.activeTab >= numChildren) {
      this.setState({ activeTab: numChildren - 1 });
    }
  }

  render() {
    return (
      <div className="TabContainer">
        {this.renderTabs_()}
        <div className="ContentArea">
          {React.Children.toArray(this.props.children).map((child, i) => {
            const active = i === this.state.activeTab;
            return (
              <div
                key={i}
                className={`Content ${active ? 'Active' : 'Inactive'}`}
              >
                {child}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  renderTabs_() {
    const children = React.Children.toArray(this.props.children);
    return (
      <div className="TabStrip">
        {this.props.tabs.map((tab, i) => {
          const active = this.state.activeTab === i;
          const z = this.props.tabs.length - i;
          return (
            <div
              key={tab.key + tab.title}
              style={{ zIndex: active ? children.length : z }}
              className={`${active ? 'Tab Active' : 'Tab Inactive'}
                          ${tab.mutable ? 'Removable' : 'Permanent'}`}
              onClick={_ => this.setActiveTab_(i)}
            >
              <EditableLabel
                enabled={tab.mutable && active}
                value={tab.title}
                onChange={tab.onRename ?? (() => ({}))}
              />
              {tab.mutable && (
                <button
                  className="RemoveButton"
                  onClick={e => {
                    if (tab.onClose) {
                      tab.onClose();
                    }
                    e.stopPropagation();
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  setActiveTab_(tab: number) {
    this.setState({ activeTab: tab });
  }
}
