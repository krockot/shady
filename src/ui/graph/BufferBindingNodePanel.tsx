import './NodePanel.css';

import {
  BufferBindingNode,
  BufferBindingStorageType,
} from '../../gpu/Blueprint';
import { BindingPanel } from './BindingPanel';
import { NodePanel, NodePanelProps } from './NodePanel';

export const BufferBindingNodePanel = ({
  data,
}: NodePanelProps<BufferBindingNode>) => {
  const node = data.node;
  return (
    <NodePanel className="BufferBinding" node={node} destroy={data.destroy}>
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
    </NodePanel>
  );
};
