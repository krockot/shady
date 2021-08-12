import { deepCopy } from '../../base/Util';
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

interface QueueDeps {
  // Maps each pass ID to the set of pass IDs which depend upon it.
  incoming: Map<string, Set<string>>;

  // Maps each pass ID to the set of pass IDs on which it depends.
  outgoing: Map<string, Set<string>>;
}

export class ProgramMap {
  public readonly blueprint: Blueprint;
  public readonly shaders: ShaderMap;
  public readonly buffers: BufferMap;
  public readonly textures: TextureMap;
  public readonly samplers: SamplerMap;
  public readonly passes: PassMap;
  public readonly bindings: BindingsMap;
  public readonly bufferUsage: BufferUsageMap;
  public readonly textureUsage: TextureUsageMap;
  public readonly passOrder: string[];

  constructor(blueprint: Blueprint) {
    this.blueprint = deepCopy(blueprint);
    this.shaders = new Map(
      Object.values(this.blueprint.shaders).map(s => [s.uuid, s])
    );
    this.buffers = new Map();
    this.textures = new Map();
    this.samplers = new Map();
    this.passes = new Map();
    this.bindings = new Map();
    this.bufferUsage = new Map();
    this.textureUsage = new Map();
    this.passOrder = [];
    this.populate_();
  }

  populate_() {
    const bindingNodes = [];
    const queueDeps = { incoming: new Map(), outgoing: new Map() };
    for (const [id, node] of Object.entries(this.blueprint.nodes)) {
      switch (node.type) {
        case 'buffer':
          this.buffers.set(node.uuid, node);
          break;

        case 'texture':
          this.textures.set(node.uuid, node);
          break;

        case 'sampler':
          this.samplers.set(node.uuid, node);
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
          this.passes.set(id, node);
          break;

        case 'render':
          this.passes.set(id, node);
          break;

        default:
          break;
      }
    }

    this.populateBindings_(bindingNodes);
    this.computePassOrder_(queueDeps);
  }

  populateBindings_(bindingNodes: BindingNodeDescriptor[]) {
    for (const node of bindingNodes) {
      const pass = this.passes.get(node.target);
      if (!pass) {
        console.warn(`ignoring unknown pass: ${node.target}`);
        continue;
      }
      if (node.group >= kMaxBindGroups) {
        console.warn(`invalid bind group ${node.group}`);
        continue;
      }
      let groups = this.bindings.get(node.target);
      if (!groups) {
        groups = [];
        this.bindings.set(node.target, groups);
      }

      const bindingNode = this.blueprint.nodes[node.source];
      if (!bindingNode || bindingNode.type !== node.bindingType) {
        console.warn(`ignoring unknown binding source ${node.source}`);
        continue;
      }
      switch (node.bindingType) {
        case 'buffer':
          const buffer = this.buffers.get(bindingNode.uuid);
          if (!buffer) {
            console.warn(`ignoring unknown buffer: ${node.source}`);
            continue;
          }
          this.compileBufferBinding_(pass.type, groups, buffer, node);
          break;

        case 'texture':
          const texture = this.textures.get(bindingNode.uuid);
          if (!texture) {
            console.warn(`ignoring unknown texture: ${node.source}`);
            continue;
          }
          this.compileTextureBinding_(pass.type, groups, texture, node);
          break;

        case 'sampler':
          const sampler = this.samplers.get(bindingNode.uuid);
          if (!sampler) {
            console.warn(`ignoring unknown sampler: ${node.source}`);
            continue;
          }
          this.compileSamplerBinding_(pass.type, groups, sampler, node);
          break;
      }
    }
  }

  computePassOrder_(queueDeps: QueueDeps) {
    // The initial working set is the set of all passes with no incoming queue
    // dependencies.
    const startNodes: Set<string> = new Set(this.passes.keys());
    for (const target of queueDeps.incoming.keys()) {
      startNodes.delete(target);
    }

    // Iteratively append nodes as their dependencies are met.
    let thisPhase = Array.from(startNodes);
    while (thisPhase.length !== 0) {
      this.passOrder.push(...thisPhase);
      const nextPhase: string[] = [];
      for (const added of thisPhase) {
        const targets = queueDeps.outgoing.get(added);
        if (!targets) {
          continue;
        }
        for (const target of targets.values()) {
          const incomingDeps = queueDeps.incoming.get(target);
          if (incomingDeps) {
            incomingDeps.delete(added);
            if (incomingDeps.size === 0) {
              nextPhase.push(target);
            }
          }
        }
      }
      thisPhase = nextPhase;
    }
  }

  compileBufferBinding_(
    passType: PassType,
    groups: BindGroup[],
    buffer: BufferNodeDescriptor,
    binding: BufferBindingNodeDescriptor
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

    this.bufferUsage.set(
      buffer.uuid,
      (this.bufferUsage.get(buffer.uuid) ?? 0) | newUsage
    );

    const layoutEntry: GPUBindGroupLayoutEntry = {
      binding: binding.binding,
      visibility: visibilityForPass(passType),
      buffer: { type: bufferType },
    };

    addBindGroupEntry(groups, binding.group, layoutEntry, buffer);
  }

  compileTextureBinding_(
    passType: PassType,
    groups: BindGroup[],
    texture: TextureNodeDescriptor,
    binding: TextureBindingNodeDescriptor
  ) {
    const layoutEntry: GPUBindGroupLayoutEntry = {
      binding: binding.binding,
      visibility: visibilityForPass(passType),
      texture: {},
    };

    addBindGroupEntry(groups, binding.group, layoutEntry, texture);
  }

  compileSamplerBinding_(
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
