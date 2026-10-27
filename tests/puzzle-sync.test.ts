import test from 'node:test';import assert from 'node:assert/strict';
import {personalStorage} from '../src/services/profiles';
import {syncPuzzleRecords,puzzleRecords} from '../src/services/puzzle-records';
import {GENERATOR_VERSION} from '../src/core/puzzles';
test('랭킹 동시 업로드는 한 번만 실행하고 불량 기록 뒤 정상 기록을 전송한다',async()=>{
 const data=new Map<string,string>(),events=new EventTarget();Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)},configurable:true});Object.defineProperty(globalThis,'sessionStorage',{value:{getItem:()=>null,setItem:()=>{}},configurable:true});Object.defineProperty(globalThis,'window',{value:events,configurable:true});
 const key='puzzles:records:v1',record=(id:string,stage:string)=>({id,stage,kind:'escape',version:GENERATOR_VERSION,moves:1,units:9,at:new Date().toISOString(),actions:[{type:'move',id:1,direction:'left'}]});
 personalStorage.setItem(key,JSON.stringify([record('good','2'),record('bad','1')]));
 const previous=globalThis.fetch,calls:string[]=[];globalThis.fetch=async(url,init)=>{if(!init?.method)return Response.json({epoch:0});const body=JSON.parse(String(init.body));calls.push(body.stage);return body.stage==='1'?Response.json({error:'재현 불가'},{status:400}):Response.json({ok:true});};
 try{const a=syncPuzzleRecords(),b=syncPuzzleRecords();assert.strictEqual(a,b);await assert.rejects(a,/재현 불가/);assert.deepEqual(calls,['1','2']);assert.equal(puzzleRecords().find(r=>r.id==='good')?.synced,true);assert.equal(puzzleRecords().find(r=>r.id==='bad')?.syncError,'재현 불가');
  await syncPuzzleRecords();assert.equal(calls.length,2);
  personalStorage.setItem(key,JSON.stringify([record('reset','3')]));let notified=0;events.addEventListener('puzzle-identity-expired',()=>notified++);globalThis.fetch=async(_url,init)=>init?.method?Response.json({error:'초기화',code:'IDENTITY_RESET'},{status:409}):Response.json({epoch:0});await assert.rejects(syncPuzzleRecords(),/아이디를 다시 등록/);assert.equal(notified,1);assert.equal(puzzleRecords()[0].synced,undefined);
 }finally{globalThis.fetch=previous;}
});
