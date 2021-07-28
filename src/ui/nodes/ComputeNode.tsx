import { Handle, Position } from 'react-flow-renderer';
import { ComputeNodeDescriptor } from '../../gpu/Blueprint';
import { EditableLabel } from '../EditableLabel';
import { LabeledField } from '../LabeledField';
import { makeNodeType } from './NodeTypeFactory';

export const ComputeNode = makeNodeType<ComputeNodeDescriptor>({
  title: 'Compute Pass',
  render: data => {
    return (
      <div>
        <Handle type="target" position={'left' as Position} />
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
          <input
            type="number"
            style={{ width: '3em', marginLeft: '0.5em', marginRight: '0.5em' }}
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
          <input
            type="number"
            style={{ width: '3em', marginLeft: '0.5em', marginRight: '0.5em' }}
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
          <input
            type="number"
            style={{ width: '3em', marginLeft: '0.5em' }}
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
        </LabeledField>
      </div>
    );
  },
});
