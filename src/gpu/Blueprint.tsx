export type NodeID = string;
export type ShaderID = string;

export interface Blueprint {
  nodes: Record<NodeID, NodeDescriptor>;
  shaders: Record<ShaderID, ShaderDescriptor>;
}

export type NodeDescriptor =
  | BufferNodeDescriptor
  | ComputeNodeDescriptor
  | ConnectionNodeDescriptor
  | RenderNodeDescriptor
  | SamplerNodeDescriptor
  | TextureNodeDescriptor;

export type ConnectionNodeDescriptor =
  | BufferBindingNodeDescriptor
  | QueueNodeDescriptor
  | SamplerBindingNodeDescriptor
  | TextureBindingNodeDescriptor;

export type NodeType =
  | 'render'
  | 'compute'
  | 'buffer'
  | 'texture'
  | 'sampler'
  | 'connection';

export interface NodeDescriptorBase {
  id: NodeID;
  name: string;
  position: { x: number; y: number };
  type: NodeType;
}

export interface RenderNodeDescriptor extends NodeDescriptorBase {
  type: 'render';

  // TODO: Configuration for primitive state, depth/stencil, multisampling

  vertexShader: ShaderID;
  vertexEntryPoint: string;

  fragmentShader: ShaderID;
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
  shader: ShaderID;
  entryPoint: string;
  dispatchSize: { x: number; y: number; z: number };
}

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

export interface ShaderDescriptor {
  name: string;
  id: ShaderID;
  code: string;
}

export type ConnectionType = 'binding' | 'queue';

export interface ConnectionNodeDescriptorBase extends NodeDescriptorBase {
  type: 'connection';
  connectionType: ConnectionType;
  source: NodeID;
  target: NodeID;
}

export type BindingType = 'buffer' | 'sampler' | 'texture';

export interface BindingNodeDescriptorBase
  extends ConnectionNodeDescriptorBase {
  connectionType: 'binding';
  bindingType: BindingType;
  group: number;
  binding: number;
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

export type BindingNodeDescriptor =
  | BufferBindingNodeDescriptor
  | SamplerBindingNodeDescriptor
  | TextureBindingNodeDescriptor;

export interface QueueNodeDescriptor extends ConnectionNodeDescriptorBase {
  connectionType: 'queue';
}

export function canonicalize(blueprint: Blueprint) {
  for (const [id, node] of Object.entries(blueprint.nodes)) {
    node.id = id;
  }
  for (const [id, shader] of Object.entries(blueprint.shaders)) {
    shader.id = id;
  }
}
