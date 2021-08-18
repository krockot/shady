import './NodePanel.css';

import { SamplerBindingNode } from '../../gpu/Blueprint';
import { BindingPanel } from './BindingPanel';
import { NodePanel, NodePanelProps } from './NodePanel';

export const SamplerBindingNodePanel = ({
  data,
}: NodePanelProps<SamplerBindingNode>) => {
  return (
    <NodePanel title="" node={data.node} destroy={data.destroy}>
      <BindingPanel data={data} />
    </NodePanel>
  );
};
