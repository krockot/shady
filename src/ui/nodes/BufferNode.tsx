import { Connection, Handle, Position } from 'react-flow-renderer';

import {
  BufferInitializer,
  BufferNodeDescriptor,
  Blueprint,
} from '../../gpu/Blueprint';
import { LabeledField } from '../LabeledField';
import { makeNodeType } from './NodeTypeFactory';

const isValidBufferTarget = (connection: Connection, blueprint: Blueprint) => {
  const node = blueprint.nodes[connection.target!];
  if (!node) {
    return false;
  }
  return node.type === 'binding';
};

export const BufferNode = makeNodeType<BufferNodeDescriptor>({
  title: 'Buffer',
  render: data => {
    return (
      <div>
        <Handle
          type="source"
          position={'right' as Position}
          isValidConnection={connection =>
            isValidBufferTarget(connection, data.blueprint)
          }
        />
        <LabeledField label="Size">
          <input
            type="number"
            value={data.descriptor.size}
            style={{ width: '5em', textAlign: 'right' }}
            onChange={e =>
              data.onChange({ size: e.currentTarget.valueAsNumber })
            }
          />
        </LabeledField>
        <LabeledField label="Init">
          <select
            value={data.descriptor.init}
            style={{ width: '10em' }}
            onChange={e =>
              data.onChange({
                init: e.currentTarget.value as BufferInitializer,
              })
            }
          >
            <option value="zero">Zero</option>
            <option value="random-floats">Random Floats</option>
            <option value="random-uints">Random Uints</option>
          </select>
        </LabeledField>
      </div>
    );
  },
});
