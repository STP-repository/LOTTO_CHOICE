import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {backtest} from '../src/core/backtest';
import type {Dataset} from '../src/core/data';
const data=JSON.parse(await readFile('public/data/lotto.json','utf8')) as Dataset;
const result=backtest(data.draws,'composite',20261017,5);
await mkdir('reports',{recursive:true});await writeFile('reports/backtest.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({count:result.rows.length,first:result.rows[0].round,last:result.rows.at(-1)!.round,games:result.games,seed:result.seed,average:result.average,random:result.randomAverage,histogram:result.histogram},null,2));
