import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import { SamplerNodeDescriptor } from '../../gpu/Blueprint';
import { makeNodeType } from './NodeTypeFactory';
import { isValidBindingConnection } from './Validation';

export const SamplerNode = makeNodeType<SamplerNodeDescriptor>({
  title: 'Sampler',
  context: React.createRef(),
  render: data => {
    return (
      <div className="SamplerDetails">
        <Handle
          type="source"
          className="Handle Binding"
          position={'bottom' as Position}
          isValidConnection={c => isValidBindingConnection(c, data.blueprint)}
        />
      </div>
    );
  },
});
