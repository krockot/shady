import { randomUUID } from '../base/Uuid';

export interface Blueprint {
  nodes: Record<string, NodeDescriptor>;
  shaders: Record<string, Shader>;
}

export type NodeMap = Map<string, NodeDescriptor>;

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
  name: string;
  position: { x: number; y: number };
  type: NodeType;
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

export type BufferInitializer = 'zero' | 'random-floats' | 'random-uints';

export interface BufferNodeDescriptor extends NodeDescriptorBase {
  type: 'buffer';
  uuid: string;
  size: number;
  init?: BufferInitializer;
}

export interface TextureNodeDescriptor extends NodeDescriptorBase {
  type: 'texture';
  uuid: string;
  imageData: null | Blob;
  imageDataSerialized: null | string;
  size: GPUExtent3DDict;
  format: GPUTextureFormat;
  mipLevelCount: number;
  sampleCount: number;
}

export interface SamplerNodeDescriptor extends NodeDescriptorBase {
  type: 'sampler';
  uuid: string;

  // TODO: Filtering, addressing, clamping, comparison, anisotropy.
}

interface Shader {
  name: string;
  uuid: string;
  code: string;
}

export type ConnectionType = 'binding' | 'queue';

export interface ConnectionNodeDescriptorBase extends NodeDescriptorBase {
  type: 'connection';
  connectionType: ConnectionType;
  source: string;
  target: string;
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
  const data = blueprint as any;
  for (const n of Object.values(data.nodes)) {
    const node = n as any;
    if ((node.type === 'buffer' || node.type === 'texture' ||
         node.type === 'sampler') && !node.uuid) {
      node.uuid = randomUUID();
    }
  }
  for (const s of Object.values(data.shaders)) {
    const shader = s as any;
    if (!shader.uuid) {
      shader.uuid = randomUUID();
    }
  }
}
