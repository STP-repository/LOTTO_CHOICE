import {readFile,writeFile,rename} from 'node:fs/promises';
import {validateDraws} from '../src/core/data';
import {rankedRecommendations,type Mode} from '../src/core/recommend';
import {dataSignature} from '../src/core/advanced-model';
const data=JSON.parse(await readFile('public/data/full-history.json','utf8')),draws=validateDraws(data.draws);
if(draws[0].round!==1)throw Error('전체 이력이 필요합니다.');
const results=Object.fromEntries((['all','overdue','integrated'] as Mode[]).map(mode=>[mode,rankedRecommendations(draws,mode,15,undefined,'all')]));
await writeFile('public/data/ranked-results.json.tmp',JSON.stringify({version:3,generatedAt:new Date().toISOString(),scopes:{all:{signature:dataSignature(draws),firstRound:1,lastRound:draws.at(-1)!.round,results}}}));await rename('public/data/ranked-results.json.tmp','public/data/ranked-results.json');
