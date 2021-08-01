import { Handle, Position } from 'react-flow-renderer';
import { RenderNodeDescriptor } from '../../gpu/Blueprint';
import { EditableLabel } from '../EditableLabel';
import { LabeledField } from '../LabeledField';
import { makeNodeType } from './NodeTypeFactory';

function colorValue(c: GPUColorDict): string {
  const p = (x: number) => `${x < 16 ? '0' : ''}${x.toString(16)}`;
  const cp = [c.r, c.g, c.b].map(c => p(c * 255));
  return `#${cp.join('')}`;
}

function parseColor(value: string): GPUColorDict {
  const parseComponent = (index: number) =>
    parseInt(value.slice(index, index + 2), 16) / 255;
  return {
    r: parseComponent(1),
    g: parseComponent(3),
    b: parseComponent(5),
    a: 1,
  };
}

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
        <LabeledField label="Topology">
          <select
            value={data.descriptor.topology ?? 'triangle-list'}
            onChange={e =>
              data.onChange({
                topology: e.currentTarget.value as GPUPrimitiveTopology,
              })
            }
          >
            <option value="point-list">Point List</option>
            <option value="line-list">Line List</option>
            <option value="line-strip">Line Strip</option>
            <option value="triangle-list">Triangle List</option>
            <option value="triangle-strip">Triangle Strip</option>
          </select>
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
        <LabeledField label="Clear">
          <input
            type="checkbox"
            checked={data.descriptor.clear ?? false}
            onChange={e => data.onChange({ clear: !data.descriptor.clear })}
          />
        </LabeledField>
        <LabeledField label="Clear Color">
          <input
            type="color"
            value={colorValue(
              data.descriptor.clearColor ?? { r: 0, g: 0, b: 0, a: 1 }
            )}
            onChange={e =>
              data.onChange({ clearColor: parseColor(e.currentTarget.value) })
            }
          />
        </LabeledField>
      </div>
    );
  },
});
