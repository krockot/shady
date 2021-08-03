import './BlueprintEditor.css';

import React from 'react';
import ReactFlow, {
  Connection,
  Edge,
  FlowElement,
  Node,
} from 'react-flow-renderer';

import { Blueprint, EdgeDescriptor, NodeDescriptor } from '../gpu/Blueprint';
import { BufferBindingEdge } from './nodes/BufferBindingEdge';
import { BufferNode } from './nodes/BufferNode';
import { ComputeNode } from './nodes/ComputeNode';
import { RenderNode } from './nodes/RenderNode';

const NODE_TYPES = {
  buffer: BufferNode,
  compute: ComputeNode,
  render: RenderNode,
};

const EDGE_TYPES = {
  bufferBinding: BufferBindingEdge,
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

export class BlueprintEditor extends React.Component<Props> {
  private isMounted_: boolean;

  constructor(props: Props) {
    super(props);
    this.isMounted_ = false;
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
        <ReactFlow
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          elements={buildGraphFromBlueprint(this.props.blueprint, this.update_)}
          elementsSelectable={true}
          nodesConnectable={true}
          nodesDraggable={true}
          onConnect={this.onConnect_}
          onElementClick={this.onElementClick_}
          onNodeDragStop={this.onMoveNode_}
        >
          <div className="Toolbar">
            <button onClick={this.addShader_}>+Shader</button>
            <button onClick={this.addBuffer_}>+Buffer</button>
            <button onClick={this.addRenderPass_}>+Render Pass</button>
            <button onClick={this.addComputePass_}>+Compute Pass</button>
          </div>
        </ReactFlow>
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

  onConnect_ = (connection: Edge<any> | Connection) => {
    const source = this.props.blueprint.nodes[connection.source!];
    const target = this.props.blueprint.nodes[connection.target!];
    if (!source || !target) {
      return;
    }

    if (
      (target.type === 'compute' || target.type === 'render') &&
      source.type === 'buffer'
    ) {
      this.addBufferBinding_(connection.source!, connection.target!);
      this.props.onChange();
      return;
    }
  };

  onElementClick_ = (
    event: React.MouseEvent<Element, MouseEvent>,
    element: Node<any> | Edge<any>
  ) => {};

  onMoveNode_ = (event: React.MouseEvent, node: Node) => {
    node.data.descriptor.position = { ...node.position };
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

  addEdge_ = (type: string, edge: Partial<EdgeDescriptor>) => {
    const edges = this.props.blueprint.edges ?? {};
    this.props.blueprint.edges = edges;

    const id = getUnusedKey(edges, type);
    edges[id] = {
      type,
      ...edge,
    } as EdgeDescriptor;
    this.update_();
  };

  addBuffer_ = () => {
    this.addNode_('buffer', {
      size: 16384,
      position: { x: 100, y: 100 },
      init: 'zero',
    });
  };

  addBufferBinding_ = (bufferId: string, passId: string) => {
    this.addEdge_('buffer-binding', {
      bindingType: 'storage-read',
      group: 0,
      binding: 1,
      bufferId,
      passId,
    });
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
    elements.push({
      id,
      type: node.type,
      data: {
        blueprint,
        descriptor: node,
        onChange: (update: any) => {
          Object.assign(blueprint.nodes[id], update);
          onChange();
        },
        destroy: () => {
          delete blueprint.nodes[id];
          for (const [id, edge] of Object.entries(blueprint.edges ?? {})) {
            if (
              blueprint.edges &&
              (edge.bufferId === id || edge.passId === id)
            ) {
              delete blueprint.edges[id];
            }
          }
          onChange();
        },
      },
      position: node.position,
    });
  });

  Object.entries(blueprint.edges ?? {}).forEach(([id, edge]) => {
    elements.push({
      id,
      source: edge.bufferId,
      target: edge.passId,
      type: 'bufferBinding',
      data: {
        blueprint,
        descriptor: edge,
        onChange: (update: any) => {
          Object.assign(blueprint.edges![id], update);
          onChange();
        },
        destroy: () => {
          delete blueprint.edges![id];
          onChange();
        },
      },
    });
  });

  return elements;
}
