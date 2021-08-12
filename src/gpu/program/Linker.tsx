import {
  Blueprint,
  ComputeNodeDescriptor,
  NodeID,
  RenderNodeDescriptor,
} from '../Blueprint';
import { CompiledResourceBundle } from './CompiledResourceBundle';
import {
  LinkedComputePass,
  LinkedPass,
  LinkedRenderPass,
  Executable,
} from './Executable';
import { BindGroupEntry, PassNode } from './ProgramMap';

interface LinkedBindings {
  pipelineLayout: GPUPipelineLayout;
  bindGroups: GPUBindGroup[];
}

function getResourceForBinding(
  entry: BindGroupEntry,
  resources: CompiledResourceBundle
): null | GPUBindingResource {
  const node = entry.node;
  switch (node.type) {
    case 'buffer':
      const buffer = resources.buffers.get(node.id);
      if (!buffer) {
        console.warn(`unable to bind missing buffer ${node.name}`);
        return null;
      }
      return { buffer: buffer.buffer };

    case 'texture':
      const texture = resources.textures.get(node.id);
      if (!texture) {
        console.warn(`unable to bind missing texture ${node.name}`);
        return null;
      }
      return texture.texture.createView();

    case 'sampler':
      const sampler = resources.samplers.get(node.id);
      if (!sampler) {
        console.warn(`unable to bind missing sampler ${node.name}`);
        return null;
      }
      return sampler.sampler;
  }
}

function linkBindings(
  passId: NodeID,
  device: GPUDevice,
  resources: CompiledResourceBundle,
  visibility: GPUShaderStageFlags,
  builtinUniforms: GPUBuffer
): LinkedBindings {
  const groups = resources.programMap!.bindings.get(passId) ?? [];
  const layoutEntries: GPUBindGroupLayoutEntry[][] = [];
  const groupEntries: GPUBindGroupEntry[][] = [];
  for (const group of groups) {
    const newLayoutEntries: GPUBindGroupLayoutEntry[] = [];
    const newGroupEntries: GPUBindGroupEntry[] = [];
    for (const entry of group.values()) {
      const resource = getResourceForBinding(entry, resources);
      if (!resource) {
        continue;
      }

      newLayoutEntries.push(entry.layoutEntry);
      newGroupEntries.push({
        binding: entry.layoutEntry.binding,
        resource,
      });
    }
    layoutEntries.push(newLayoutEntries);
    groupEntries.push(newGroupEntries);
  }

  if (layoutEntries.length === 0) {
    layoutEntries.push([]);
    groupEntries.push([]);
  }

  layoutEntries[0].unshift({
    binding: 0,
    visibility,
    buffer: { type: 'uniform' },
  });
  groupEntries[0].unshift({
    binding: 0,
    resource: { buffer: builtinUniforms },
  });

  const bindGroupLayouts: GPUBindGroupLayout[] = [];
  const bindGroups: GPUBindGroup[] = [];
  layoutEntries.forEach((entries, i) => {
    const layout = device.createBindGroupLayout({ entries });
    bindGroupLayouts.push(layout);
    bindGroups.push(
      device.createBindGroup({
        layout,
        entries: groupEntries[i],
      })
    );
  });

  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts });
  return { pipelineLayout, bindGroups };
}

function linkRenderPass(
  device: GPUDevice,
  id: NodeID,
  node: RenderNodeDescriptor,
  builtinUniforms: GPUBuffer,
  outputFormat: GPUTextureFormat,
  resources: CompiledResourceBundle,
  blueprint: Blueprint
): null | LinkedRenderPass {
  if (resources.programMap === null) {
    return null;
  }

  const vertexDescriptor = blueprint.shaders[node.vertexShader];
  const fragmentDescriptor = blueprint.shaders[node.fragmentShader];
  if (!vertexDescriptor || !fragmentDescriptor) {
    return null;
  }
  const vertexShader = resources.shaders.get(vertexDescriptor.id);
  const fragmentShader = resources.shaders.get(fragmentDescriptor.id);
  if (
    !vertexShader ||
    !fragmentShader ||
    !vertexShader.module ||
    !fragmentShader.module
  ) {
    return null;
  }

  const bindings = linkBindings(
    id,
    device,
    resources,
    GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
    builtinUniforms
  );
  const topology = node.topology ?? 'triangle-list';
  const stripIndexFormat =
    topology === 'line-strip' || topology === 'triangle-strip'
      ? 'uint32'
      : undefined;
  const pipeline = device.createRenderPipeline({
    layout: bindings.pipelineLayout,
    vertex: {
      module: vertexShader.module,
      entryPoint: node.vertexEntryPoint,
    },
    primitive: {
      topology,
      stripIndexFormat,
      cullMode: 'none',
    },
    fragment: {
      targets: [{ format: outputFormat }],
      module: fragmentShader.module,
      entryPoint: node.fragmentEntryPoint,
    },
    depthStencil: {
      format: 'depth24plus-stencil8',
      depthWriteEnabled: true,
      depthCompare: node.depthTest ?? 'always',
    },
  });
  const encoder = device.createRenderBundleEncoder({
    colorFormats: [outputFormat],
    depthStencilFormat: 'depth24plus-stencil8',
  });
  encoder.setPipeline(pipeline);
  bindings.bindGroups.forEach((group, i) => {
    if (group) {
      encoder.setBindGroup(i, group);
    }
  });
  encoder.draw(node.numVertices, node.numInstances);
  return {
    type: 'render',
    descriptor: node,
    bundle: encoder.finish(),
  };
}

function linkComputePass(
  device: GPUDevice,
  id: NodeID,
  node: ComputeNodeDescriptor,
  builtinUniforms: GPUBuffer,
  resources: CompiledResourceBundle,
  blueprint: Blueprint
): null | LinkedComputePass {
  if (resources.programMap === null) {
    return null;
  }

  const shaderDescriptor = blueprint.shaders[node.shader];
  if (!shaderDescriptor) {
    return null;
  }
  const shader = resources.shaders.get(shaderDescriptor.id);
  if (!shader || !shader.module) {
    return null;
  }

  const bindings = linkBindings(
    id,
    device,
    resources,
    GPUShaderStage.COMPUTE,
    builtinUniforms
  );
  const pipeline = device.createComputePipeline({
    layout: bindings.pipelineLayout,
    compute: {
      module: shader.module,
      entryPoint: node.entryPoint,
    },
  });
  return {
    type: 'compute',
    descriptor: node,
    bindGroups: bindings.bindGroups,
    pipeline,
  };
}

function linkPass(
  device: GPUDevice,
  id: NodeID,
  node: PassNode,
  builtinUniforms: GPUBuffer,
  outputFormat: GPUTextureFormat,
  resources: CompiledResourceBundle,
  blueprint: Blueprint
): null | LinkedPass {
  if (node.type === 'render') {
    return linkRenderPass(
      device,
      id,
      node,
      builtinUniforms,
      outputFormat,
      resources,
      blueprint
    );
  }
  return linkComputePass(
    device,
    id,
    node,
    builtinUniforms,
    resources,
    blueprint
  );
}

export function linkProgram(
  device: GPUDevice,
  builtinUniforms: GPUBuffer,
  outputFormat: GPUTextureFormat,
  resources: CompiledResourceBundle,
  blueprint: Blueprint
): null | Executable {
  if (resources.programMap === null) {
    return null;
  }

  const passes = resources.programMap.passes;
  const linkedPasses = resources.programMap.passOrder.map(id =>
    linkPass(
      device,
      id,
      passes.get(id)!,
      builtinUniforms,
      outputFormat,
      resources,
      blueprint
    )
  );
  return new Executable(
    device,
    linkedPasses.filter(pass => pass !== null) as LinkedPass[]
  );
}
