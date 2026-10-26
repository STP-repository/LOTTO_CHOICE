import {readFile,writeFile} from 'node:fs/promises';
import {validateAdvanced} from '../src/core/advanced-validation';
const data=JSON.parse(await readFile('public/data/full-history.json','utf8'));
const report=validateAdvanced(data.draws,Number(process.argv[2]??2000),20261021,new Date(),undefined,{count:Number(process.argv[3]??5),path:process.argv[4]==='compressed'?'compressed':'standard'});
await writeFile('reports/full-backtest.json',JSON.stringify(report));console.log(JSON.stringify({rounds:report.executions,games:report.count,base:report.base.average,random:report.random.average,comparison:report.againstRandom}));
