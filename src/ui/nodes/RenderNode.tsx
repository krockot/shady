import { Handle, Position } from 'react-flow-renderer';
import { RenderNodeDescriptor } from '../../gpu/Blueprint';
import { EditableLabel } from '../EditableLabel';
import { LabeledField } from '../LabeledField';
import { makeNodeType } from './NodeTypeFactory';

export const RenderNode = makeNodeType<RenderNodeDescriptor>({
  title: 'Render Pass',
  render: data => {
    return (
      <div>
        <Handle type="target" position={'left' as Position} />
        <LabeledField label="Vertex Shader">
          <select
            value={data.descriptor.vertexShader}
            onChange={e =>
              data.onChange({ vertexShader: e.currentTarget.value })
            }
          >
            <option value=""></option>
            {Object.entries(data.blueprint.shaders).map(([id, shader]) => (
              <option key={id} value={id}>
                {shader.name}
              </option>
            ))}
          </select>
        </LabeledField>
        <LabeledField label="Vertex Entry Point">
          <EditableLabel
            value={data.descriptor.vertexEntryPoint}
            emptyText="None"
            onChange={value => data.onChange({ vertexEntryPoint: value })}
          />
        </LabeledField>
        <LabeledField label="Fragment Shader">
          <select
            value={data.descriptor.fragmentShader}
            onChange={e =>
              data.onChange({
                fragmentShader: e.currentTarget.value,
              })
            }
          >
            <option value=""></option>
            {Object.entries(data.blueprint.shaders).map(([id, shader]) => (
              <option key={id} value={id}>
                {shader.name}
              </option>
            ))}
          </select>
        </LabeledField>
        <LabeledField label="Fragment Entry Point">
          <EditableLabel
            value={data.descriptor.fragmentEntryPoint}
            emptyText="None"
            onChange={value => data.onChange({ fragmentEntryPoint: value })}
          />
        </LabeledField>
        <LabeledField label="# Vertices">
          <input
            type="number"
            style={{ width: '3em' }}
            value={data.descriptor.numVertices}
            onChange={e =>
              data.onChange({
                numVertices: Math.max(e.currentTarget.valueAsNumber, 0),
              })
            }
          />
        </LabeledField>
        <LabeledField label="# Instances">
          <input
            type="number"
            style={{ width: '3em' }}
            value={data.descriptor.numInstances}
            onChange={e =>
              data.onChange({
                numInstances: Math.max(e.currentTarget.valueAsNumber, 0),
              })
            }
          />
        </LabeledField>
      </div>
    );
  },
});
