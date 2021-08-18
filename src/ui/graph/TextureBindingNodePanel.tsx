import './NodePanel.css';

import { TextureBindingNode } from '../../gpu/Blueprint';
import { BindingPanel } from './BindingPanel';
import { NodePanel, NodePanelProps } from './NodePanel';

export const TextureBindingNodePanel = ({
  data,
}: NodePanelProps<TextureBindingNode>) => {
  return (
    <NodePanel title="" node={data.node} destroy={data.destroy}>
      <BindingPanel data={data} />
    </NodePanel>
  );
};
