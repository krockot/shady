import './Node.css';

import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import {
  BufferBindingNodeDescriptor,
  BufferBindingStorageType,
} from '../../gpu/Blueprint';
import { Node, NodeProps } from './Node';
import { isValidBindingConnection } from './Validation';

export const BufferBindingNode = (
  props: NodeProps<BufferBindingNodeDescriptor>
) => {
  const data = props.data;
  const node = data.node;
  return (
    <Node node={node} destroy={data.destroy}>
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
      <select
        value={node.storageType}
        style={{ width: '8em', marginLeft: '1em' }}
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
    </Node>
  );
};
