import { Blueprint } from './gpu/Blueprint';
import { BASIC } from './presets/Basic';
import { BOIDS } from './presets/Boids';
import { INSTANCES } from './presets/Instances';
import { DisplayConfig } from './ui/Display';

export interface AppState {
  blueprint: Blueprint;
  savedBlueprints: Record<string, Blueprint>;
  displayConfig: DisplayConfig;
  codeMirrorTheme: string;
}

export const DEFAULT_APP_STATE: AppState = {
  blueprint: {
    nodes: {},
    edges: {},
    shaders: {},
  },
  savedBlueprints: {
    Basic: BASIC,
    Boids: BOIDS,
    Instances: INSTANCES,
  },
  displayConfig: {
    aspect: '1:1',
    resolution: { mode: 'pixel', pixelSize: 1 },
  },
  codeMirrorTheme: 'monokai',
};
