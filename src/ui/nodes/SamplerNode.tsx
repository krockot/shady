import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import { SamplerNodeDescriptor } from '../../gpu/Blueprint';
import { Node, NodeProps } from './Node';
import { isValidBindingConnection } from './Validation';

export const SamplerNode = (props: NodeProps<SamplerNodeDescriptor>) => {
  const data = props.data;
  const node = data.node;
  return (
    <Node
      title="Sampler"
      node={node}
      onRename={name => data.onChange({ name })}
      destroy={data.destroy}
    >
      <div className="SamplerDetails">
        <Handle
          type="source"
          className="Handle Binding"
          position={'bottom' as Position}
          isValidConnection={c => isValidBindingConnection(c, data.blueprint)}
        />
      </div>
    </Node>
  );
};
