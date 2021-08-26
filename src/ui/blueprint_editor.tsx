import './blueprint_editor.css';

import React from 'react';
import ReactFlow, {
  ArrowHeadType,
  Connection,
  Edge,
  FlowElement,
  FlowTransform,
  Node as FlowNode,
  OnLoadParams,
  XYPosition,
} from 'react-flow-renderer';

import { KeyGenerator } from '../base/key_generator';
import { deepCopy, deepUpdate, DeepPartial } from '../base/util';
import {
  Blueprint,
  BufferBindingStorageType,
  Node,
  NodeID,
  ShaderID,
} from '../blueprint/blueprint';
import { BufferBindingPanel } from './graph/buffer_binding_panel';
import { BufferPanel } from './graph/buffer_panel';
import { ComputePanel } from './graph/compute_panel';
import { CustomEdge } from './graph/custom_edge';
import { RenderPanel } from './graph/render_panel';
import { SamplerBindingPanel } from './graph/sampler_binding_panel';
import { SamplerPanel } from './graph/sampler_panel';
import { TextureBindingPanel } from './graph/texture_binding_panel';
import { TexturePanel } from './graph/texture_panel';

const NODE_TYPES = {
  buffer: BufferPanel,
  texture: TexturePanel,
  compute: ComputePanel,
  render: RenderPanel,
  sampler: SamplerPanel,
  'buffer-binding': BufferBindingPanel,
  'sampler-binding': SamplerBindingPanel,
  'texture-binding': TextureBindingPanel,
};

const EDGE_TYPES = {
  'custom-edge': CustomEdge,
};

interface Props {
  blueprint: Blueprint;
  transform: FlowTransform;
  onChange: (blueprint: Blueprint) => void;
  onTransformChange: (transform: FlowTransform) => void;
}

class FlowErrorBounary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.log(error);
  }

  render() {
    return this.props.children;
  }
}

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
    const transform = this.props.transform;
    return (
      <div className="BlueprintEditor">
        <FlowErrorBounary>
          <ReactFlow
            ref={this.flowRef_}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            elements={this.createGraph_(this.props.blueprint)}
            defaultZoom={transform.zoom}
            defaultPosition={[transform.x, transform.y]}
            elementsSelectable={false}
            nodesConnectable={true}
            nodesDraggable={true}
            onLoad={this.onLoad_}
            onConnectStart={this.onConnectStart_}
            onConnectStop={this.onConnectStop_}
            onConnect={this.onConnect_}
            onElementClick={() => {}}
            onMoveEnd={this.onMoveEnd_}
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
    const sourceId = edge.source!;
    const targetId = edge.target!;
    const source = this.props.blueprint.nodes[sourceId];
    const target = this.props.blueprint.nodes[targetId];
    const handle = edge.targetHandle;
    if (!source || !target) {
      return;
    }

    const isPass = ({ type }: Node) => type === 'render' || type === 'compute';
    if (!isPass(target)) {
      return;
    }

    const instance = this.instance_;
    const start = this.lastConnectStart_;
    const end = this.lastConnectEnd_;
    const flow = this.flowRef_.current;
    let position = { x: 100, y: 100 };
    if (instance && start !== null && end !== null && flow) {
      const kBindingPanelWidth = 120;
      const kBindingPanelHeight = 80;
      const view = flow.getBoundingClientRect();
      const midpoint = {
        x: (start.x + end.x - kBindingPanelWidth) / 2 - view.x,
        y: (start.y + end.y - kBindingPanelHeight) / 2 - view.y,
      };
      position = instance.project(midpoint);
    }

    if (source.type === 'buffer' && handle === 'bindings') {
      this.addBufferBinding_(sourceId, targetId, position, 'storage-read');
    } else if (source.type === 'texture' && handle === 'bindings') {
      this.addTextureBinding_(sourceId, targetId, position);
      return;
    } else if (source.type === 'sampler' && handle === 'bindings') {
      this.addSamplerBinding_(sourceId, targetId, position);
      return;
    } else if (isPass(source) && handle === 'queueIn') {
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

  replaceBlueprint_(blueprint: Blueprint) {
    this.props.onChange(blueprint);
  }

  updateBlueprint_(update: DeepPartial<Blueprint>) {
    const copy = deepCopy(this.props.blueprint);
    deepUpdate(copy, update);
    this.replaceBlueprint_(copy);
  }

  updateNode_(id: NodeID, update: Partial<Node>) {
    this.updateBlueprint_({ nodes: { [id]: update } });
  }

  onMoveEnd_ = (transform?: FlowTransform) => {
    if (transform) {
      this.props.onTransformChange({ ...transform });
    }
  };

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
      position,
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
      vertexShader: null,
      vertexEntryPoint: null,
      fragmentShader: null,
      fragmentEntryPoint: null,
      topology: 'triangle-list',
      numVertices: 4,
      numInstances: 1,
      indexed: false,
      clear: true,
      clearColor: { r: 0, g: 0, b: 0, a: 1 },
      depthTest: 'always',
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

  removeNode_ = (removedId: NodeID) => {
    const blueprint = this.props.blueprint;
    const removedIds: Set<NodeID> = new Set([removedId]);
    for (const [id, node] of Object.entries(blueprint.nodes)) {
      if (
        node.type === 'connection' &&
        (node.source === removedId || node.target === removedId)
      ) {
        removedIds.add(id);
      }
    }

    const remainingNodes: Record<string, Node> = {};
    for (const [id, node] of Object.entries(blueprint.nodes)) {
      if (!removedIds.has(id)) {
        remainingNodes[id] = deepCopy(node);
      }
    }
    this.replaceBlueprint_({
      nodes: remainingNodes,
      shaders: blueprint.shaders,
    });
  };

  createGraph_(blueprint: Blueprint): FlowElement[] {
    const elements: FlowElement[] = [];
    Object.entries(blueprint.nodes).forEach(([id, node]) => {
      const data = {
        blueprint,
        node,
        onChange: (update: any) => this.updateNode_(id, update),
        destroy: () => this.removeNode_(id),
      };
      const position = node.position;
      if (node.type !== 'connection') {
        elements.push({ id, type: node.type, position, data });
      } else if (node.connectionType === 'binding') {
        const type = `${node.bindingType}-binding`;
        const binding = `${id}-node`;
        const sourceEdge = `${id}-source-edge`;
        const targetEdge = `${id}-target-edge`;
        elements.push({ id: binding, type, position, data });
        elements.push({ id: sourceEdge, source: node.source, target: binding });
        elements.push({
          id: targetEdge,
          source: binding,
          target: node.target,
          arrowHeadType: 'arrowclosed' as ArrowHeadType,
        });
      } else if (node.connectionType === 'queue') {
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
