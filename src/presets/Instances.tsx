import { Blueprint } from '../gpu/Blueprint';

const VERTEX = `[[stage(vertex)]]
fn main([[builtin(vertex_index)]] index: u32,
        [[builtin(instance_index)]] instance: u32)
    -> [[builtin(position)]] vec4<f32> {
  let t = builtinUniforms.time * 6.283 / 2.0;
  let b = 1.0 + f32(instance / 10u) * 0.5;
  let k = 0.5 + cos(t * 3.0) * 0.2;
  let c = k * cos(t);
  let s = k * sin(t);
  let xo = cos(f32(instance) * 6.283 / 10.0) * 0.5 * b;
  let yo = sin(f32(instance) * 6.283 / 10.0) * 0.5 * b;
  let x = select(-1.0, 1.0, index >= 1u && index <= 3u) * 0.3;
  let y = select(-1.0, 1.0, index >= 2u && index <= 4u) * 0.3;
  return vec4<f32>(x * c - y * s + xo, x * s + y * c + yo, 0.0, 1.0);
}
`;

const FRAGMENT = `[[stage(fragment)]]
fn main([[builtin(position)]] coord: vec4<f32>)
    -> [[location(0)]] vec4<f32> {
  let uv = coord.xy / vec2<f32>(builtinUniforms.resolution.xy);
  let col = 0.5 + 0.5 * cos(builtinUniforms.time + uv.xyx + vec3<f32>(0.0, 20.0, 40.0));
  return vec4<f32>(col, 1.0);
}
`;

export const INSTANCES: Blueprint = {
  nodes: {
    render1: {
      id: 'render1',
      name: 'render quad',
      position: { x: 100, y: 100 },
      type: 'render',
      indexed: false,
      numVertices: 6,
      numInstances: 30,
      vertexShader: 'vertex1',
      vertexEntryPoint: 'main',
      fragmentShader: 'fragment1',
      fragmentEntryPoint: 'main',
    },
  },
  shaders: {
    vertex1: {
      id: 'vertex1',
      name: 'Vertex',
      code: VERTEX,
    },
    fragment1: {
      id: 'fragment1',
      name: 'Fragment',
      code: FRAGMENT,
    },
  },
};
