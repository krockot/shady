import { Blueprint } from '../gpu/Blueprint';

const VERTEX = `[[stage(vertex)]]
fn main([[builtin(vertex_index)]] index: u32)
    -> [[builtin(position)]] vec4<f32> {
  let x = select(-1.0, 1.0, index >= 1u && index <= 3u);
  let y = select(-1.0, 1.0, index >= 2u && index <= 4u);
  return vec4<f32>(x, y, 0.0, 1.0);
}
`;

const FRAGMENT = `[[stage(fragment)]]
fn main([[builtin(position)]] coord: vec4<f32>)
    -> [[location(0)]] vec4<f32> {
  let uv = coord.xy / vec2<f32>(builtinUniforms.resolution.xy);
  let col = 0.5 + 0.5 * cos(builtinUniforms.time + uv.xyx +
                            vec3<f32>(0.0, 20.0, 40.0));
  return vec4<f32>(col, 1.0);
}
`;

export const BASIC: Blueprint = {
  nodes: {
    render1: {
      name: 'render quad',
      position: { x: 100, y: 100 },
      type: 'render',
      indexed: false,
      numVertices: 6,
      numInstances: 1,
      vertexShader: 'vertex1',
      vertexEntryPoint: 'main',
      fragmentShader: 'fragment1',
      fragmentEntryPoint: 'main',
      bindings: [],
    },
  },
  shaders: {
    vertex1: {
      name: 'Vertex',
      code: VERTEX,
    },
    fragment1: {
      name: 'Fragment',
      code: FRAGMENT,
    },
  },
};
