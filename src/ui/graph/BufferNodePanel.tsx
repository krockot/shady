import { Handle, Position } from 'react-flow-renderer';

import { BufferInitializer, BufferNode } from '../../gpu/Blueprint';
import { LabeledField } from '../LabeledField';
import { NodePanel, NodePanelProps } from './NodePanel';
import { isValidBindingConnection } from './Validation';

export const BufferNodePanel = (props: NodePanelProps<BufferNode>) => {
  const data = props.data;
  const node = data.node;
  return (
    <NodePanel
      title="Buffer"
      node={node}
      onRename={name => data.onChange({ name })}
      destroy={data.destroy}
    >
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
            value={node.size}
            style={{ width: '5em', textAlign: 'right' }}
            onChange={e =>
              data.onChange({ size: e.currentTarget.valueAsNumber })
            }
          />
        </LabeledField>
        <LabeledField label="Init">
          <select
            value={node.init}
            style={{ width: '9em' }}
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
    </NodePanel>
  );
};
