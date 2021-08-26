import { deepCopy } from '../../base/util';
import {
  Blueprint,
  BindingNode,
  BufferBindingNode,
  BufferNode,
  ComputeNode,
  NodeID,
  RenderNode,
  SamplerBindingNode,
  SamplerNode,
  Shader,
  TextureBindingNode,
  TextureNode,
} from '../blueprint';

// TODO: This should be devised dynamically from device limits.
const kMaxBindGroups = 4;

export type PassNode = RenderNode | ComputeNode;

export type ShaderMap = Map<NodeID, Shader>;
export type BufferMap = Map<NodeID, BufferNode>;
export type TextureMap = Map<NodeID, TextureNode>;
export type SamplerMap = Map<NodeID, SamplerNode>;
export type PassMap = Map<NodeID, PassNode>;

export type BindableNode = BufferNode | TextureNode | SamplerNode;

export interface BindGroupEntry {
  layoutEntry: GPUBindGroupLayoutEntry;
  node: BindableNode;
}

export type BindGroup = Map<number, BindGroupEntry>;
export type BindingsMap = Map<NodeID, BindGroup[]>;

export type PassType = 'render' | 'compute';

export type BufferUsageMap = Map<NodeID, GPUBufferUsageFlags>;
export type TextureUsageMap = Map<NodeID, GPUTextureUsageFlags>;

interface QueueDeps {
  // Maps each pass ID to the set of pass IDs which depend upon it.
  incoming: Map<NodeID, Set<NodeID>>;

  // Maps each pass ID to the set of pass IDs on which it depends.
  outgoing: Map<NodeID, Set<NodeID>>;
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
  public readonly passOrder: NodeID[];

  constructor(blueprint: Blueprint) {
    this.blueprint = deepCopy(blueprint);
    this.shaders = new Map(
      Object.values(this.blueprint.shaders).map(s => [s.id, s])
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
          this.buffers.set(id, node);
          break;

        case 'texture':
          this.textures.set(id, node);
          break;

        case 'sampler':
          this.samplers.set(id, node);
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

  populateBindings_(bindingNodes: BindingNode[]) {
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
          const buffer = this.buffers.get(bindingNode.id);
          if (!buffer) {
            console.warn(`ignoring unknown buffer: ${node.source}`);
            continue;
          }
          this.compileBufferBinding_(pass.type, groups, buffer, node);
          break;

        case 'texture':
          const texture = this.textures.get(bindingNode.id);
          if (!texture) {
            console.warn(`ignoring unknown texture: ${node.source}`);
            continue;
          }
          this.compileTextureBinding_(pass.type, groups, texture, node);
          break;

        case 'sampler':
          const sampler = this.samplers.get(bindingNode.id);
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
    const startNodes: Set<NodeID> = new Set(this.passes.keys());
    for (const target of queueDeps.incoming.keys()) {
      startNodes.delete(target);
    }

    // Iteratively append nodes as their dependencies are met.
    let thisPhase = Array.from(startNodes);
    while (thisPhase.length !== 0) {
      this.passOrder.push(...thisPhase);
      const nextPhase: NodeID[] = [];
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
    buffer: BufferNode,
    binding: BufferBindingNode
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
      buffer.id,
      (this.bufferUsage.get(buffer.id) ?? 0) | newUsage
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
    texture: TextureNode,
    binding: TextureBindingNode
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
    sampler: SamplerNode,
    binding: SamplerBindingNode
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
