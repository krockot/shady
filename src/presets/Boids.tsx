import { Blueprint } from '../gpu/Blueprint';

export const BOIDS: Blueprint = {
  nodes: {
    compute1: {
      name: 'first update',
      type: 'compute',
      position: {
        x: 223,
        y: 438,
      },
      shader: 'compute1',
      entryPoint: 'main',
      dispatchSize: {
        x: 2000,
        y: 1,
        z: 1,
      },
    },
    buffer1: {
      name: 'buffer1',
      type: 'buffer',
      position: {
        x: -55,
        y: -35,
      },
      size: 32000,
      init: 'random-floats',
    },
    buffer2: {
      name: 'buffer2',
      type: 'buffer',
      position: {
        x: 610,
        y: 19,
      },
      size: 32000,
      init: 'zero',
    },
    render1: {
      name: 'render boids',
      position: {
        x: -262,
        y: 374,
      },
      type: 'render',
      indexed: false,
      numVertices: 3,
      numInstances: 1000,
      vertexShader: 'vertex1',
      vertexEntryPoint: 'main',
      fragmentShader: 'fragment1',
      fragmentEntryPoint: 'main',
    },
    compute2: {
      name: 'update B',
      type: 'compute',
      position: {
        x: 658,
        y: 442,
      },
      shader: 'compute1',
      entryPoint: 'main',
      dispatchSize: {
        x: 1000,
        y: 1,
        z: 1,
      },
    },
    binding1a: {
      name: '',
      position: {
        x: 65,
        y: 210,
      },
      type: 'connection',
      connectionType: 'binding',
      bindingType: 'buffer',
      storageType: 'storage-read',
      group: 0,
      binding: 1,
      source: 'buffer1',
      target: 'compute1',
    },
    binding1b: {
      name: '',
      position: {
        x: -191,
        y: 140,
      },
      type: 'connection',
      connectionType: 'binding',
      bindingType: 'buffer',
      storageType: 'storage-read',
      group: 0,
      binding: 1,
      source: 'buffer1',
      target: 'render1',
    },
    binding2: {
      name: '',
      position: {
        x: 220,
        y: 218,
      },
      type: 'connection',
      connectionType: 'binding',
      bindingType: 'buffer',
      storageType: 'storage',
      group: 0,
      binding: 2,
      source: 'buffer1',
      target: 'compute2',
    },
    binding3: {
      name: '',
      position: {
        x: 713,
        y: 179,
      },
      type: 'connection',
      connectionType: 'binding',
      bindingType: 'buffer',
      storageType: 'storage-read',
      group: 0,
      binding: 1,
      source: 'buffer2',
      target: 'compute2',
    },
    binding4: {
      name: '',
      position: {
        x: 566,
        y: 181,
      },
      type: 'connection',
      connectionType: 'binding',
      bindingType: 'buffer',
      storageType: 'storage',
      group: 0,
      binding: 2,
      source: 'buffer2',
      target: 'compute1',
    },
    queue1: {
      position: {
        x: 100,
        y: 100,
      },
      source: 'render1',
      target: 'compute1',
      type: 'connection',
      // @ts-ignore
      connectionType: 'queue',
    },
    queue2: {
      position: {
        x: 100,
        y: 100,
      },
      source: 'compute1',
      target: 'compute2',
      type: 'connection',
      // @ts-ignore
      connectionType: 'queue',
    },
  },
  shaders: {
    compute1: {
      name: 'compute',
      code: 'let kRule1Distance = 0.1;\nlet kRule2Distance = 0.025;\nlet kRule3Distance = 0.025;\nlet kRule1Scale = 0.02;\nlet kRule2Scale = 0.05;\nlet kRule3Scale = 0.005;\nlet kNumParticles = 2000u;\n\nstruct Particle {\n  pos: vec2<f32>;\n  vel: vec2<f32>;\n};\n\n[[block]] struct Particles {\n  particles: array<Particle>;\n};\n\n[[group(0), binding(1)]] var<storage, read> particlesA: Particles;\n[[group(0), binding(2)]] var<storage, read_write> particlesB: Particles;\n\n[[stage(compute), workgroup_size(1)]]\nfn main([[builtin(global_invocation_id)]] id: vec3<u32>) {\n  let index = id.x;\n  if (index >= kNumParticles) {\n    return;\n  }\n\n  var vPos = particlesA.particles[index].pos;\n  var vVel = particlesA.particles[index].vel;\n  var cMass = vec2<f32>(0.0, 0.0);\n  var cVel = vec2<f32>(0.0, 0.0);\n  var colVel = vec2<f32>(0.0, 0.0);\n  var cMassCount = 0u;\n  var cVelCount = 0u;\n  var pos: vec2<f32>;\n  var vel: vec2<f32>;\n\n  for (var i = 0u; i < kNumParticles; i = i + 1u) {\n    if (i == index) {\n      continue;\n    }\n    pos = particlesA.particles[i].pos.xy;\n    vel = particlesA.particles[i].vel.xy;\n    if (distance(pos, vPos) < kRule1Distance) {\n      cMass = cMass + pos;\n      cMassCount = cMassCount + 1u;\n    }\n    if (distance(pos, vPos) < kRule2Distance) {\n      colVel = colVel - (pos - vPos);\n    }\n    if (distance(pos, vPos) < kRule3Distance) {\n      cVel = cVel + vel;\n      cVelCount = cVelCount + 1u;\n    }\n  }\n\n  if (cMassCount > 0u) {\n    cMass = (cMass / vec2<f32>(f32(cMassCount), f32(cMassCount))) - vPos;\n  }\n\n  if (cVelCount > 0u) {\n    cVel = cVel / vec2<f32>(f32(cVelCount), f32(cVelCount));\n  }\n\n  vVel = vVel + (cMass * kRule1Scale) + (colVel * kRule2Scale) +\n      (cVel * kRule3Scale);\n\n  vVel = normalize(vVel) * clamp(length(vVel), 0.0, 1.0);\n  vPos = vPos + (vVel * builtinUniforms.timeDelta * 0.25);\n\n  if (vPos.x < -1.0) {\n    vPos.x = vPos.x + 2.0;\n  }\n  if (vPos.x > 1.0) {\n    vPos.x = vPos.x - 2.0;\n  }\n  if (vPos.y < -1.0) {\n    vPos.y = vPos.y + 2.0;\n  }\n  if (vPos.y > 1.0) {\n    vPos.y = vPos.y - 2.0;\n  }\n\n  particlesB.particles[index].pos = vPos;\n  particlesB.particles[index].vel = vVel;\n}\n',
    },
    vertex1: {
      name: 'vertex',
      code: 'struct Particle {\n  particlePos: vec2<f32>;\n  particleVel: vec2<f32>;\n};\n\n[[block]] struct Particles {\n  particles: array<Particle>;\n};\n\n[[group(0), binding(1)]] var<storage, read> particles: Particles;\n\nfn getPos(vid: u32) -> vec2<f32> {\n  return select(\n      vec2<f32>(-0.01, -0.02),\n      select(vec2<f32>(0.01, -0.02), vec2<f32>(0.00, 0.02), vid >= 2u),\n      vid >= 1u);\n}\n\n[[stage(vertex)]]\nfn main([[builtin(vertex_index)]] vid: u32,\n        [[builtin(instance_index)]] id: u32)\n    -> [[builtin(position)]] vec4<f32> {\n  let angle = -atan2(particles.particles[id].particleVel.x, particles.particles[id].particleVel.y);\n  let ppos = getPos(vid);\n  let pos = vec2<f32>(ppos.x * cos(angle) - ppos.y * sin(angle),\n                      ppos.x * sin(angle) + ppos.y * cos(angle));\n  return vec4<f32>(pos + particles.particles[id].particlePos, 0.0, 1.0);\n}\n',
    },
    fragment1: {
      name: 'fragment',
      code: '[[stage(fragment)]]\nfn main() -> [[location(0)]] vec4<f32> {\n  return vec4<f32>(0.0, 1.0, 0.0, 1.0);\n}\n',
    },
  },
};
