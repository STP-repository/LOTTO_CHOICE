import {checkIdentityEpoch} from './services/profiles';
import {startCloudRecords} from './services/cloud-records';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
async function boot(){try{await checkIdentityEpoch();}catch{}createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);startCloudRecords();}void boot();

import './landing.css';
import './games.css';
