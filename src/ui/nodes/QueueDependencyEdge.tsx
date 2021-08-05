import './Node.css';

import React from 'react';

import { QueueDependencyEdgeDescriptor } from '../../gpu/Blueprint';
import { makeEdgeType } from './EdgeTypeFactory';

export const QueueDependencyEdge = makeEdgeType<QueueDependencyEdgeDescriptor>({
  width: 24,
  height: 24,
  render: data => (
    <div>
      <button className="RemoveButton" onClick={data.destroy}>
        X
      </button>
    </div>
  ),
});
