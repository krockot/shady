import './Node.css';

import React from 'react';

import { BindingNodeDescriptor, BindingType } from '../../gpu/Blueprint';
import { makeEdgeType } from './EdgeTypeFactory';

export const BufferBindingEdge = makeEdgeType<BindingNodeDescriptor>({
  width: 150,
  height: 85,
  render: data => (
    <div>
      <select
        value={data.descriptor.bindingType}
        style={{ width: '8em', marginLeft: '1em' }}
        onChange={e =>
          data.onChange({
            bindingType: e.currentTarget.value as BindingType,
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