import { Handle, Position } from 'react-flow-renderer';

import { ComputeNode } from '../../gpu/Blueprint';
import { EditableLabel } from '../EditableLabel';
import { LabeledField } from '../LabeledField';
import { NodePanel, NodePanelProps } from './NodePanel';
import { isValidBindingConnection, isValidQueueConnection } from './Validation';

export const ComputeNodePanel = (props: NodePanelProps<ComputeNode>) => {
  const data = props.data;
  const node = data.node;
  return (
    <NodePanel
      title="Compute Pass"
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
        <LabeledField label="Shader">
          <select
            value={node.shader}
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
            value={node.entryPoint}
            onChange={value => data.onChange({ entryPoint: value })}
          />
        </LabeledField>
        <LabeledField label="Dispatch Size">
          <div className="DispatchSize">
            <div className="DispatchSizeElement">
              X{' '}
              <input
                type="number"
                value={node.dispatchSize.x}
                onChange={e =>
                  data.onChange({
                    dispatchSize: {
                      x: e.currentTarget.valueAsNumber,
                      y: node.dispatchSize.y,
                      z: node.dispatchSize.z,
                    },
                  })
                }
              />
            </div>
            <div className="DispatchSizeElement">
              Y{' '}
              <input
                type="number"
                value={node.dispatchSize.y}
                onChange={e =>
                  data.onChange({
                    dispatchSize: {
                      x: node.dispatchSize.x,
                      y: e.currentTarget.valueAsNumber,
                      z: node.dispatchSize.z,
                    },
                  })
                }
              />
            </div>
            <div className="DispatchSizeElement">
              Z{' '}
              <input
                type="number"
                value={node.dispatchSize.z}
                onChange={e =>
                  data.onChange({
                    dispatchSize: {
                      x: node.dispatchSize.x,
                      y: node.dispatchSize.y,
                      z: e.currentTarget.valueAsNumber,
                    },
                  })
                }
              />
            </div>
          </div>
        </LabeledField>
      </div>
    </NodePanel>
  );
};
