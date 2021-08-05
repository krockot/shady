import { Handle, Position } from 'react-flow-renderer';

import { RenderNodeDescriptor } from '../../gpu/Blueprint';
import { EditableLabel } from '../EditableLabel';
import { LabeledField } from '../LabeledField';
import { Node, NodeProps } from './Node';
import { isValidBindingConnection, isValidQueueConnection } from './Validation';

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

export const RenderNode = (props: NodeProps<RenderNodeDescriptor>) => {
  const data = props.data;
  const node = data.node;
  return (
    <Node
      title="Render Pass"
      node={node}
      onRename={name => data.onChange({ name })}
      destroy={data.destroy}
    >
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

        <LabeledField label="Vertex Shader">
          <select
            value={node.vertexShader}
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
            value={node.vertexEntryPoint}
            emptyText="None"
            onChange={value => data.onChange({ vertexEntryPoint: value })}
          />
        </LabeledField>
        <LabeledField label="Fragment Shader">
          <select
            value={node.fragmentShader}
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
            value={node.fragmentEntryPoint}
            emptyText="None"
            onChange={value => data.onChange({ fragmentEntryPoint: value })}
          />
        </LabeledField>
        <LabeledField label="Topology">
          <select
            value={node.topology ?? 'triangle-list'}
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
            value={node.numVertices}
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
            value={node.numInstances}
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
            checked={node.clear ?? false}
            onChange={e => data.onChange({ clear: !node.clear })}
          />
        </LabeledField>
        <LabeledField label="Clear Color">
          <input
            type="color"
            value={colorValue(node.clearColor ?? { r: 0, g: 0, b: 0, a: 1 })}
            onChange={e =>
              data.onChange({ clearColor: parseColor(e.currentTarget.value) })
            }
          />
        </LabeledField>
        <LabeledField label="Depth Test">
          <select
            value={node.depthTest ?? 'always'}
            onChange={e =>
              data.onChange({
                depthTest: e.currentTarget.value as GPUCompareFunction,
              })
            }
          >
            <option value="never">Never Pass</option>
            <option value="less">&lt;</option>
            <option value="less-equal">&lt;=</option>
            <option value="equal">=</option>
            <option value="greater-equal">&gt;=</option>
            <option value="greater">&gt;</option>
            <option value="not-equal">≠</option>
            <option value="always">Always Pass</option>
          </select>
        </LabeledField>
      </div>
    </Node>
  );
};
