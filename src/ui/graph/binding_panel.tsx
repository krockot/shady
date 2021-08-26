import './panel.css';

import { Handle, Position } from 'react-flow-renderer';

import { BindingNode } from '../../blueprint/blueprint';
import { PanelData } from './panel';

export type BindingId = { group: number; binding: number };

type AnyPanelData<NodeType> = NodeType extends BindingNode
  ? PanelData<NodeType>
  : never;

interface Props {
  data: AnyPanelData<BindingNode>;
}

export const BindingPanel = ({ data }: Props) => {
  const node = data.node;
  const update = (update: Partial<BindingId>) => {
    data.onChange({
      group: Math.max(0, update.group ?? node.group),
      binding: Math.max(0, update.binding ?? node.binding),
    });
  };

  return (
    <div>
      <Handle
        type="target"
        position={'top' as Position}
        className="Handle BindingStub"
        isConnectable={false}
      />
      <Handle
        type="source"
        position={'bottom' as Position}
        className="Handle BindingStub"
        isConnectable={false}
      />
      <div>
        <div className="Row">
          Group
          <input
            type="number"
            value={node.group}
            onChange={e => update({ group: e.currentTarget.valueAsNumber })}
          />
        </div>
        <div className="Row">
          Binding
          <input
            type="number"
            value={node.binding}
            onChange={e => update({ binding: e.currentTarget.valueAsNumber })}
          />
        </div>
      </div>
    </div>
  );
};
