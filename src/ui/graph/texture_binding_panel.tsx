import './panel.css';

import { TextureBindingNode } from '../../blueprint/blueprint';
import { BindingPanel } from './binding_panel';
import { Panel, PanelProps } from './panel';

export const TextureBindingPanel = ({
  data,
}: PanelProps<TextureBindingNode>) => {
  return (
    <Panel title="" node={data.node} destroy={data.destroy}>
      <BindingPanel data={data} />
    </Panel>
  );
};
