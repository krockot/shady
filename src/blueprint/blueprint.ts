import { toByteArray, fromByteArray } from 'base64-js';

import { deepCopy } from '../base/util';

export type ID = NodeID | ShaderID;
export type NodeID = string;
export type ShaderID = string;

export interface Blueprint {
  nodes: Record<NodeID, Node>;
  shaders: Record<ShaderID, Shader>;
}

export type Node =
  | BufferNode
  | ComputeNode
  | ConnectionNode
  | RenderNode
  | SamplerNode
  | TextureNode;

export type ConnectionNode =
  | BufferBindingNode
  | QueueNode
  | SamplerBindingNode
  | TextureBindingNode;

export type NodeType =
  | 'render'
  | 'compute'
  | 'buffer'
  | 'texture'
  | 'sampler'
  | 'connection';

export interface NodeBase {
  id: NodeID;
  name: string;
  position: { x: number; y: number };
  type: NodeType;
}

export interface RenderNode extends NodeBase {
  type: 'render';

  vertexShader: ShaderID | null;
  vertexEntryPoint: string | null;

  fragmentShader: ShaderID | null;
  fragmentEntryPoint: string | null;

  topology: GPUPrimitiveTopology;
  indexed: boolean;
  numVertices: number;
  numInstances: number;

  clear: boolean;
  clearColor: GPUColorDict;

  depthTest: GPUCompareFunction;
}

export interface ComputeNode extends NodeBase {
  type: 'compute';
  shader: ShaderID | null;
  entryPoint: string | null;
  dispatchSize: { x: number; y: number; z: number };
}

export type BufferInitializer = 'zero' | 'random-floats' | 'random-uints';

export interface BufferNode extends NodeBase {
  type: 'buffer';
  size: number;
  init: BufferInitializer;
}

export interface TextureNode extends NodeBase {
  type: 'texture';
  imageData: Blob | null;
  size: GPUExtent3DDict;
  format: GPUTextureFormat;
  mipLevelCount: number;
  sampleCount: number;
}

export interface SamplerNode extends NodeBase {
  type: 'sampler';

  // TODO: Filtering, addressing, clamping, comparison, anisotropy.
}

export interface Shader {
  id: ShaderID;
  name: string;
  code: string;
}

export type ConnectionType = 'binding' | 'queue';

export interface ConnectionNodeBase extends NodeBase {
  type: 'connection';
  connectionType: ConnectionType;
  source: NodeID;
  target: NodeID;
}

export type BindingType = 'buffer' | 'sampler' | 'texture';

export interface BindingNodeBase extends ConnectionNodeBase {
  connectionType: 'binding';
  bindingType: BindingType;
  group: number;
  binding: number;
}

export type BufferBindingStorageType = 'storage-read' | 'storage' | 'uniform';

export interface BufferBindingNode extends BindingNodeBase {
  bindingType: 'buffer';
  storageType: BufferBindingStorageType;
}

export interface TextureBindingNode extends BindingNodeBase {
  bindingType: 'texture';
}

export interface SamplerBindingNode extends BindingNodeBase {
  bindingType: 'sampler';
}

export type BindingNode =
  | BufferBindingNode
  | SamplerBindingNode
  | TextureBindingNode;

export interface QueueNode extends ConnectionNodeBase {
  connectionType: 'queue';
}
