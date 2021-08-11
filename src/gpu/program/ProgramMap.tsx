import {
  Blueprint,
  BindingNodeDescriptor,
  BufferBindingNodeDescriptor,
  BufferNodeDescriptor,
  ComputeNodeDescriptor,
  RenderNodeDescriptor,
  SamplerBindingNodeDescriptor,
  SamplerNodeDescriptor,
  ShaderDescriptor,
  TextureBindingNodeDescriptor,
  TextureNodeDescriptor,
} from '../Blueprint';

// TODO: This should be devised dynamically from device limits.
const kMaxBindGroups = 4;

export type PassNode = RenderNodeDescriptor | ComputeNodeDescriptor;

export type ShaderMap = Map<string, ShaderDescriptor>;
export type BufferMap = Map<string, BufferNodeDescriptor>;
export type TextureMap = Map<string, TextureNodeDescriptor>;
export type SamplerMap = Map<string, SamplerNodeDescriptor>;
export type PassMap = Map<string, PassNode>;

export type BindableNode =
  | BufferNodeDescriptor
  | TextureNodeDescriptor
  | SamplerNodeDescriptor;

export interface BindGroupEntry {
  layoutEntry: GPUBindGroupLayoutEntry;
  node: BindableNode;
}

export type BindGroup = Map<number, BindGroupEntry>;
export type BindingsMap = Map<string, BindGroup[]>;

export type PassType = 'render' | 'compute';

export type BufferUsageMap = Map<string, GPUBufferUsageFlags>;
export type TextureUsageMap = Map<string, GPUTextureUsageFlags>;

export interface ProgramMap {
  shaders: ShaderMap;
  buffers: BufferMap;
  textures: TextureMap;
  samplers: SamplerMap;
  passes: PassMap;
  bindings: BindingsMap;
  passOrder: string[];
  bufferUsage: BufferUsageMap;
  textureUsage: TextureUsageMap;
}

interface QueueDeps {
  // Maps each pass ID to the set of pass IDs which depend upon it.
  incoming: Map<string, Set<string>>;

  // Maps each pass ID to the set of pass IDs on which it depends.
  outgoing: Map<string, Set<string>>;
}

export function generateProgramMap(blueprint: Blueprint): ProgramMap {
  const shaders: ShaderMap = new Map(
    Object.values(blueprint.shaders).map(shader => [shader.uuid, shader])
  );
  const buffers: BufferMap = new Map();
  const textures: TextureMap = new Map();
  const samplers: SamplerMap = new Map();
  const passes: PassMap = new Map();
  const bindingNodes: BindingNodeDescriptor[] = [];
  const bindings: BindingsMap = new Map();
  const bufferUsage: BufferUsageMap = new Map();
  const textureUsage: TextureUsageMap = new Map();
  const queueDeps: QueueDeps = { incoming: new Map(), outgoing: new Map() };

  // First phase sorts all nodes into buckets by type and indexed by ID/UUID and
  // produces a map of queue dependencies.
  for (const [id, node] of Object.entries(blueprint.nodes)) {
    switch (node.type) {
      case 'buffer':
        buffers.set(node.uuid, node);
        break;

      case 'texture':
        textures.set(node.uuid, node);
        break;

      case 'sampler':
        samplers.set(node.uuid, node);
        break;

      case 'connection':
        switch (node.connectionType) {
          case 'binding':
            bindingNodes.push(node);
            break;

          case 'queue':
            const incoming = queueDeps.incoming.get(node.target) ?? new Set();
            const outgoing = queueDeps.outgoing.get(node.source) ?? new Set();
            incoming.add(node.source);
            outgoing.add(node.target);
            queueDeps.incoming.set(node.target, incoming);
            queueDeps.outgoing.set(node.source, outgoing);
            break;
        }
        break;

      case 'compute':
        passes.set(id, node);
        break;

      case 'render':
        passes.set(id, node);
        break;

      default:
        break;
    }
  }

  // Second pass processes bindings to produce complete bind-group layouts for
  // every pass, with computed visibility, usage flags, etc.
  for (const node of bindingNodes) {
    const pass = passes.get(node.target);
    if (!pass) {
      console.warn(`ignoring unknown pass: ${node.target}`);
      continue;
    }
    if (node.group >= kMaxBindGroups) {
      console.warn(`invalid bind group ${node.group}`);
      continue;
    }
    let groups = bindings.get(node.target);
    if (!groups) {
      groups = [];
      bindings.set(node.target, groups);
    }

    const bindingNode = blueprint.nodes[node.source];
    if (!bindingNode || bindingNode.type !== node.bindingType) {
      console.warn(`ignoring unknown binding source ${node.source}`);
      continue;
    }
    switch (node.bindingType) {
      case 'buffer':
        const buffer = buffers.get(bindingNode.uuid);
        if (!buffer) {
          console.warn(`ignoring unknown buffer: ${node.source}`);
          continue;
        }
        compileBufferBinding(pass.type, groups, buffer, node, bufferUsage);
        break;

      case 'texture':
        const texture = textures.get(bindingNode.uuid);
        if (!texture) {
          console.warn(`ignoring unknown texture: ${node.source}`);
          continue;
        }
        compileTextureBinding(pass.type, groups, texture, node, textureUsage);
        break;

      case 'sampler':
        const sampler = samplers.get(bindingNode.uuid);
        if (!sampler) {
          console.warn(`ignoring unknown sampler: ${node.source}`);
          continue;
        }
        compileSamplerBinding(pass.type, groups, sampler, node);
        break;
    }
  }

  const passOrder = computePassOrder(passes, queueDeps);

  return {
    shaders,
    buffers,
    textures,
    samplers,
    passes,
    bindings,
    passOrder,
    bufferUsage,
    textureUsage,
  };
}

function addBindGroupEntry(
  groups: BindGroup[],
  group: number,
  layoutEntry: GPUBindGroupLayoutEntry,
  node: BindableNode
) {
  while (group >= groups.length) {
    groups.push(new Map());
  }
  const binding = layoutEntry.binding;
  const groupBindings = groups[group];
  if (groupBindings.has(binding)) {
    console.warn(`ignoring duplicate binding (${group}, ${binding})`);
    return;
  }
  groupBindings.set(binding, { layoutEntry, node });
}

function visibilityForPass(passType: PassType): GPUShaderStageFlags {
  if (passType === 'render') {
    return GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
  }
  return GPUShaderStage.COMPUTE;
}

function compileBufferBinding(
  passType: PassType,
  groups: BindGroup[],
  buffer: BufferNodeDescriptor,
  binding: BufferBindingNodeDescriptor,
  usageMap: BufferUsageMap
) {
  let newUsage = 0;
  let bufferType: GPUBufferBindingType;
  switch (binding.storageType) {
    case 'storage-read':
      newUsage = GPUBufferUsage.STORAGE;
      bufferType = 'read-only-storage';
      break;

    case 'storage':
      newUsage = GPUBufferUsage.STORAGE;
      bufferType = 'storage';
      break;

    case 'uniform':
      newUsage = GPUBufferUsage.UNIFORM;
      bufferType = 'uniform';
      break;
  }

  usageMap.set(buffer.uuid, (usageMap.get(buffer.uuid) ?? 0) | newUsage);

  const layoutEntry: GPUBindGroupLayoutEntry = {
    binding: binding.binding,
    visibility: visibilityForPass(passType),
    buffer: { type: bufferType },
  };

  addBindGroupEntry(groups, binding.group, layoutEntry, buffer);
}

function compileTextureBinding(
  passType: PassType,
  groups: BindGroup[],
  texture: TextureNodeDescriptor,
  binding: TextureBindingNodeDescriptor,
  usageMap: TextureUsageMap
) {
  const layoutEntry: GPUBindGroupLayoutEntry = {
    binding: binding.binding,
    visibility: visibilityForPass(passType),
    texture: {},
  };

  addBindGroupEntry(groups, binding.group, layoutEntry, texture);
}

function compileSamplerBinding(
  passType: PassType,
  groups: BindGroup[],
  sampler: SamplerNodeDescriptor,
  binding: SamplerBindingNodeDescriptor
) {
  const layoutEntry: GPUBindGroupLayoutEntry = {
    binding: binding.binding,
    visibility: visibilityForPass(passType),
    sampler: {},
  };

  addBindGroupEntry(groups, binding.group, layoutEntry, sampler);
}

function computePassOrder(passes: PassMap, queueDeps: QueueDeps): string[] {
  // The initial working set is the set of all passes with no incoming queue
  // dependencies.
  const startNodes: Set<string> = new Set(passes.keys());
  for (const target of Array.from(queueDeps.incoming.keys())) {
    startNodes.delete(target);
  }
  if (startNodes.size === 0) {
    return [];
  }

  // Iteratively append remaining nodes as their dependencies are met.
  const passOrder: string[] = [];
  let thisPhase = Array.from(startNodes);
  for (;;) {
    passOrder.push(...thisPhase);
    const nextPhase: string[] = [];
    for (const added of thisPhase) {
      const targets = queueDeps.outgoing.get(added);
      if (!targets) {
        continue;
      }
      for (const target of Array.from(targets.values())) {
        const incomingDeps = queueDeps.incoming.get(target);
        if (incomingDeps) {
          incomingDeps.delete(added);
          if (incomingDeps.size === 0) {
            nextPhase.push(target);
          }
        }
      }
    }
    if (nextPhase.length === 0) {
      return passOrder;
    }
    thisPhase = nextPhase;
  }
}
