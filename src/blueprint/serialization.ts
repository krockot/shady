import { toByteArray, fromByteArray } from 'base64-js';

import * as blueprint from './blueprint';

export interface SerializedBlueprint {
  version: number;
  nodes: SerializedNode[];
  shaders: SerializedShader[];
}

export type SerializedNode =
  | SerializedRenderNode
  | SerializedComputeNode
  | SerializedBufferNode
  | SerializedTextureNode
  | SerializedSamplerNode
  | SerializedConnectionNode;

export type SerializedConnectionNode =
  | SerializedQueueNode
  | SerializedBufferBindingNode
  | SerializedTextureBindingNode
  | SerializedSamplerBindingNode;

export interface SerializedNodeBase {
  id: string;
  type: string;
  name?: string;
  position?: { x: number; y: number };
}

export interface SerializedRenderNode extends SerializedNodeBase {
  type: 'render';

  vertexShader?: string | null;
  vertexEntryPoint?: string | null;

  fragmentShader?: string | null;
  fragmentEntryPoint?: string | null;

  topology?: GPUPrimitiveTopology;
  indexed?: boolean;
  numVertices?: number;
  numInstances?: number;

  clear?: boolean;
  clearColor?: GPUColorDict;

  depthTest?: GPUCompareFunction;
}

export interface SerializedComputeNode extends SerializedNodeBase {
  type: 'compute';
  shader?: string | null;
  entryPoint?: string | null;
  dispatchSize?: { x: number; y: number; z: number };
}

export interface SerializedBufferNode extends SerializedNodeBase {
  type: 'buffer';
  size?: number;
  init?: blueprint.BufferInitializer;
}

export interface SerializedTextureNode extends SerializedNodeBase {
  type: 'texture';
  imageData?: string | Blob | null;
  size?: GPUExtent3DDict;
  format?: GPUTextureFormat;
  mipLevelCount?: number;
  sampleCount?: number;
}

export interface SerializedSamplerNode extends SerializedNodeBase {
  type: 'sampler';
}

export interface SerializedShader {
  id: string;
  name?: string;
  code?: string;
}

export interface SerializedConnectionNodeBase extends SerializedNodeBase {
  type: 'connection';
  connectionType?: string;
  source?: string;
  target?: string;
}

export interface SerializedBindingNodeBase
  extends SerializedConnectionNodeBase {
  connectionType: 'binding';
  bindingType?: string;
  group?: number;
  binding?: number;
}

export interface SerializedBufferBindingNode extends SerializedBindingNodeBase {
  bindingType: 'buffer';
  storageType?: string;
}

export type SerializedBindingNode =
  | SerializedBufferBindingNode
  | SerializedTextureBindingNode
  | SerializedSamplerBindingNode;

export interface SerializedTextureBindingNode
  extends SerializedBindingNodeBase {
  bindingType: 'texture';
}

export interface SerializedSamplerBindingNode
  extends SerializedBindingNodeBase {
  bindingType: 'sampler';
}

export interface SerializedQueueNode extends SerializedConnectionNodeBase {
  connectionType: 'queue';
}

type NodeBaseData = Omit<blueprint.NodeBase, 'type'>;

function deserializeRenderNode(
  data: SerializedRenderNode,
  base: NodeBaseData
): blueprint.RenderNode {
  return {
    ...base,
    type: 'render',
    vertexShader: data.vertexShader ?? null,
    vertexEntryPoint: data.vertexEntryPoint ?? null,
    fragmentShader: data.fragmentShader ?? null,
    fragmentEntryPoint: data.fragmentEntryPoint ?? null,
    topology: data.topology ?? 'triangle-list',
    indexed: data.indexed ?? false,
    numVertices: data.numVertices ?? 3,
    numInstances: data.numInstances ?? 1,
    clear: data.clear ?? false,
    clearColor: data.clearColor ?? { r: 0, g: 0, b: 0, a: 0 },
    depthTest: data.depthTest ?? 'always',
  };
}

function deserializeComputeNode(
  data: SerializedComputeNode,
  base: NodeBaseData
): blueprint.ComputeNode {
  return {
    ...base,
    type: 'compute',
    shader: data.shader ?? null,
    entryPoint: data.entryPoint ?? null,
    dispatchSize: data.dispatchSize ?? { x: 1, y: 1, z: 1 },
  };
}

function deserializeBufferNode(
  data: SerializedBufferNode,
  base: NodeBaseData
): blueprint.BufferNode {
  return {
    ...base,
    type: 'buffer',
    size: data.size ?? 16384,
    init: data.init ?? 'zero',
  };
}

function deserializeTextureNode(
  data: SerializedTextureNode,
  base: NodeBaseData
): blueprint.TextureNode {
  let imageData: Blob | null = null;
  if (data.imageData) {
    if (data.imageData instanceof Blob) {
      imageData = data.imageData;
    } else {
      imageData = new Blob([toByteArray(data.imageData)]);
    }
  }

  return {
    ...base,
    type: 'texture',
    imageData,
    size: data.size ?? { width: 1, height: 1 },
    format: data.format ?? 'rgba8unorm',
    mipLevelCount: data.mipLevelCount ?? 1,
    sampleCount: data.sampleCount ?? 1,
  };
}

function deserializeSamplerNode(
  data: SerializedSamplerNode,
  base: NodeBaseData
): blueprint.SamplerNode {
  return {
    ...base,
    type: 'sampler',
  };
}

type BindingNodeBaseData = Omit<blueprint.BindingNodeBase, 'bindingType'>;

function deserializeBufferBindingNode(
  data: SerializedBufferBindingNode,
  baseBinding: BindingNodeBaseData
): blueprint.BufferBindingNode | null {
  switch (data.storageType) {
    case 'storage':
    case 'storage-read':
    case 'uniform':
      break;

    default:
      console.warn(
        `ignoring buffer binding with unknown storage type: ${data.storageType}`
      );
      return null;
  }

  return {
    ...baseBinding,
    bindingType: 'buffer',
    storageType: data.storageType ?? 'storage',
  };
}

function deserializeSamplerBindingNode(
  data: SerializedSamplerBindingNode,
  baseBinding: BindingNodeBaseData
): blueprint.SamplerBindingNode | null {
  return {
    ...baseBinding,
    bindingType: 'sampler',
  };
}

function deserializeTextureBindingNode(
  data: SerializedTextureBindingNode,
  baseBinding: BindingNodeBaseData
): blueprint.TextureBindingNode | null {
  return {
    ...baseBinding,
    bindingType: 'texture',
  };
}

type ConnectionNodeBaseData = Omit<
  blueprint.ConnectionNodeBase,
  'connectionType'
>;

function deserializeBindingNode(
  data: SerializedBindingNode,
  baseConnection: ConnectionNodeBaseData
): blueprint.BindingNode | null {
  const baseBinding: BindingNodeBaseData = {
    ...baseConnection,
    connectionType: 'binding',
    group: data.group ?? 0,
    binding: data.binding ?? 0,
  };
  switch (data.bindingType) {
    case 'buffer':
      return deserializeBufferBindingNode(data, baseBinding);
    case 'sampler':
      return deserializeSamplerBindingNode(data, baseBinding);
    case 'texture':
      return deserializeTextureBindingNode(data, baseBinding);
    default:
      const unknownData = data as { bindingType: string };
      console.warn(`ignoring unknown binding type: ${unknownData.bindingType}`);
      return null;
  }
}

function deserializeConnectionNode(
  data: SerializedConnectionNode,
  base: NodeBaseData
): blueprint.ConnectionNode | null {
  const baseConnection: ConnectionNodeBaseData = {
    ...base,
    type: 'connection',
    source: data.source ?? '',
    target: data.target ?? '',
  };
  switch (data.connectionType) {
    case 'binding':
      return deserializeBindingNode(data, baseConnection);
    case 'queue':
      return { connectionType: 'queue', ...baseConnection };
    default:
      const unknownData = data as { connectionType: string };
      console.warn(
        `ignoring unknown connection node type: ${unknownData.connectionType}`
      );
      return null;
  }
}

function deserializeNode(data: SerializedNode): blueprint.Node | null {
  const base = {
    id: data.id,
    name: data.name ?? data.id,
    position: data.position ?? { x: 100, y: 100 },
  };

  switch (data.type) {
    case 'render':
      return deserializeRenderNode(data, base);
    case 'compute':
      return deserializeComputeNode(data, base);
    case 'buffer':
      return deserializeBufferNode(data, base);
    case 'texture':
      return deserializeTextureNode(data, base);
    case 'sampler':
      return deserializeSamplerNode(data, base);
    case 'connection':
      return deserializeConnectionNode(data, base);
    default:
      const unknownData = data as { type: string };
      console.warn(`ignoring unrecognized node type: ${unknownData.type}`);
      return null;
  }
}

function deserializeShader(data: SerializedShader): blueprint.Shader {
  return {
    id: data.id,
    name: data.name ?? data.id,
    code: data.code ?? '',
  };
}

export function deserializeBlueprint(
  serialized: SerializedBlueprint
): blueprint.Blueprint {
  const blueprint: blueprint.Blueprint = { nodes: {}, shaders: {} };
  for (const node of serialized.nodes) {
    const deserialized = deserializeNode(node);
    if (deserialized !== null) {
      blueprint.nodes[deserialized.id] = deserialized;
    }
  }
  for (const shader of serialized.shaders) {
    blueprint.shaders[shader.id] = deserializeShader(shader);
  }
  return blueprint;
}

interface SerializationOptions {
  serializeBlobs?: boolean;
}

type SerializedNodeBaseData = Omit<SerializedNodeBase, 'type'>;

function serializeRenderNode(
  node: blueprint.RenderNode,
  base: SerializedNodeBaseData
): SerializedRenderNode {
  return {
    ...base,
    type: 'render',
    vertexShader: node.vertexShader,
    vertexEntryPoint: node.vertexEntryPoint,
    fragmentShader: node.fragmentShader,
    fragmentEntryPoint: node.fragmentEntryPoint,
    topology: node.topology,
    indexed: node.indexed,
    numVertices: node.numVertices,
    numInstances: node.numInstances,
    clear: node.clear,
    clearColor: node.clearColor,
    depthTest: node.depthTest,
  };
}

function serializeComputeNode(
  node: blueprint.ComputeNode,
  base: SerializedNodeBaseData
): SerializedComputeNode {
  return {
    ...base,
    type: 'compute',
    shader: node.shader,
    entryPoint: node.entryPoint,
    dispatchSize: { ...node.dispatchSize },
  };
}

function serializeBufferNode(
  node: blueprint.BufferNode,
  base: SerializedNodeBaseData
): SerializedBufferNode {
  return {
    ...base,
    type: 'buffer',
    size: node.size,
    init: node.init,
  };
}

async function serializeTextureNode(
  node: blueprint.TextureNode,
  base: SerializedNodeBaseData,
  options?: SerializationOptions
): Promise<SerializedTextureNode> {
  let imageData: Blob | string | null = null;
  if (node.imageData instanceof Blob) {
    if (options?.serializeBlobs) {
      imageData = fromByteArray(
        new Uint8Array(await node.imageData.arrayBuffer())
      );
    } else {
      imageData = node.imageData;
    }
  }

  return {
    ...base,
    type: 'texture',
    imageData,
    size: node.size,
    format: node.format,
    mipLevelCount: node.mipLevelCount,
    sampleCount: node.sampleCount,
  };
}

function serializeSamplerNode(
  node: blueprint.SamplerNode,
  base: SerializedNodeBaseData
): SerializedSamplerNode {
  return {
    ...base,
    type: 'sampler',
  };
}

type SerializedBindingBaseData = Omit<SerializedBindingNodeBase, 'bindingType'>;

function serializeBufferBindingNode(
  node: blueprint.BufferBindingNode,
  baseBinding: SerializedBindingBaseData
): SerializedBufferBindingNode {
  return {
    ...baseBinding,
    bindingType: 'buffer',
    storageType: node.storageType,
  };
}

function serializeTextureBindingNode(
  node: blueprint.TextureBindingNode,
  baseBinding: SerializedBindingBaseData
): SerializedTextureBindingNode {
  return {
    ...baseBinding,
    bindingType: 'texture',
  };
}

function serializeSamplerBindingNode(
  node: blueprint.SamplerBindingNode,
  baseBinding: SerializedBindingBaseData
): SerializedSamplerBindingNode {
  return {
    ...baseBinding,
    bindingType: 'sampler',
  };
}

type SerializedConnectionBaseData = Omit<
  SerializedConnectionNodeBase,
  'connectionType'
>;

function serializeBindingNode(
  node: blueprint.BindingNode,
  baseConnection: SerializedConnectionBaseData
): SerializedBindingNode {
  const baseBinding: SerializedBindingBaseData = {
    ...baseConnection,
    connectionType: 'binding',
    group: node.group,
    binding: node.binding,
  };
  switch (node.bindingType) {
    case 'buffer':
      return serializeBufferBindingNode(node, baseBinding);
    case 'texture':
      return serializeTextureBindingNode(node, baseBinding);
    case 'sampler':
      return serializeSamplerBindingNode(node, baseBinding);
  }
}

function serializeConnectionNode(
  node: blueprint.ConnectionNode,
  base: SerializedNodeBaseData
): SerializedConnectionNode {
  const baseConnection: SerializedConnectionBaseData = {
    ...base,
    type: 'connection',
    source: node.source,
    target: node.target,
  };
  switch (node.connectionType) {
    case 'binding':
      return serializeBindingNode(node, baseConnection);
    case 'queue':
      return { ...baseConnection, connectionType: 'queue' };
  }
}

async function serializeNode(
  node: blueprint.Node,
  options?: SerializationOptions
): Promise<SerializedNode> {
  const base: SerializedNodeBaseData = {
    id: node.id,
    name: node.name,
    position: node.position,
  };

  switch (node.type) {
    case 'render':
      return serializeRenderNode(node, base);
    case 'compute':
      return serializeComputeNode(node, base);
    case 'buffer':
      return serializeBufferNode(node, base);
    case 'texture':
      return serializeTextureNode(node, base, options);
    case 'sampler':
      return serializeSamplerNode(node, base);
    case 'connection':
      return serializeConnectionNode(node, base);
  }
}

function serializeShader(shader: blueprint.Shader): SerializedShader {
  return {
    id: shader.id,
    name: shader.name,
    code: shader.code,
  };
}

export async function serializeBlueprint(
  blueprint: blueprint.Blueprint,
  options?: SerializationOptions
): Promise<SerializedBlueprint> {
  const nodes = await Promise.all(
    Array.from(Object.values(blueprint.nodes)).map(
      async node => await serializeNode(node, options)
    )
  );
  const shaders = Array.from(Object.values(blueprint.shaders)).map(shader =>
    serializeShader(shader)
  );
  return { version: 1, nodes, shaders };
}
