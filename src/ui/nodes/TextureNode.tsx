import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import { TextureNodeDescriptor } from '../../gpu/Blueprint';
import { makeNodeType } from './NodeTypeFactory';
import { isValidBindingConnection } from './Validation';

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

export const TextureNode = makeNodeType<TextureNodeDescriptor>({
  title: 'Texture',
  context: React.createRef(),
  effect: (data, context) => {
    const ref = context as CanvasRef;
    if (ref.current && data.descriptor.imageData) {
      updateCanvasImage(ref.current, data.descriptor.imageData);
    }
  },
  render: (data, context) => {
    return (
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
          ref={context as CanvasRef}
          className="Preview"
          width={128}
          height={128}
        />
      </div>
    );
  },
});
