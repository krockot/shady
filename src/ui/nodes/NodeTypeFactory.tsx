import './Node.css';

import { ReactNode } from 'react';
import { Blueprint, NodeDescriptorBase } from '../../gpu/Blueprint';
import { EditableLabel } from '../EditableLabel';
import { LabeledField } from '../LabeledField';

type UpdateFn<DescriptorType extends NodeDescriptorBase> = (
  update: Partial<DescriptorType>
) => void;

interface NodeData<DescriptorType extends NodeDescriptorBase> {
  blueprint: Blueprint;
  descriptor: DescriptorType;
  onChange: UpdateFn<DescriptorType>;
  destroy: () => void;
}

type RenderFn<DescriptorType extends NodeDescriptorBase> = (
  data: NodeData<DescriptorType>
) => ReactNode;

interface Params<DescriptorType extends NodeDescriptorBase> {
  title: string;
  render: RenderFn<DescriptorType>;
}

export function makeNodeType<DescriptorType extends NodeDescriptorBase>(
  params: Params<DescriptorType>
) {
  interface NodeProps {
    data: NodeData<DescriptorType>;
  }

  return (props: NodeProps) => {
    const node = props.data.descriptor;
    const onChangeName = (value: string) => {
      props.data.onChange({ name: value } as Partial<DescriptorType>);
    };

    return (
      <div className={`Node Node-${node.type}`}>
        <button className="RemoveButton" onClick={props.data.destroy}>
          X
        </button>
        <div className="Title">{params.title}</div>
        <div className="Content">
          <LabeledField label="Name">
            <EditableLabel value={node.name} onChange={onChangeName} />
          </LabeledField>
          {params.render(props.data)}
        </div>
      </div>
    );
  };
}
