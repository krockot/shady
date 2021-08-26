import { FlowTransform } from 'react-flow-renderer';

import { SerializedBlueprint } from './blueprint/serialization';
import { BASIC } from './presets/basic';
import { BOIDS } from './presets/boids';
import { INSTANCES } from './presets/instances';
import { DisplayConfig } from './ui/display';

export interface AppData {
  blueprint: SerializedBlueprint;
  savedBlueprints: Record<string, SerializedBlueprint>;
  displayConfig: DisplayConfig;
  codeMirrorTheme: string;
  editorViewTransform: FlowTransform;
}

export const DEFAULT_APP_DATA: AppData = {
  blueprint: {
    version: 1,
    nodes: [],
    shaders: [],
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
  codeMirrorTheme: 'paraiso-dark',
  editorViewTransform: { x: 0, y: 0, zoom: 1 },
};
