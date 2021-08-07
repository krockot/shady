import { Blueprint } from '../gpu/Blueprint';

const COMPUTE = `let kRule1Distance = 0.1;
let kRule2Distance = 0.025;
let kRule3Distance = 0.025;
let kRule1Scale = 0.02;
let kRule2Scale = 0.05;
let kRule3Scale = 0.005;
let kNumParticles = 1000u;

struct Particle {
  pos: vec2<f32>;
  vel: vec2<f32>;
};

[[block]] struct Particles {
  particles: array<Particle>;
};

[[group(0), binding(1)]] var<storage, read> particlesA: Particles;
[[group(0), binding(2)]] var<storage, read_write> particlesB: Particles;

[[stage(compute), workgroup_size(1)]]
fn main([[builtin(global_invocation_id)]] id: vec3<u32>) {
  let index = id.x;
  if (index >= kNumParticles) {
    return;
  }

  var vPos = particlesA.particles[index].pos;
  var vVel = particlesA.particles[index].vel;
  var cMass = vec2<f32>(0.0, 0.0);
  var cVel = vec2<f32>(0.0, 0.0);
  var colVel = vec2<f32>(0.0, 0.0);
  var cMassCount = 0u;
  var cVelCount = 0u;
  var pos: vec2<f32>;
  var vel: vec2<f32>;

  for (var i = 0u; i < kNumParticles; i = i + 1u) {
    if (i == index) {
      continue;
    }
    pos = particlesA.particles[i].pos.xy;
    vel = particlesA.particles[i].vel.xy;
    if (distance(pos, vPos) < kRule1Distance) {
      cMass = cMass + pos;
      cMassCount = cMassCount + 1u;
    }
    if (distance(pos, vPos) < kRule2Distance) {
      colVel = colVel - (pos - vPos);
    }
    if (distance(pos, vPos) < kRule3Distance) {
      cVel = cVel + vel;
      cVelCount = cVelCount + 1u;
    }
  }

  if (cMassCount > 0u) {
    cMass = (cMass / vec2<f32>(f32(cMassCount), f32(cMassCount))) - vPos;
  }

  if (cVelCount > 0u) {
    cVel = cVel / vec2<f32>(f32(cVelCount), f32(cVelCount));
  }

  vVel = vVel + (cMass * kRule1Scale) + (colVel * kRule2Scale) +
      (cVel * kRule3Scale);

  vVel = normalize(vVel) * clamp(length(vVel), 0.0, 1.0);
  vPos = vPos + (vVel * builtinUniforms.timeDelta * 0.25);

  if (vPos.x < -1.0) {
    vPos.x = vPos.x + 2.0;
  }
  if (vPos.x > 1.0) {
    vPos.x = vPos.x - 2.0;
  }
  if (vPos.y < -1.0) {
    vPos.y = vPos.y + 2.0;
  }
  if (vPos.y > 1.0) {
    vPos.y = vPos.y - 2.0;
  }

  particlesB.particles[index].pos = vPos;
  particlesB.particles[index].vel = vVel;
}
`;

const VERTEX = `struct Particle {
  particlePos: vec2<f32>;
  particleVel: vec2<f32>;
};

[[block]] struct Particles {
  particles: array<Particle>;
};

[[group(0), binding(1)]] var<storage, read> particles: Particles;

fn getPos(vid: u32) -> vec2<f32> {
  return select(
      vec2<f32>(-0.01, -0.02),
      select(vec2<f32>(0.01, -0.02), vec2<f32>(0.00, 0.02), vid >= 2u),
      vid >= 1u);
}

[[stage(vertex)]]
fn main([[builtin(vertex_index)]] vid: u32,
        [[builtin(instance_index)]] id: u32)
    -> [[builtin(position)]] vec4<f32> {
  let angle = -atan2(particles.particles[id].particleVel.x, particles.particles[id].particleVel.y);
  let ppos = getPos(vid);
  let pos = vec2<f32>(ppos.x * cos(angle) - ppos.y * sin(angle),
                      ppos.x * sin(angle) + ppos.y * cos(angle));
  return vec4<f32>(pos + particles.particles[id].particlePos, 0.0, 1.0);
}
`;

const FRAGMENT = `[[stage(fragment)]]
fn main() -> [[location(0)]] vec4<f32> {
  return vec4<f32>(1.0, 1.0, 1.0, 1.0);
}
`;

export const BOIDS: Blueprint = {
  nodes: {
    compute1: {
      name: 'update A',
      type: 'compute',
      position: { x: 580, y: 50 },
      shader: 'compute1',
      entryPoint: 'main',
      dispatchSize: { x: 1000, y: 1, z: 1 },
    },
    render1: {
      name: 'render boids',
      position: { x: 580, y: 370 },
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
      position: { x: 580, y: 220 },
      shader: 'compute1',
      entryPoint: 'main',
      dispatchSize: { x: 1000, y: 1, z: 1 },
    },
    buffer1: {
      name: 'particle data A',
      position: { x: 10, y: 100 },
      type: 'buffer',
      size: 16000,
      init: 'random-floats',
    },
    buffer2: {
      name: 'particle data B',
      position: { x: 10, y: 350 },
      type: 'buffer',
      size: 16000,
      init: 'zero',
    },
    binding1a: {
      name: '',
      position: { x: 10, y: 350 },
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
      position: { x: 10, y: 350 },
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
      position: { x: 10, y: 350 },
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
      position: { x: 10, y: 350 },
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
      position: { x: 10, y: 350 },
      type: 'connection',
      connectionType: 'binding',
      bindingType: 'buffer',
      storageType: 'storage',
      group: 0,
      binding: 2,
      source: 'buffer2',
      target: 'compute1',
    },
  },
  shaders: {
    compute1: {
      name: 'compute',
      code: COMPUTE,
    },
    vertex1: {
      name: 'vertex',
      code: VERTEX,
    },
    fragment1: {
      name: 'fragment',
      code: FRAGMENT,
    },
  },
};
