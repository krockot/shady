import { FlowTransform } from 'react-flow-renderer';

import { SerializedBlueprint } from './gpu/Blueprint';
import { BASIC } from './presets/Basic';
import { BOIDS } from './presets/Boids';
import { INSTANCES } from './presets/Instances';
import { DisplayConfig } from './ui/Display';

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
