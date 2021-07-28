import './Display.css';

import React from 'react';

export interface DisplayConfig {
  aspect: string;
  resolution: {
    mode: 'pixel' | 'framebuffer';
    pixelSize?: number;
    framebufferSize?: { width: number; height: number };
  };
}

interface Props {
  render: (canvas: HTMLCanvasElement) => void;
  config: DisplayConfig;
}

export class Display extends React.Component<Props> {
  private wrapperRef_: React.RefObject<HTMLDivElement>;
  private canvasRef_: React.RefObject<HTMLCanvasElement>;
  private pendingFrameRequest_: null | number;

  constructor(props: Props) {
    super(props);
    this.wrapperRef_ = React.createRef();
    this.canvasRef_ = React.createRef();
    this.pendingFrameRequest_ = null;
  }

  componentDidMount() {
    const renderNextFrame = () => {
      const wrapper = this.wrapperRef_.current!;
      const canvas = this.canvasRef_.current!;
      const width = wrapper.clientWidth;
      const height = wrapper.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      this.props.render(canvas);
      this.pendingFrameRequest_ = requestAnimationFrame(renderNextFrame);
    };

    renderNextFrame();
  }

  componentWillUnmount() {
    if (this.pendingFrameRequest_ !== null) {
      cancelAnimationFrame(this.pendingFrameRequest_);
      this.pendingFrameRequest_ = null;
    }
  }

  render() {
    const config = this.props.config;
    const [aspectX, aspectY] = config.aspect.split(':').map(s => parseInt(s));
    const stretch = isNaN(aspectX) || isNaN(aspectY);
    const computedWrapperStyle: React.CSSProperties = {
      height: stretch ? '100%' : 'auto',
      aspectRatio: stretch ? 'auto' : `${aspectX}/${aspectY}`,
    };
    return (
      <div className="Display">
        <div
          ref={this.wrapperRef_}
          className="CanvasWrapper"
          style={computedWrapperStyle}
        >
          <canvas ref={this.canvasRef_} />
        </div>
      </div>
    );
  }
}
