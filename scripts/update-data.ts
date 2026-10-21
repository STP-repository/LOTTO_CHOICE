import { mkdir,readFile,rename,writeFile } from 'node:fs/promises';
import { collect,collectFullHistory,validateDraws,type Dataset } from '../src/core/data';
await mkdir('public/data',{recursive:true}); await mkdir('data',{recursive:true});
let previous:Dataset|undefined;try{const candidate:Dataset=JSON.parse(await readFile('public/data/lotto.json','utf8'));validateDraws(candidate.draws);previous=candidate;}catch{}
try {
  const next=await collect();
  if(previous && next.draws.at(-1)!.round<previous.draws.at(-1)!.round)throw new Error('기존 데이터보다 오래된 응답입니다.');
  if(previous?.verified && !next.verified)for(const d of next.draws){const old=previous.draws.find(o=>o.round===d.round);if(old && (old.numbers.join()!==d.numbers.join()||old.bonus!==d.bonus))throw new Error(`미러와 기존 공식 ${d.round}회 데이터 불일치`);}
  await writeFile('public/data/lotto.json.tmp',JSON.stringify(next,null,2));await rename('public/data/lotto.json.tmp','public/data/lotto.json');
  await writeFile('public/data/status.json',JSON.stringify({checkedAt:new Date().toISOString(),ok:true,errors:next.notes},null,2));
  console.log(JSON.stringify({source:next.source,count:next.draws.length,first:next.draws[0],last:next.draws.at(-1)},null,2));
}catch(e){
  const error=e instanceof Error?e.message:String(e); const status={checkedAt:new Date().toISOString(),ok:false,errors:[error],retained:!!previous};
  await writeFile('public/data/status.json',JSON.stringify(status,null,2));await writeFile('data/last-error.json',JSON.stringify(status,null,2));console.error('수집 실패. 마지막 정상 파일 유지.',error);process.exitCode=1;
}
// Independent full-history artifact for the added analysis. Retain the last good file
// on failure without changing the existing fifteen-year data pipeline.
try{
  const full=await collectFullHistory();
  let old:Dataset|undefined;try{old=JSON.parse(await readFile('public/data/full-history.json','utf8'));if(old)validateDraws(old.draws);}catch{old=undefined;}
  if(old&&old.draws.at(-1)!.round>full.draws.at(-1)!.round)throw new Error('전체 이력 응답이 기존 파일보다 오래되었습니다.');
  if(old?.verified&&!full.verified)for(const d of full.draws){const prior=old.draws.find(p=>p.round===d.round);if(prior&&(prior.numbers.join()!==d.numbers.join()||prior.bonus!==d.bonus))throw new Error(`${d.round}회 공식 기록과 불일치`);}
  await writeFile('public/data/full-history.json.tmp',JSON.stringify(full));await rename('public/data/full-history.json.tmp','public/data/full-history.json');
  await writeFile('public/data/full-status.json',JSON.stringify({ok:true,checkedAt:new Date().toISOString(),notes:full.notes}));
  console.log(`전체 이력: ${full.draws.length}회차 · ${full.source}`);
}catch(e){await writeFile('public/data/full-status.json',JSON.stringify({ok:false,checkedAt:new Date().toISOString(),error:e instanceof Error?e.message:String(e)}));console.error('전체 이력 갱신 실패: 기존 파일 유지',e instanceof Error?e.message:String(e));}
