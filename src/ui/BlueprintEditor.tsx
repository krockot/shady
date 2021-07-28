import './BlueprintEditor.css';

import React from 'react';
import ReactFlow, {
  Connection,
  Edge,
  FlowElement,
  Node,
} from 'react-flow-renderer';

import {
  Blueprint,
  NodeDescriptor,
  PipelineNodeDescriptor,
} from '../gpu/Blueprint';
import { BindingNode } from './nodes/BindingNode';
import { BufferNode } from './nodes/BufferNode';
import { ComputeNode } from './nodes/ComputeNode';
import { RenderNode } from './nodes/RenderNode';

const NODE_TYPES = {
  binding: BindingNode,
  buffer: BufferNode,
  compute: ComputeNode,
  render: RenderNode,
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
  render() {
    return (
      <div className="BlueprintEditor">
        <ReactFlow
          nodeTypes={NODE_TYPES}
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
            <button onClick={this.addBinding_}>+Binding</button>
            <button onClick={this.addRenderPass_}>+Render Pass</button>
            <button onClick={this.addComputePass_}>+Compute Pass</button>
          </div>
        </ReactFlow>
      </div>
    );
  }

  update_ = () => {
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

    if (target.type === 'binding') {
      target.resourceId = connection.source!;
      this.props.onChange();
      return;
    }

    if (source.type === 'binding') {
      const pipeline = target as PipelineNodeDescriptor;
      source.passes.push(connection.target!);
      pipeline.bindings.push(connection.source!);
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

  addBuffer_ = () => {
    this.addNode_('buffer', {
      size: 16384,
      position: { x: 100, y: 100 },
      init: 'zero',
    });
  };

  addBinding_ = () => {
    this.addNode_('binding', {
      bindingType: 'uniform',
      group: 0,
      binding: 0,
      resourceId: '',
      passes: [],
    });
  };

  addRenderPass_ = () => {
    this.addNode_('render', {
      vertexShader: '',
      vertexEntryPoint: '',
      fragmentShader: '',
      fragmentEntryPoint: '',
      numVertices: 4,
      numInstances: 1,
      indexed: false,
      bindings: [],
    });
  };

  addComputePass_ = () => {
    this.addNode_('compute', {
      shader: '',
      entryPoint: '',
      dispatchSize: { x: 1, y: 1, z: 1 },
      bindings: [],
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
      id: id,
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
          for (const node of Object.values(blueprint.nodes)) {
            if (node.type === 'binding') {
              if (node.resourceId === id) {
                node.resourceId = '';
              }
              node.passes = node.passes.filter(passId => passId !== id);
            }
          }
          onChange();
        },
      },
      position: node.position,
    });

    if (node.type === 'binding') {
      if (node.resourceId) {
        elements.push({
          id: `${node.resourceId}-${id}`,
          source: node.resourceId,
          target: id,
        });
      }

      for (const passId of node.passes) {
        elements.push({
          id: `${id}-${passId}`,
          source: id,
          target: passId,
        });
      }
    }
  });
  return elements;
}
