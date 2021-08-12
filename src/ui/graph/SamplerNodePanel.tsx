import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import { SamplerNodeDescriptor } from '../../gpu/Blueprint';
import { NodePanel, NodePanelProps } from './NodePanel';
import { isValidBindingConnection } from './Validation';

export const SamplerNodePanel = (
  props: NodePanelProps<SamplerNodeDescriptor>
) => {
  const data = props.data;
  const node = data.node;
  return (
    <NodePanel
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
    </NodePanel>
  );
};
