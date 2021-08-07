import './Node.css';

import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import { SamplerBindingNodeDescriptor } from '../../gpu/Blueprint';
import { Node, NodeProps } from './Node';
import { isValidBindingConnection } from './Validation';

export const SamplerBindingNode = (
  props: NodeProps<SamplerBindingNodeDescriptor>
) => {
  const data = props.data;
  const node = data.node;
  return (
    <Node title="" node={node} destroy={data.destroy}>
      <Handle
        type="target"
        position={'top' as Position}
        className="Handle BindingStub"
        isValidConnection={c => isValidBindingConnection(c, data.blueprint)}
      />
      <Handle
        type="source"
        position={'bottom' as Position}
        className="Handle BindingStub"
        isValidConnection={c => isValidBindingConnection(c, data.blueprint)}
      />
      <div>
        <div className="Row">
          Group
          <input
            type="number"
            value={node.group}
            onChange={e =>
              data.onChange({ group: e.currentTarget.valueAsNumber })
            }
          />
        </div>
        <div className="Row">
          Binding
          <input
            type="number"
            value={node.binding}
            onChange={e =>
              data.onChange({ binding: e.currentTarget.valueAsNumber })
            }
          />
        </div>
      </div>
    </Node>
  );
};
