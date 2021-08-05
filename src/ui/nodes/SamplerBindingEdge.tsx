import './Node.css';

import React from 'react';

import { SamplerBindingEdgeDescriptor } from '../../gpu/Blueprint';
import { makeEdgeType } from './EdgeTypeFactory';

export const SamplerBindingEdge = makeEdgeType<SamplerBindingEdgeDescriptor>({
  width: 150,
  height: 85,
  render: data => (
    <div>
      <button className="RemoveButton" onClick={data.destroy}>
        X
      </button>
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
