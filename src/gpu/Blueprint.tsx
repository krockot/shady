export interface Blueprint {
  nodes: Record<string, NodeDescriptor>;
  shaders: Record<string, Shader>;
}

export type NodeMap = Map<string, NodeDescriptor>;

export type NodeDescriptor =
  | BufferBindingNodeDescriptor
  | BufferNodeDescriptor
  | ComputeNodeDescriptor
  | QueueNodeDescriptor
  | RenderNodeDescriptor
  | SamplerBindingNodeDescriptor
  | SamplerNodeDescriptor
  | TextureBindingNodeDescriptor
  | TextureNodeDescriptor;

export interface NodeDescriptorBase {
  type: 'buffer' | 'render' | 'compute' | 'texture' | 'sampler' | 'connection';
  name: string;
  position: { x: number; y: number };
}

export interface RenderNodeDescriptor extends NodeDescriptorBase {
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

export interface ComputeNodeDescriptor extends NodeDescriptorBase {
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
  imageDataSerialized: null | string;
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

export type ConnectionType = 'binding' | 'queue';

export interface ConnectionNodeDescriptor extends NodeDescriptorBase {
  type: 'connection';
  connectionType: ConnectionType;
  source: string;
  target: string;
}

export interface BindingNodeDescriptorBase extends ConnectionNodeDescriptor {
  connectionType: 'binding';
  bindingType: BindingType;
  group: number;
  binding: number;
}

export interface QueueNodeDescriptor extends ConnectionNodeDescriptor {
  connectionType: 'queue';
}

export type BufferBindingStorageType = 'storage-read' | 'storage' | 'uniform';

export interface BufferBindingNodeDescriptor extends BindingNodeDescriptorBase {
  bindingType: 'buffer';
  storageType: BufferBindingStorageType;
}

export interface TextureBindingNodeDescriptor
  extends BindingNodeDescriptorBase {
  bindingType: 'texture';
}

export interface SamplerBindingNodeDescriptor
  extends BindingNodeDescriptorBase {
  bindingType: 'sampler';
}

export function canonicalize(blueprint: Blueprint) {
  for (const node of Object.values(blueprint.nodes)) {
    if (!node.position) {
      node.position = { x: 100, y: 100 };
    }
  }
}
