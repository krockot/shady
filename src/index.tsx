import './index.css';

import localForage from 'localforage';
import React from 'react';
import { render } from 'react-dom';

import App from './app';
import { AppData, DEFAULT_APP_DATA } from './app_data';
import { restoreLocalPersistent } from './base/local_persistent';

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

  render(
    <React.StrictMode>
      <App data={data} />
    </React.StrictMode>,
    document.getElementById('root')
  );
}

init();
