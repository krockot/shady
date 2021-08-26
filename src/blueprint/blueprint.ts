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

export interface ComputeNode extends NodeBase {
  type: 'compute';
  shader: ShaderID;
  entryPoint: string;
  dispatchSize: { x: number; y: number; z: number };
}

export type BufferInitializer = 'zero' | 'random-floats' | 'random-uints';

export interface BufferNode extends NodeBase {
  type: 'buffer';
  size: number;
  init?: BufferInitializer;
}

export interface TextureNode extends NodeBase {
  type: 'texture';
  imageData: null | Blob;
  imageDataSerialized: null | string;
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
  name: string;
  id: ShaderID;
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

interface SerializedBlueprintV0 {
  nodes: Record<NodeID, Node>;
  shaders: Record<ShaderID, Shader>;
}

interface SerializedBlueprintV1 {
  version: 1;
  nodes: Node[];
  shaders: Shader[];
}

const CURRENT_BLUEPRINT_VERSION = 1;

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

  if (!Array.isArray(serialized.nodes)) {
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

export async function modernizeBlueprint(
  serialized: SerializedBlueprint
): Promise<SerializedBlueprint> {
  if (serialized.hasOwnProperty('version')) {
    const versioned = serialized as VersionedSerializedBlueprint;
    if (versioned.version === CURRENT_BLUEPRINT_VERSION) {
      return serialized;
    }
  }

  const blueprint = deserializeBlueprint(serialized);
  return serializeBlueprint(blueprint);
}
