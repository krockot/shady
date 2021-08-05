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
  | SamplerNodeDescriptor;

export type EdgeDescriptor =
  | BufferBindingEdgeDescriptor
  | TextureBindingEdgeDescriptor
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

export type BindingType = 'buffer' | 'sampler' | 'texture';

export type BufferInitializer = 'zero' | 'random-floats' | 'random-uints';

export interface BufferNodeDescriptor extends NodeDescriptorBase {
  type: 'buffer';
  size: number;
  init?: BufferInitializer;
}

export interface TextureNodeDescriptor extends NodeDescriptorBase {
  type: 'texture';
  imageData: null | Blob;
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
  type: 'binding' | 'queue-dependency';
  source: string;
  target: string;
}

export interface BindingEdgeDescriptorBase extends EdgeDescriptorBase {
  type: 'binding';
  bindingType: BindingType;
  group: number;
  binding: number;
}

export type BufferBindingStorageType = 'storage-read' | 'storage' | 'uniform';

export interface BufferBindingEdgeDescriptor extends BindingEdgeDescriptorBase {
  bindingType: 'buffer';
  storageType: BufferBindingStorageType;
}

export interface TextureBindingEdgeDescriptor
  extends BindingEdgeDescriptorBase {
  bindingType: 'texture';
}

export interface QueueDependencyEdgeDescriptor extends EdgeDescriptorBase {
  type: 'queue-dependency';
}

export function canonicalize(blueprint: Blueprint) {
  for (const [, edge] of Object.entries(blueprint.edges ?? {})) {
    const d = edge as any;
    if (d['sourceId']) {
      d['source'] = d['sourceId'];
    }
    if (d['targetId']) {
      d['target'] = d['targetId'];
    }
    if (d['bufferId']) {
      d['source'] = d['bufferId'];
    }
    if (d['passId']) {
      d['targetId'] = d['passId'];
    }
  }
}
