import './index.css';

import localForage from 'localforage';
import React from 'react';
import { render } from 'react-dom';

import App from './app';
import { AppData, DEFAULT_APP_DATA } from './app_data';
import { restoreLocalPersistent } from './base/local_persistent';
import { modernizeBlueprint } from './blueprint/blueprint';

localForage.config({
  driver: localForage.INDEXEDDB,
  name: 'shady',
  version: 1,
  storeName: 'local_state',
});

async function init() {
  const data = await restoreLocalPersistent<AppData>({
    key: 'gpu-app-state',
    default: DEFAULT_APP_DATA,
  });

  const value = data.value;
  value.blueprint = await modernizeBlueprint(value.blueprint);
  for (const [id, serialized] of Object.entries(value.savedBlueprints)) {
    value.savedBlueprints[id] = await modernizeBlueprint(serialized);
  }
  data.value = value;

  render(
    <React.StrictMode>
      <App data={data} />
    </React.StrictMode>,
    document.getElementById('root')
  );
}

init();
