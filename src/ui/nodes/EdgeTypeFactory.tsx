import './Node.css';

import { ReactNode } from 'react';
import {
  getBezierPath,
  getEdgeCenter,
  getMarkerEnd,
  EdgeProps,
} from 'react-flow-renderer';

import { Blueprint, EdgeDescriptorBase } from '../../gpu/Blueprint';

type UpdateFn<DescriptorType extends EdgeDescriptorBase> = (
  update: Partial<DescriptorType>
) => void;

interface EdgeData<DescriptorType extends EdgeDescriptorBase> {
  blueprint: Blueprint;
  edge: DescriptorType;
  onChange: UpdateFn<DescriptorType>;
  destroy: () => void;
}

type RenderFn<DescriptorType extends EdgeDescriptorBase> = (
  data: EdgeData<DescriptorType>
) => ReactNode;

interface Params<DescriptorType extends EdgeDescriptorBase> {
  render: RenderFn<DescriptorType>;
  width: number;
  height: number;
}

export function makeEdgeType<DescriptorType extends EdgeDescriptorBase>(
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
    const edge = data.edge;
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
          <div className={`Edge Edge-${edge.type}`}>{params.render(data)}</div>
        </foreignObject>
      </>
    );
  };
}
