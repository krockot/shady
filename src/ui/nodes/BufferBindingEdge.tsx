import './Node.css';

import React from 'react';

import {
  BufferBindingEdgeDescriptor,
  BufferBindingStorageType,
} from '../../gpu/Blueprint';
import { makeEdgeType } from './EdgeTypeFactory';

export const BufferBindingEdge = makeEdgeType<BufferBindingEdgeDescriptor>({
  width: 150,
  height: 85,
  render: data => (
    <div>
      <button className="RemoveButton" onClick={data.destroy}>
        X
      </button>
      <select
        value={data.descriptor.storageType}
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
            value={data.descriptor.group}
            onChange={e =>
              data.onChange({ group: e.currentTarget.valueAsNumber })
            }
          />
        </div>
        <div className="Row">
          Binding
          <input
            type="number"
            value={data.descriptor.binding}
            onChange={e =>
              data.onChange({ binding: e.currentTarget.valueAsNumber })
            }
          />
        </div>
      </div>
    </div>
  ),
});
