import './index.css';

import localForage from 'localforage';
import React from 'react';
import { render } from 'react-dom';

import App from './App';
import { AppState, DEFAULT_APP_STATE } from './AppState';
import { restoreLocalPersistent } from './base/LocalPersistent';

localForage.config({
  driver: localForage.INDEXEDDB,
  name: 'shady',
  version: 1,
  storeName: 'local_state',
});

window.forage = localForage;

async function init() {
  const state = await restoreLocalPersistent<AppState>({
    key: 'gpu-app-state',
    default: DEFAULT_APP_STATE,
  });
  render(
    <React.StrictMode>
      <App appState={state} />
    </React.StrictMode>,
    document.getElementById('root')
  );
}

init();
