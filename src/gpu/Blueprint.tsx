import { toByteArray, fromByteArray } from 'base64-js';

import { deepCopy } from '../base/Util';

export type ID = NodeID | ShaderID;
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

interface SerializedBlueprintV0 {
  nodes: Record<NodeID, NodeDescriptor>;
  shaders: Record<ShaderID, ShaderDescriptor>;
}

interface SerializedBlueprintV1 {
  version: 1;
  nodes: NodeDescriptor[];
  shaders: ShaderDescriptor[];
}

export type SerializedBlueprint =
  | SerializedBlueprintV0
  | VersionedSerializedBlueprint;

type VersionedSerializedBlueprint = SerializedBlueprintV1;

function canonicalize(blueprint: Blueprint) {
  for (const [id, node] of Object.entries(blueprint.nodes)) {
    node.id = id;

    const oldNode = node as any;
    if (oldNode.uuid) {
      delete oldNode.uuid;
    }
  }
  for (const [id, shader] of Object.entries(blueprint.shaders)) {
    shader.id = id;

    const oldShader = shader as any;
    if (oldShader.uuid) {
      delete oldShader.uuid;
    }
  }
}

function deserializeV0(
  serialized: SerializedBlueprintV0,
  blueprint: Blueprint
) {
  for (const [id, node] of Object.entries(serialized.nodes)) {
    blueprint.nodes[id] = deepCopy(node);
  }
  for (const [id, shader] of Object.entries(serialized.shaders)) {
    blueprint.shaders[id] = deepCopy(shader);
  }
}

function deserializeV1(
  serialized: SerializedBlueprintV1,
  blueprint: Blueprint
) {
  for (const node of serialized.nodes) {
    blueprint.nodes[node.id] = deepCopy(node);
  }
  for (const shader of serialized.shaders) {
    blueprint.shaders[shader.id] = deepCopy(shader);
  }
}

export function deserializeBlueprint(
  serialized: SerializedBlueprint
): Blueprint {
  const blueprint: Blueprint = { nodes: {}, shaders: {} };

  if (!serialized.hasOwnProperty('version')) {
    deserializeV0(serialized as SerializedBlueprintV0, blueprint);
  } else {
    const versioned = serialized as VersionedSerializedBlueprint;
    switch (versioned.version) {
      case 1:
        deserializeV1(versioned as SerializedBlueprintV1, blueprint);
        break;
    }
  }

  canonicalize(blueprint);

  for (const node of Object.values(blueprint.nodes)) {
    if (node.type !== 'texture') {
      continue;
    }

    if (node.imageDataSerialized) {
      const bytes = toByteArray(node.imageDataSerialized);
      node.imageData = new Blob([bytes]);
      node.imageDataSerialized = null;
    }
  }

  return blueprint;
}

interface SerializationOptions {
  serializeBlobs?: boolean;
}

export async function serializeBlueprint(
  blueprint: Blueprint,
  options?: SerializationOptions
): Promise<SerializedBlueprintV1> {
  const serialized: SerializedBlueprintV1 = {
    version: 1,
    nodes: deepCopy(Object.values(blueprint.nodes)),
    shaders: deepCopy(Object.values(blueprint.shaders)),
  };
  if (options && options.serializeBlobs) {
    for (const node of serialized.nodes) {
      if (node.type !== 'texture') {
        continue;
      }

      if (node.imageData instanceof Blob) {
        const bytes = new Uint8Array(await node.imageData.arrayBuffer());
        node.imageDataSerialized = fromByteArray(bytes);
        node.imageData = null;
      }
    }
  }
  return serialized;
}
