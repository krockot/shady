import './index.css';

import localForage from 'localforage';
import React from 'react';
import { render } from 'react-dom';

import App from './App';
import { AppState, DEFAULT_APP_STATE } from './AppState';
import { restoreLocalPersistent } from './base/LocalPersistent';
import { modernizeBlueprint } from './gpu/Blueprint';

localForage.config({
  driver: localForage.INDEXEDDB,
  name: 'shady',
  version: 1,
  storeName: 'local_state',
});

async function init() {
  const state = await restoreLocalPersistent<AppState>({
    key: 'gpu-app-state',
    default: DEFAULT_APP_STATE,
  });

  const value = state.value;
  value.blueprint = await modernizeBlueprint(value.blueprint);
  for (const [id, serialized] of Object.entries(value.savedBlueprints)) {
    value.savedBlueprints[id] = await modernizeBlueprint(serialized);
  }
  state.value = value;

  render(
    <React.StrictMode>
      <App appState={state} />
    </React.StrictMode>,
    document.getElementById('root')
  );
}

init();
