import './NodePanel.css';

import React, { ReactNode } from 'react';

import { Blueprint, NodeDescriptor } from '../../gpu/Blueprint';
import { EditableLabel } from '../EditableLabel';
import { LabeledField } from '../LabeledField';

type UpdateFn<DescriptorType extends NodeDescriptor> = (
  update: Partial<DescriptorType>
) => void;

interface NodePanelData<DescriptorType extends NodeDescriptor> {
  blueprint: Blueprint;
  node: DescriptorType;
  onChange: UpdateFn<DescriptorType>;
  destroy: () => void;
}

export interface NodePanelProps<DescriptorType extends NodeDescriptor> {
  data: NodePanelData<DescriptorType>;
}

interface Props {
  title?: string;
  className?: string;
  node: NodeDescriptor;
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
