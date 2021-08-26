import { UniformLayout } from './uniform_layout';

export const BUILTIN_UNIFORMS_WGSL = `// All shader sources are prefixed with the definitions below, providing a
// set of builtin uniform inputs which are updated by the application before
// each frame iteration.
[[block]] struct BuiltinUniforms {
  // The time in seconds since the application loaded.
  time: f32;

  // The time in seconds since the last frame iteration. Zero for the first
  // frame.
  timeDelta: f32;

  // The count of the current frame. The first frame is frame 0.
  frame: u32;

  // The resolution in pixels of the main output texture displayed by the app.
  [[align(16)]] resolution: vec2<u32>;
};

// All builtin uniforms are accessible to all shaders through this global.
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
