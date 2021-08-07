import './BlueprintEditor.css';

import React from 'react';
import ReactFlow, {
  Connection,
  Edge,
  FlowElement,
  Node,
  OnLoadParams,
  XYPosition,
} from 'react-flow-renderer';

import {
  Blueprint,
  ConnectionNodeDescriptor,
  ConnectionType,
  NodeDescriptor,
} from '../gpu/Blueprint';
import { BufferBindingNode } from './nodes/BufferBindingNode';
import { QueueDependencyEdge } from './nodes/QueueDependencyEdge';
import { BufferNode } from './nodes/BufferNode';
import { ComputeNode } from './nodes/ComputeNode';
import { RenderNode } from './nodes/RenderNode';
import { SamplerBindingNode } from './nodes/SamplerBindingNode';
import { SamplerNode } from './nodes/SamplerNode';
import { TextureBindingNode } from './nodes/TextureBindingNode';
import { TextureNode } from './nodes/TextureNode';

const NODE_TYPES = {
  buffer: BufferNode,
  texture: TextureNode,
  compute: ComputeNode,
  render: RenderNode,
  sampler: SamplerNode,
  'buffer-binding': BufferBindingNode,
  'sampler-binding': SamplerBindingNode,
  'texture-binding': TextureBindingNode,
};

const EDGE_TYPES = {
  'queue-dependency': QueueDependencyEdge,
};

interface Props {
  blueprint: Blueprint;
  onChange: () => void;
}

function getUnusedKey<T extends Record<string, any>>(
  dict: T,
  base: string
): string {
  for (let i = 1; ; ++i) {
    const id = `${base}${i}`;
    if (!dict.hasOwnProperty(id)) {
      return id;
    }
  }
}

class FlowErrorBounary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.log(error);
  }

  render() {
    return this.props.children;
  }
}

const isPassNode = (node: NodeDescriptor) =>
  node.type === 'render' || node.type === 'compute';

export class BlueprintEditor extends React.Component<Props> {
  private isMounted_: boolean;
  private instance_: null | OnLoadParams;
  private flowRef_: React.RefObject<HTMLDivElement>;
  private lastConnectStart_: null | XYPosition;
  private lastConnectEnd_: null | XYPosition;

  constructor(props: Props) {
    super(props);
    this.isMounted_ = false;
    this.instance_ = null;
    this.flowRef_ = React.createRef();
    this.lastConnectStart_ = null;
    this.lastConnectEnd_ = null;
  }

  componentDidMount() {
    this.isMounted_ = true;
  }

  componentWillUnmount() {
    this.isMounted_ = false;
  }

  render() {
    return (
      <div className="BlueprintEditor">
        <FlowErrorBounary>
          <ReactFlow
            ref={this.flowRef_}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            elements={buildGraphFromBlueprint(
              this.props.blueprint,
              this.update_
            )}
            elementsSelectable={false}
            nodesConnectable={true}
            nodesDraggable={true}
            onLoad={this.onLoad_}
            onConnectStart={this.onConnectStart_}
            onConnectStop={this.onConnectStop_}
            onConnect={this.onConnect_}
            onElementClick={this.onElementClick_}
            onNodeDragStop={this.onMoveNode_}
          >
            <div className="Toolbar">
              <button onClick={this.addShader_}>+Shader</button>
              <button onClick={this.addBuffer_}>+Buffer</button>
              <button onClick={this.addTexture_}>+Texture</button>
              <button onClick={this.addSampler_}>+Sampler</button>
              <button onClick={this.addRenderPass_}>+Render Pass</button>
              <button onClick={this.addComputePass_}>+Compute Pass</button>
            </div>
          </ReactFlow>
        </FlowErrorBounary>
      </div>
    );
  }

  update_ = () => {
    if (!this.isMounted_) {
      return;
    }

    this.setState({
      elements: buildGraphFromBlueprint(this.props.blueprint, this.update_),
    });
    this.props.onChange();
  };

  onLoad_ = (instance: OnLoadParams) => {
    this.instance_ = instance;
  };

  onConnectStart_ = (e: React.MouseEvent) => {
    this.lastConnectStart_ = { x: e.clientX, y: e.clientY };
  };

  onConnectStop_ = (e: any) => {
    this.lastConnectEnd_ = { x: e.clientX, y: e.clientY };
  };

  onConnect_ = (edge: Edge<any> | Connection) => {
    const source = this.props.blueprint.nodes[edge.source!];
    const target = this.props.blueprint.nodes[edge.target!];
    if (!source || !target) {
      return;
    }

    let position = { x: 100, y: 100 };
    if (
      this.instance_ &&
      this.lastConnectStart_ !== null &&
      this.lastConnectEnd_ !== null &&
      this.flowRef_.current
    ) {
      const view = this.flowRef_.current.getBoundingClientRect();
      const midpoint = {
        x:
          (this.lastConnectStart_.x + this.lastConnectEnd_.x) / 2 - view.x - 60,
        y:
          (this.lastConnectStart_.y + this.lastConnectEnd_.y) / 2 - view.y - 40,
      };
      position = this.instance_.project(midpoint);
    }

    if (
      isPassNode(target) &&
      source.type === 'buffer' &&
      edge.targetHandle === 'bindings'
    ) {
      this.addBufferBinding_(edge.source!, edge.target!, position);
      this.props.onChange();
      return;
    }

    if (
      isPassNode(target) &&
      source.type === 'texture' &&
      edge.targetHandle === 'bindings'
    ) {
      this.addTextureBinding_(edge.source!, edge.target!, position);
      this.props.onChange();
      return;
    }

    if (
      isPassNode(target) &&
      source.type === 'sampler' &&
      edge.targetHandle === 'bindings'
    ) {
      this.addSamplerBinding_(edge.source!, edge.target!, position);
      this.props.onChange();
      return;
    }

    if (
      isPassNode(target) &&
      isPassNode(source) &&
      edge.targetHandle === 'queueIn'
    ) {
      this.addQueueDependency_(edge.source!, edge.target!);
      this.props.onChange();
      return;
    }
  };

  onElementClick_ = (
    event: React.MouseEvent<Element, MouseEvent>,
    element: Node<any> | Edge<any>
  ) => {};

  onMoveNode_ = (event: React.MouseEvent, node: Node) => {
    node.data.node.position = { ...node.position };
    this.update_();
  };

  addShader_ = () => {
    const shaders = this.props.blueprint.shaders;
    const id = getUnusedKey(shaders, 'shader');
    shaders[id] = { name: id, code: '' };
    this.update_();
  };

  addNode_ = (type: string, node: Partial<NodeDescriptor>) => {
    const nodes = this.props.blueprint.nodes;
    const id = getUnusedKey(nodes, type);
    nodes[id] = {
      name: id,
      type,
      position: { x: 100, y: 100 },
      ...node,
    } as NodeDescriptor;
    this.update_();
  };

  addEdge_ = (
    type: ConnectionType,
    connection: Partial<ConnectionNodeDescriptor>
  ) => {
    const nodes = this.props.blueprint.nodes;
    const id = getUnusedKey(nodes, type);
    nodes[id] = {
      position: { x: 100, y: 100 },

      ...connection,
      type: 'connection',

      // @ts-ignore: bug?
      connectionType: type,
    };
    this.update_();
  };

  addBuffer_ = () => {
    this.addNode_('buffer', {
      size: 16384,
      position: { x: 100, y: 100 },
      init: 'zero',
    });
  };

  addTexture_ = () => {
    this.addNode_('texture', {
      position: { x: 100, y: 100 },
      size: { width: 1024, height: 1024 },
      format: 'rgba8unorm',
      mipLevelCount: 1,
      sampleCount: 1,
    });
  };

  addSampler_ = () => {
    this.addNode_('sampler', {
      position: { x: 100, y: 100 },
    });
  };

  addBufferBinding_ = (
    bufferId: string,
    passId: string,
    position: XYPosition
  ) => {
    this.addEdge_('binding', {
      position,
      // @ts-ignore
      bindingType: 'buffer',
      storageType: 'storage-read',
      group: 0,
      binding: 1,
      source: bufferId,
      target: passId,
    });
  };

  addTextureBinding_ = (
    textureId: string,
    passId: string,
    position: XYPosition
  ) => {
    this.addEdge_('binding', {
      position,
      // @ts-ignore
      bindingType: 'texture',
      group: 0,
      binding: 1,
      source: textureId,
      target: passId,
    });
  };

  addSamplerBinding_ = (
    textureId: string,
    passId: string,
    position: XYPosition
  ) => {
    this.addEdge_('binding', {
      position,
      // @ts-ignore
      bindingType: 'sampler',
      group: 0,
      binding: 1,
      source: textureId,
      target: passId,
    });
  };

  addQueueDependency_ = (source: string, target: string) => {
    this.addEdge_('queue-dependency', { source: source, target: target });
  };

  addRenderPass_ = () => {
    this.addNode_('render', {
      vertexShader: '',
      vertexEntryPoint: '',
      fragmentShader: '',
      fragmentEntryPoint: '',
      topology: 'triangle-list',
      numVertices: 4,
      numInstances: 1,
      indexed: false,
      clear: true,
      clearColor: { r: 0, g: 0, b: 0, a: 1 },
    });
  };

  addComputePass_ = () => {
    this.addNode_('compute', {
      shader: '',
      entryPoint: '',
      dispatchSize: { x: 1, y: 1, z: 1 },
    });
  };
}

function buildGraphFromBlueprint(
  blueprint: Blueprint,
  onChange: () => void
): FlowElement[] {
  const elements: FlowElement[] = [];
  Object.entries(blueprint.nodes).forEach(([id, node]) => {
    if (node.type !== 'connection') {
      elements.push({
        id,
        type: node.type,
        data: {
          blueprint,
          node,
          onChange: (update: any) => {
            Object.assign(blueprint.nodes[id], update);
            onChange();
          },
          destroy: () => {
            delete blueprint.nodes[id];
            for (const [otherId, otherNode] of Object.entries(
              blueprint.nodes
            )) {
              if (
                otherNode.type === 'connection' &&
                (otherNode.source === id || otherNode.target === id)
              ) {
                delete blueprint.nodes[otherId];
              }
            }
            onChange();
          },
        },
        position: node.position,
      });
    } else if (node.connectionType === 'binding') {
      const data = {
        blueprint,
        node,
        onChange: (update: any) => {
          Object.assign(node, update);
          onChange();
        },
        destroy: () => {
          delete blueprint.nodes[id];
          onChange();
        },
      };
      elements.push({
        id: `${id}-node`,
        type: `${node.bindingType}-binding`,
        data,
        position: node.position,
      });
      elements.push({
        id: `${id}-source-edge`,
        source: node.source,
        target: `${id}-node`,
      });
      elements.push({
        id: `${id}-target-edge`,
        source: `${id}-node`,
        target: node.target,
      });
    } else if (node.connectionType === 'queue-dependency') {
      const data = {
        blueprint,
        node,
        onChange: (update: any) => {
          Object.assign(node, update);
          onChange();
        },
        destroy: () => {
          delete blueprint.nodes[id];
          onChange();
        },
      };
      elements.push({
        id,
        source: node.source,
        target: node.target,
        targetHandle: 'queueIn',
        type: 'queue-dependency',
        data,
      });
    }
  });

  return elements;
}
