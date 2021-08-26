import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import { TextureNode } from '../../blueprint/blueprint';
import { Panel, PanelProps } from './panel';
import { isValidBindingConnection } from './connection_validation';

function getSelectedFile(input: HTMLInputElement): null | File {
  if (!input.files || input.files.length === 0) {
    return null;
  }

  return input.files[0];
}

async function updateCanvasImage(
  canvas: null | HTMLCanvasElement,
  data: null | Blob
) {
  if (!canvas || !data) {
    return;
  }

  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const image = await createImageBitmap(data);
  if (!image) {
    return;
  }

  context.drawImage(image, 0, 0, image.width, image.height, 0, 0, 128, 128);
}

type CanvasRef = React.RefObject<HTMLCanvasElement>;

export const TexturePanel = (props: PanelProps<TextureNode>) => {
  const data = props.data;
  const node = data.node;
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const ref = canvasRef as CanvasRef;
    if (ref.current && node.imageData instanceof Blob) {
      updateCanvasImage(ref.current, node.imageData);
    }
  });

  return (
    <Panel
      title="Texture"
      node={node}
      onRename={name => data.onChange({ name })}
      destroy={data.destroy}
    >
      <div className="TextureDetails">
        <Handle
          type="source"
          className="Handle Binding"
          position={'bottom' as Position}
          isValidConnection={c => isValidBindingConnection(c, data.blueprint)}
        />
        <input
          type="file"
          accept="image/*"
          onChange={e => {
            const file = getSelectedFile(e.currentTarget);
            if (file) {
              data.onChange({ imageData: file });
            }
          }}
        />
        <canvas
          id={node.name}
          ref={canvasRef as CanvasRef}
          className="Preview"
          width={128}
          height={128}
        />
      </div>
    </Panel>
  );
};
