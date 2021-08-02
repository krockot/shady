export interface Blueprint {
  nodes: Record<string, NodeDescriptor>;
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

export interface NodeDescriptorBase {
  type: 'buffer' | 'render' | 'compute' | 'texture' | 'sampler' | 'binding';
  name: string;
  position: { x: number; y: number };
}

export interface PipelineNodeDescriptor extends NodeDescriptorBase {
  bindings: string[];
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
