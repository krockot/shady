import './Node.css';

import { ReactNode } from 'react';
import {
  getBezierPath,
  getEdgeCenter,
  getMarkerEnd,
  EdgeProps,
} from 'react-flow-renderer';

import { Blueprint, NodeDescriptorBase } from '../../gpu/Blueprint';

type UpdateFn<DescriptorType extends NodeDescriptorBase> = (
  update: Partial<DescriptorType>
) => void;

interface EdgeData<DescriptorType extends NodeDescriptorBase> {
  blueprint: Blueprint;
  descriptor: DescriptorType;
  onChange: UpdateFn<DescriptorType>;
  destroy: () => void;
}

type RenderFn<DescriptorType extends NodeDescriptorBase> = (
  data: EdgeData<DescriptorType>
) => ReactNode;

interface Params<DescriptorType extends NodeDescriptorBase> {
  render: RenderFn<DescriptorType>;
  width: number;
  height: number;
}

export function makeEdgeType<DescriptorType extends NodeDescriptorBase>(
  params: Params<DescriptorType>
) {
  return ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data: anyData,
    arrowHeadType,
    markerEndId,
  }: EdgeProps) => {
    const path = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
    const end = getMarkerEnd(arrowHeadType, markerEndId);
    const [centerX, centerY] = getEdgeCenter({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
    const data = anyData as EdgeData<DescriptorType>;
    const node = data.descriptor;
    return (
      <>
        <path
          id={id}
          style={style}
          className="react-flow__edge-path"
          d={path}
          markerEnd={end}
        />
        <foreignObject
          width={params.width}
          height={params.height}
          x={centerX - params.width / 2}
          y={centerY - params.height / 2}
        >
          <div className={`Edge Edge-${node.type}`}>
            <button className="RemoveButton" onClick={data.destroy}>
              X
            </button>
            {params.render(data)}
          </div>
        </foreignObject>
      </>
    );
  };
}
