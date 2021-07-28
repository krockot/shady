import { UniformLayout } from './UniformLayout';

export const BUILTIN_UNIFORMS_WGSL = `[[block]] struct BuiltinUniforms {
  time: f32;
  timeDelta: f32;
  frame: u32;
  [[align(16)]] resolution: vec2<u32>;
};

[[group(0), binding(0)]] var<uniform> builtinUniforms: BuiltinUniforms;

`;

export const BUILTIN_UNIFORMS: UniformLayout = {
  fields: [
    { name: 'time', type: 'f32' },
    { name: 'timeDelta', type: 'f32' },
    { name: 'frame', type: 'u32' },
    { name: 'resolution', type: { vectorType: 'vec2', componentType: 'u32' } },
  ],
};
