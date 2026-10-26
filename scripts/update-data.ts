import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {collectFullHistory,validateDraws,type Dataset} from '../src/core/data';
await mkdir('public/data',{recursive:true});await mkdir('data',{recursive:true});
let previous:Dataset|undefined;try{previous=JSON.parse(await readFile('public/data/full-history.json','utf8'));validateDraws(previous!.draws);}catch{previous=undefined;}
try{
 const next=await collectFullHistory();
 if(previous&&next.draws.at(-1)!.round<previous.draws.at(-1)!.round)throw Error('기존 데이터보다 오래된 응답입니다.');
 if(previous?.verified&&!next.verified)throw Error('공식 확인 실패: 미러로 기존 공식 이력을 덮어쓰지 않습니다.');
 // lotto.json is retained as a compatibility alias of the same full-history snapshot.
 for(const name of ['full-history.json','lotto.json']){await writeFile(`public/data/${name}.tmp`,JSON.stringify(next));await rename(`public/data/${name}.tmp`,`public/data/${name}`);}
 const status={checkedAt:new Date().toISOString(),ok:true,errors:next.notes,lastRound:next.draws.at(-1)!.round};
 for(const name of ['status.json','full-status.json'])await writeFile(`public/data/${name}`,JSON.stringify(status));console.log(`전체 ${next.draws.length}회차 갱신 완료`);
}catch(e){const error=e instanceof Error?e.message:String(e),status={checkedAt:new Date().toISOString(),ok:false,errors:[error],retained:!!previous};for(const name of ['status.json','full-status.json'])await writeFile(`public/data/${name}`,JSON.stringify(status));await writeFile('data/last-error.json',JSON.stringify(status));console.error(error);process.exitCode=1;}
