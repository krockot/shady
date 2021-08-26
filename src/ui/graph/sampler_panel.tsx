import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import { SamplerNode } from '../../blueprint/blueprint';
import { Panel, PanelProps } from './panel';
import { isValidBindingConnection } from './connection_validation';

export const SamplerPanel = (props: PanelProps<SamplerNode>) => {
  const data = props.data;
  const node = data.node;
  return (
    <Panel
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
    </Panel>
  );
};
