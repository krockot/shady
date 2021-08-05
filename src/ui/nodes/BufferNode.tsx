import { Handle, Position } from 'react-flow-renderer';

import { BufferInitializer, BufferNodeDescriptor } from '../../gpu/Blueprint';
import { LabeledField } from '../LabeledField';
import { makeNodeType } from './NodeTypeFactory';
import { isValidBindingConnection } from './Validation';

export const BufferNode = makeNodeType<BufferNodeDescriptor>({
  title: 'Buffer',
  render: data => {
    return (
      <div>
        <Handle
          type="source"
          className="Handle Binding"
          position={'bottom' as Position}
          isValidConnection={c => isValidBindingConnection(c, data.blueprint)}
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
