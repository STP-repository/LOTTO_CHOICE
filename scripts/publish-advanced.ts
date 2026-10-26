import {execFileSync} from 'node:child_process';
// Prepare every selectable scale outside the browser. Default UI remains 2,000.
execFileSync(process.execPath,['--max-old-space-size=8192','node_modules/tsx/dist/cli.mjs','scripts/prepare-scales.ts'],{stdio:'inherit'});
