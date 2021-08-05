import { Handle, Position } from 'react-flow-renderer';

import { ComputeNodeDescriptor } from '../../gpu/Blueprint';
import { EditableLabel } from '../EditableLabel';
import { LabeledField } from '../LabeledField';
import { makeNodeType } from './NodeTypeFactory';
import { isValidBindingConnection, isValidQueueConnection } from './Validation';

export const ComputeNode = makeNodeType<ComputeNodeDescriptor>({
  title: 'Compute Pass',
  render: data => {
    return (
      <div>
        <Handle
          id="bindings"
          type="target"
          title="Bindings"
          position={'top' as Position}
          className="Handle Binding"
          isValidConnection={c => isValidBindingConnection(c, data.blueprint)}
        />
        <Handle
          id="queueIn"
          type="target"
          title="Queue In"
          position={'left' as Position}
          className="Handle Queue"
          isValidConnection={c => isValidQueueConnection(c, data.blueprint)}
        />
        <Handle
          id="queueOut"
          type="source"
          title="Queue Out"
          position={'right' as Position}
          className="Handle Queue"
          isValidConnection={c => isValidQueueConnection(c, data.blueprint)}
        />
        <LabeledField label="Shader">
          <select
            value={data.descriptor.shader}
            onChange={e => data.onChange({ shader: e.currentTarget.value })}
          >
            <option value=""></option>
            {Object.entries(data.blueprint.shaders).map(([id, shader]) => (
              <option key={id} value={id}>
                {shader.name}
              </option>
            ))}
          </select>
        </LabeledField>
        <LabeledField label="Entry Point">
          <EditableLabel
            emptyText="None"
            value={data.descriptor.entryPoint}
            onChange={value => data.onChange({ entryPoint: value })}
          />
        </LabeledField>
        <LabeledField label="Dispatch Size">
          <div className="DispatchSize">
            <div className="DispatchSizeElement">
              X{' '}
              <input
                type="number"
                value={data.descriptor.dispatchSize.x}
                onChange={e =>
                  data.onChange({
                    dispatchSize: {
                      x: e.currentTarget.valueAsNumber,
                      y: data.descriptor.dispatchSize.y,
                      z: data.descriptor.dispatchSize.z,
                    },
                  })
                }
              />
            </div>
            <div className="DispatchSizeElement">
              Y{' '}
              <input
                type="number"
                value={data.descriptor.dispatchSize.y}
                onChange={e =>
                  data.onChange({
                    dispatchSize: {
                      x: data.descriptor.dispatchSize.x,
                      y: e.currentTarget.valueAsNumber,
                      z: data.descriptor.dispatchSize.z,
                    },
                  })
                }
              />
            </div>
            <div className="DispatchSizeElement">
              Z{' '}
              <input
                type="number"
                value={data.descriptor.dispatchSize.z}
                onChange={e =>
                  data.onChange({
                    dispatchSize: {
                      x: data.descriptor.dispatchSize.x,
                      y: data.descriptor.dispatchSize.y,
                      z: e.currentTarget.valueAsNumber,
                    },
                  })
                }
              />
            </div>
          </div>
        </LabeledField>
      </div>
    );
  },
});
