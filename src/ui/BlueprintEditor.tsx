import './BlueprintEditor.css';

import React from 'react';
import ReactFlow, {
  ArrowHeadType,
  Connection,
  Edge,
  FlowElement,
  Node as FlowNode,
  OnLoadParams,
  XYPosition,
} from 'react-flow-renderer';

import { KeyGenerator } from '../base/KeyGenerator';
import { deepCopy, deepUpdate, DeepPartial } from '../base/Util';
import {
  Blueprint,
  BufferBindingStorageType,
  Node,
  NodeID,
  ShaderID,
} from '../gpu/Blueprint';
import { BufferBindingNodePanel } from './graph/BufferBindingNodePanel';
import { BufferNodePanel } from './graph/BufferNodePanel';
import { ComputeNodePanel } from './graph/ComputeNodePanel';
import { CustomEdge } from './graph/CustomEdge';
import { RenderNodePanel } from './graph/RenderNodePanel';
import { SamplerBindingNodePanel } from './graph/SamplerBindingNodePanel';
import { SamplerNodePanel } from './graph/SamplerNodePanel';
import { TextureBindingNodePanel } from './graph/TextureBindingNodePanel';
import { TextureNodePanel } from './graph/TextureNodePanel';

const NODE_TYPES = {
  buffer: BufferNodePanel,
  texture: TextureNodePanel,
  compute: ComputeNodePanel,
  render: RenderNodePanel,
  sampler: SamplerNodePanel,
  'buffer-binding': BufferBindingNodePanel,
  'sampler-binding': SamplerBindingNodePanel,
  'texture-binding': TextureBindingNodePanel,
};

const EDGE_TYPES = {
  'custom-edge': CustomEdge,
};

interface Props {
  blueprint: Blueprint;
  onChange: (blueprint: Blueprint) => void;
}

class FlowErrorBounary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.log(error);
  }

  render() {
    return this.props.children;
  }
}

const isPassNode = (node: Node) =>
  node.type === 'render' || node.type === 'compute';

type NewNode<T> = T extends Node
  ? Omit<T, 'id' | 'position' | 'name'> | Omit<T, 'id' | 'name'>
  : never;

export class BlueprintEditor extends React.Component<Props> {
  private keyGenerator_: KeyGenerator;
  private instance_: null | OnLoadParams;
  private flowRef_: React.RefObject<HTMLDivElement>;
  private lastConnectStart_: null | XYPosition;
  private lastConnectEnd_: null | XYPosition;

  constructor(props: Props) {
    super(props);
    this.keyGenerator_ = new KeyGenerator();
    this.instance_ = null;
    this.flowRef_ = React.createRef();
    this.lastConnectStart_ = null;
    this.lastConnectEnd_ = null;
  }

  render() {
    return (
      <div className="BlueprintEditor">
        <FlowErrorBounary>
          <ReactFlow
            ref={this.flowRef_}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            elements={this.createGraph_(this.props.blueprint)}
            elementsSelectable={false}
            nodesConnectable={true}
            nodesDraggable={true}
            onLoad={this.onLoad_}
            onConnectStart={this.onConnectStart_}
            onConnectStop={this.onConnectStop_}
            onConnect={this.onConnect_}
            onElementClick={this.onElementClick_}
            onNodeDragStop={this.onMoveNode_}
            minZoom={0.01}
            maxZoom={4}
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
      this.addBufferBinding_(
        edge.source!,
        edge.target!,
        position,
        'storage-read'
      );
      return;
    }

    if (
      isPassNode(target) &&
      source.type === 'texture' &&
      edge.targetHandle === 'bindings'
    ) {
      this.addTextureBinding_(edge.source!, edge.target!, position);
      return;
    }

    if (
      isPassNode(target) &&
      source.type === 'sampler' &&
      edge.targetHandle === 'bindings'
    ) {
      this.addSamplerBinding_(edge.source!, edge.target!, position);
      return;
    }

    if (
      isPassNode(target) &&
      isPassNode(source) &&
      edge.targetHandle === 'queueIn'
    ) {
      const id = this.newNodeKey_('queue-dep');
      this.updateNode_(id, {
        id,
        name: '',
        position,
        type: 'connection' as const,
        connectionType: 'queue' as const,
        source: edge.source!,
        target: edge.target!,
      });
      return;
    }
  };

  newKey_(object: Record<string, any>, prefix: string): string {
    return this.keyGenerator_.generateKey(object, prefix);
  }

  newNodeKey_(prefix: NodeID): NodeID {
    return this.newKey_(this.props.blueprint.nodes, prefix);
  }

  newShaderKey_(): ShaderID {
    return this.newKey_(this.props.blueprint.shaders, 'shader');
  }

  updateBlueprint_(update: DeepPartial<Blueprint>) {
    const copy = deepCopy(this.props.blueprint);
    deepUpdate(copy, update);
    this.props.onChange(copy);
  }

  updateNode_(id: NodeID, update: Partial<Node>) {
    this.updateBlueprint_({ nodes: { [id]: update } });
  }

  onElementClick_ = (
    event: React.MouseEvent<Element, MouseEvent>,
    element: FlowNode<any> | Edge<any>
  ) => {};

  onMoveNode_ = (event: React.MouseEvent, node: FlowNode) => {
    this.updateNode_(node.data.node.id, { position: { ...node.position } });
  };

  addShader_ = () => {
    const id = this.newShaderKey_();
    this.updateBlueprint_({ shaders: { [id]: { name: id, id, code: '' } } });
  };

  addNode_ = <T extends Node>(node: NewNode<T>) => {
    const id = this.newNodeKey_(node.type);
    this.updateNode_(id, {
      id,
      name: id,
      position: { x: 100, y: 100 },
      ...node,
    });
  };

  addBuffer_ = () => {
    this.addNode_({
      type: 'buffer',
      size: 16384,
      init: 'zero',
    });
  };

  addTexture_ = () => {
    this.addNode_({
      type: 'texture',
      size: { width: 1024, height: 1024 },
      format: 'rgba8unorm',
      mipLevelCount: 1,
      sampleCount: 1,
      imageData: null,
      imageDataSerialized: null,
    });
  };

  addSampler_ = () => this.addNode_({ type: 'sampler' });

  addBufferBinding_ = (
    source: NodeID,
    target: NodeID,
    position: XYPosition,
    storageType: BufferBindingStorageType
  ) => {
    this.addNode_({
      type: 'connection',
      connectionType: 'binding',
      bindingType: 'buffer',
      source,
      target,
      group: 0,
      binding: 1,
      storageType,
    });
  };

  addTextureBinding_ = (
    source: NodeID,
    target: NodeID,
    position: XYPosition
  ) => {
    this.addNode_({
      type: 'connection',
      connectionType: 'binding',
      bindingType: 'texture',
      source,
      target,
      position,
      group: 0,
      binding: 1,
    });
  };

  addSamplerBinding_ = (
    source: NodeID,
    target: NodeID,
    position: XYPosition
  ) => {
    this.addNode_({
      type: 'connection',
      connectionType: 'binding',
      bindingType: 'sampler',
      source,
      target,
      position,
      group: 0,
      binding: 1,
    });
  };

  addRenderPass_ = () => {
    this.addNode_({
      type: 'render',
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
    this.addNode_({
      type: 'compute',
      shader: '',
      entryPoint: '',
      dispatchSize: { x: 1, y: 1, z: 1 },
    });
  };

  createGraph_(blueprint: Blueprint): FlowElement[] {
    const elements: FlowElement[] = [];
    Object.entries(blueprint.nodes).forEach(([id, node]) => {
      if (node.type !== 'connection') {
        elements.push({
          id,
          type: node.type,
          data: {
            blueprint,
            node,
            onChange: (update: any) => this.updateNode_(id, update),
            destroy: () => {
              const copy = deepCopy(blueprint);
              delete copy.nodes[id];
              for (const [otherId, otherNode] of Object.entries(copy.nodes)) {
                if (
                  otherNode.type === 'connection' &&
                  (otherNode.source === id || otherNode.target === id)
                ) {
                  delete copy.nodes[otherId];
                }
              }
              this.props.onChange(copy);
            },
          },
          position: node.position,
        });
      } else if (node.connectionType === 'binding') {
        const data = {
          blueprint,
          node,
          onChange: (update: any) => this.updateNode_(id, update),
          destroy: () => {
            const copy = deepCopy(blueprint);
            delete copy.nodes[id];
            this.props.onChange(copy);
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
          arrowHeadType: 'arrowclosed' as ArrowHeadType,
        });
      } else if (node.connectionType === 'queue') {
        const data = {
          blueprint,
          node,
          onChange: (update: any) => this.updateNode_(id, update),
          destroy: () => {
            const copy = deepCopy(blueprint);
            delete copy.nodes[id];
            this.props.onChange(copy);
          },
        };
        elements.push({
          id,
          source: node.source,
          target: node.target,
          targetHandle: 'queueIn',
          type: 'custom-edge',
          arrowHeadType: 'arrowclosed' as ArrowHeadType,
          data,
        });
      }
    });

    return elements;
  }
}
