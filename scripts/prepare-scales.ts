import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {prepareCandidates,generatePrepared,roundSeed,dataSignature,ANALYSIS_VERSION} from '../src/core/advanced-model';
const data=JSON.parse(await readFile('public/data/full-history.json','utf8')),draws=data.draws,seed=roundSeed(draws);
if(process.argv[2]==='--one'){
 const budget=Number(process.argv[3]),prepared=prepareCandidates(draws,budget,seed),sets:Record<string,ReturnType<typeof generatePrepared>>={};
 for(const path of ['standard','compressed'] as const){const full=generatePrepared(draws,prepared,seed,undefined,{count:15,path});
  if(full.diagnostics&&'records'in full.diagnostics){const d=full.diagnostics;Object.assign(d,{recordTotal:d.records.length,compressionRecordTotal:d.compressionRecords.length,recordLimit:500,records:d.records.slice(0,500),compressionRecords:d.compressionRecords.slice(0,500)});}
  for(const count of [5,10,15])sets[`${path}-${count}`]={...full,games:full.games.slice(0,count),snapshot:{...full.snapshot,count}};
 }
 await writeFile(`public/data/advanced-${budget}.json`,JSON.stringify({version:ANALYSIS_VERSION,signature:dataSignature(draws),seedPolicy:'회차별 파생 시드 고정 재현',sets,result:sets['standard-5']}));console.log(`${budget}개 규모 준비 완료`);
}else{
 for(const budget of [2000,10000,100000,1000000]){console.log(`prepare ${budget}`);execFileSync(process.execPath,['--max-old-space-size=8192','node_modules/tsx/dist/cli.mjs','scripts/prepare-scales.ts','--one',String(budget)],{stdio:'inherit'});}
 const base=await readFile('public/data/advanced-2000.json','utf8');await writeFile('public/data/advanced-result.json',base);
}
