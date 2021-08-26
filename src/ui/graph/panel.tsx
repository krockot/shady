import './panel.css';

import React, { ReactNode } from 'react';

import { Blueprint, Node } from '../../gpu/blueprint';
import { EditableLabel } from '../editable_label';
import { LabeledField } from '../labeled_field';

type UpdateFn<NodeType extends Node> = (update: Partial<NodeType>) => void;

export interface PanelData<NodeType extends Node> {
  blueprint: Blueprint;
  node: NodeType;
  onChange: UpdateFn<NodeType>;
  destroy: () => void;
}

export interface PanelProps<NodeType extends Node> {
  data: PanelData<NodeType>;
}

interface Props {
  title?: string;
  className?: string;
  node: Node;
  onRename?: (name: string) => void;
  destroy: () => void;
  children?: ReactNode;
}

export const Panel = (props: Props) => {
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
