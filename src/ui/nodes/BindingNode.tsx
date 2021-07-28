import { Connection, Handle, Position } from 'react-flow-renderer';

import {
  BindingNodeDescriptor,
  BindingType,
  Blueprint,
} from '../../gpu/Blueprint';
import { LabeledField } from '../LabeledField';
import { makeNodeType } from './NodeTypeFactory';

const isValidBindingSource = (connection: Connection, blueprint: Blueprint) => {
  const source = blueprint.nodes[connection.source ?? ''];
  if (!source) {
    return false;
  }

  return (
    source.type === 'buffer' ||
    source.type === 'sampler' ||
    source.type === 'texture'
  );
};

const isValidBindingTarget = (connection: Connection, blueprint: Blueprint) => {
  const target = blueprint.nodes[connection.target ?? ''];
  if (!target) {
    return false;
  }
  return target.type === 'render' || target.type === 'compute';
};

export const BindingNode = makeNodeType<BindingNodeDescriptor>({
  title: 'Binding',
  render: data => {
    return (
      <div>
        <Handle
          type="target"
          position={'left' as Position}
          isConnectable={true}
          isValidConnection={connection =>
            isValidBindingSource(connection, data.blueprint)
          }
        />
        <Handle
          type="source"
          position={'right' as Position}
          isConnectable={true}
          isValidConnection={connection =>
            isValidBindingTarget(connection, data.blueprint)
          }
        />
        <LabeledField label="Type">
          <select
            value={data.descriptor.bindingType}
            style={{ width: '10em' }}
            onChange={e =>
              data.onChange({
                bindingType: e.currentTarget.value as BindingType,
              })
            }
          >
            <option value="storage-read">Storage (r/o)</option>
            <option value="storage">Storage (r/w)</option>
            <option value="uniform">Uniform</option>
            <option value="sampler">Sampler</option>
            <option value="texture">Texture</option>
          </select>
        </LabeledField>
        <LabeledField label="Group #">
          <input
            type="number"
            value={data.descriptor.group}
            style={{ width: '5em', textAlign: 'right' }}
            onChange={e =>
              data.onChange({ group: e.currentTarget.valueAsNumber })
            }
          />
        </LabeledField>
        <LabeledField label="Binding #">
          <input
            type="number"
            value={data.descriptor.binding}
            style={{ width: '5em', textAlign: 'right' }}
            onChange={e =>
              data.onChange({ binding: e.currentTarget.valueAsNumber })
            }
          />
        </LabeledField>
      </div>
    );
  },
});
