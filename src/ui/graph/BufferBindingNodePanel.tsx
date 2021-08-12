import './NodePanel.css';

import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import {
  BufferBindingNodeDescriptor,
  BufferBindingStorageType,
} from '../../gpu/Blueprint';
import { NodePanel, NodePanelProps } from './NodePanel';

export const BufferBindingNodePanel = (
  props: NodePanelProps<BufferBindingNodeDescriptor>
) => {
  const data = props.data;
  const node = data.node;
  return (
    <NodePanel className="BufferBinding" node={node} destroy={data.destroy}>
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
      <select
        value={node.storageType}
        onChange={e =>
          data.onChange({
            storageType: e.currentTarget.value as BufferBindingStorageType,
          })
        }
      >
        <option value="storage-read">Storage (r/o)</option>
        <option value="storage">Storage (r/w)</option>
        <option value="uniform">Uniform</option>
        <option value="sampler">Sampler</option>
        <option value="texture">Texture</option>
      </select>
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
