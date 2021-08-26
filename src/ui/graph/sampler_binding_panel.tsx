import './panel.css';

import { SamplerBindingNode } from '../../gpu/blueprint';
import { BindingPanel } from './binding_panel';
import { Panel, PanelProps } from './panel';

export const SamplerBindingPanel = ({
  data,
}: PanelProps<SamplerBindingNode>) => {
  return (
    <Panel title="" node={data.node} destroy={data.destroy}>
      <BindingPanel data={data} />
    </Panel>
  );
};
