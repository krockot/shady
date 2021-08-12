import './NodePanel.css';

import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import { TextureBindingNodeDescriptor } from '../../gpu/Blueprint';
import { NodePanel, NodePanelProps } from './NodePanel';

export const TextureBindingNodePanel = (
  props: NodePanelProps<TextureBindingNodeDescriptor>
) => {
  const data = props.data;
  const node = data.node;
  return (
    <NodePanel title="" node={node} destroy={data.destroy}>
      <Handle
        type="target"
        position={'top' as Position}
        className="Handle BindingStub"
        isConnectable={false}
      />
      <Handle
        type="source"
        position={'bottom' as Position}
        className="Handle BindingStub"
        isConnectable={false}
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
    </NodePanel>
  );
};
