import './panel.css';

import {
  BufferBindingNode,
  BufferBindingStorageType,
} from '../../blueprint/blueprint';
import { BindingPanel } from './binding_panel';
import { Panel, PanelProps } from './panel';

export const BufferBindingPanel = ({ data }: PanelProps<BufferBindingNode>) => {
  const node = data.node;
  return (
    <Panel className="BufferBinding" node={node} destroy={data.destroy}>
      <select
        value={node.storageType}
        onChange={e =>
          data.onChange({
            storageType: e.currentTarget.value as BufferBindingStorageType,
          })
        }
      >
        <option value="storage-read">Storage (r/o)</option>
        <option value="storage">Storage (r/w)</option>
        <option value="uniform">Uniform</option>
        <option value="sampler">Sampler</option>
        <option value="texture">Texture</option>
      </select>
      <BindingPanel data={data} />
    </Panel>
  );
};
