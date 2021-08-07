import './Node.css';

import {
  getBezierPath,
  getEdgeCenter,
  getMarkerEnd,
  EdgeProps,
} from 'react-flow-renderer';

interface Data {
  destroy?: () => void;
}

export const CustomEdge = ({
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
  const data = anyData as Data;
  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={path}
        markerEnd={end}
      />
      {data.destroy && (
        <foreignObject width={16} height={16} x={centerX - 8} y={centerY - 8}>
          <div className="Edge">
            <button className="RemoveButton" onClick={data.destroy} />
          </div>
        </foreignObject>
      )}
    </>
  );
};
