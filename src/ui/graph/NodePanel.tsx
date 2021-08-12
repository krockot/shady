import './NodePanel.css';

import React, { ReactNode } from 'react';

import { Blueprint, Node } from '../../gpu/Blueprint';
import { EditableLabel } from '../EditableLabel';
import { LabeledField } from '../LabeledField';

type UpdateFn<NodeType extends Node> = (update: Partial<NodeType>) => void;

interface NodePanelData<NodeType extends Node> {
  blueprint: Blueprint;
  node: NodeType;
  onChange: UpdateFn<NodeType>;
  destroy: () => void;
}

export interface NodePanelProps<NodeType extends Node> {
  data: NodePanelData<NodeType>;
}

interface Props {
  title?: string;
  className?: string;
  node: Node;
  onRename?: (name: string) => void;
  destroy: () => void;
  children?: ReactNode;
}

export const NodePanel = (props: Props) => {
  return (
    <div className={`Node Node-${props.node.type} ${props.className}`}>
      <button className="RemoveButton" onClick={props.destroy}></button>
      <div className="Title">{props.title}</div>
      <div className="Content">
        {props.onRename ? (
          <LabeledField label="Name">
            <EditableLabel value={props.node.name} onChange={props.onRename} />
          </LabeledField>
        ) : (
          <div />
        )}
        {props.children}
      </div>
    </div>
  );
};
