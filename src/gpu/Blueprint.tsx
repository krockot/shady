export interface Blueprint {
  nodes: Record<string, NodeDescriptor>;
  edges?: Record<string, EdgeDescriptor>;
  shaders: Record<string, Shader>;
}

export type NodeMap = Map<string, NodeDescriptor>;

export type NodeDescriptor =
  | RenderNodeDescriptor
  | ComputeNodeDescriptor
  | BufferNodeDescriptor
  | TextureNodeDescriptor
  | SamplerNodeDescriptor
  | BindingNodeDescriptor;

export type EdgeDescriptor =
  | BufferBindingEdgeDescriptor
  | QueueDependencyEdgeDescriptor;

export interface NodeDescriptorBase {
  type: 'buffer' | 'render' | 'compute' | 'texture' | 'sampler' | 'binding';
  name: string;
  position: { x: number; y: number };
}

export interface PipelineNodeDescriptor extends NodeDescriptorBase {
  bindings?: string[];
}

export interface RenderNodeDescriptor extends PipelineNodeDescriptor {
  type: 'render';

  // TODO: Configuration for primitive state, depth/stencil, multisampling

  vertexShader: string;
  vertexEntryPoint: string;

  fragmentShader: string;
  fragmentEntryPoint: string;

  topology?: GPUPrimitiveTopology;
  indexed: boolean;
  numVertices: number;
  numInstances: number;

  clear?: boolean;
  clearColor?: GPUColorDict;

  depthTest?: GPUCompareFunction;
}

export interface ComputeNodeDescriptor extends PipelineNodeDescriptor {
  type: 'compute';
  shader: string;
  entryPoint: string;
  dispatchSize: { x: number; y: number; z: number };
}

export type BindingType =
  | 'storage-read'
  | 'storage'
  | 'uniform'
  | 'sampler'
  | 'texture';

export interface BindingNodeDescriptor extends NodeDescriptorBase {
  type: 'binding';
  bindingType: BindingType;
  group: number;
  binding: number;
  resourceId: string;
  passes: string[];
}

export type BufferInitializer = 'zero' | 'random-floats' | 'random-uints';

export interface BufferNodeDescriptor extends NodeDescriptorBase {
  type: 'buffer';
  size: number;
  init?: BufferInitializer;
}

export interface TextureNodeDescriptor extends NodeDescriptorBase {
  type: 'texture';
  imageId?: string;
  size: GPUExtent3DDict;
  format: GPUTextureFormat;
  mipLevelCount: number;
  sampleCount: number;
}

export interface SamplerNodeDescriptor extends NodeDescriptorBase {
  type: 'sampler';

  // TODO: Filtering, addressing, clamping, comparison, anisotropy.
}

interface Shader {
  name: string;
  code: string;
}

export interface EdgeDescriptorBase {
  type: 'buffer-binding' | 'queue-dependency';
}

export type BufferBindingType = 'storage-read' | 'storage' | 'uniform';

export interface BufferBindingEdgeDescriptor extends EdgeDescriptorBase {
  type: 'buffer-binding';
  bindingType: BufferBindingType;
  bufferId: string;
  passId: string;
  group: number;
  binding: number;
}

export interface QueueDependencyEdgeDescriptor extends EdgeDescriptorBase {
  type: 'queue-dependency';
  sourceId: string;
  targetId: string;
}

function migrateBindingsToEdges(blueprint: Blueprint) {
  if (!blueprint.edges) {
    blueprint.edges = {};
  }
  const nodesToRemove = Object.entries(blueprint.nodes).filter(
    ([, node]) => node.type === 'binding'
  ) as [string, BindingNodeDescriptor][];
  nodesToRemove.forEach(([id, node]) => {
    delete blueprint.nodes[id];
    for (let i = 1; ; ++i) {
      const edgeId = `binding${i}`;
      if (blueprint.edges!.hasOwnProperty(edgeId)) {
        continue;
      }
      node.passes.forEach(passId => {
        blueprint.edges![edgeId] = {
          type: 'buffer-binding',
          bindingType: node.bindingType as BufferBindingType,
          bufferId: node.resourceId,
          passId,
          group: node.group,
          binding: node.binding,
        };
      });
      return;
    }
  });
  Object.entries(blueprint.nodes).forEach(([id, node]) => {
    if (node.type !== 'compute' && node.type !== 'render') {
      return;
    }
    delete node.bindings;
  });
}

export function canonicalize(blueprint: Blueprint) {
  migrateBindingsToEdges(blueprint);
}
