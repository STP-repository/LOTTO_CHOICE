import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {currentProfile,personalStorage} from '../src/services/profiles';
import {syncPuzzleRecords,puzzleRecords,savePuzzleRecord} from '../src/services/puzzle-records';
import {GENERATOR_VERSION,generateEscape,hashSeed} from '../src/core/puzzles';

test('랭킹 초기화의 실제 삭제 SQL은 두 게임 기록만 지우고 아이디·QR은 보존한다',t=>{
 if(!existsSync('defense-online/app/api/admin/records/route.ts')){t.skip('Sites 서버 체크아웃이 없는 CI에서는 로컬 서버 SQL 검사를 생략한다');return;}
 const source=readFileSync('defense-online/app/api/admin/records/route.ts','utf8');
 const branch=source.slice(source.indexOf("if(b.action==='reset-rankings')"),source.indexOf("if(b.action==='reset-users'"));
 const deletes=[...branch.matchAll(/db\.prepare\('(DELETE[^']+)'\)/g)].map(m=>m[1]);assert.deepEqual(deletes,['DELETE FROM puzzle_clears']);
 const db=new DatabaseSync(':memory:');try{db.exec("CREATE TABLE puzzle_clears(kind TEXT);INSERT INTO puzzle_clears VALUES('escape'),('harvest');CREATE TABLE directory_profiles(id TEXT);INSERT INTO directory_profiles VALUES('owner-test');CREATE TABLE directory_tickets(id TEXT);INSERT INTO directory_tickets VALUES('qr-test');");for(const sql of deletes)db.exec(sql);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM puzzle_clears').get()!.n,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM directory_profiles').get()!.n,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM directory_tickets').get()!.n,1);
 }finally{db.close();}
});

test('초기화 이전 기기 기록은 재전송하지 않고 새 기록에 서버의 랭킹 세대를 보낸다',async()=>{
 const data=new Map<string,string>(),session=new Map<string,string>();const storage=(m:Map<string,string>)=>({getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>m.set(k,v)});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage(data)});Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:storage(session)});Object.defineProperty(globalThis,'window',{configurable:true,value:{dispatchEvent:()=>true}});
 const profile=currentProfile(),qr='["keep-qr"]';personalStorage.setItem('lotto-best-choice:qr-history:v1',qr);
 const row=(id:string,at:number)=>({id,kind:'escape',stage:'1',version:GENERATOR_VERSION,moves:1,units:1,at:new Date(at).toISOString(),actions:[]});personalStorage.setItem('puzzles:records:v1',JSON.stringify([row('old',1000),row('new',3000)]));
 const previous=globalThis.fetch,posted:any[]=[];globalThis.fetch=async(input,init)=>{if(String(input).includes('rankingsEpoch'))return Response.json({epoch:2000});posted.push(JSON.parse(String(init!.body)));return Response.json({ok:true});};
 try{await syncPuzzleRecords();assert.equal(posted.length,1);assert.equal(posted[0].rankingEpoch,2000);assert.equal(puzzleRecords().find(r=>r.id==='old')?.retired,true);assert.equal(puzzleRecords().find(r=>r.id==='new')?.synced,true);assert.equal(currentProfile().id,profile.id);assert.equal(personalStorage.getItem('lotto-best-choice:qr-history:v1'),qr);
 const p=generateEscape('1',hashSeed(`${GENERATOR_VERSION}:escape:1`)),actions=p.solution.map(m=>({type:'move' as const,...m}));savePuzzleRecord('escape','1',GENERATOR_VERSION,actions,'attempt-before-reset');personalStorage.setItem('puzzles:records:v1',JSON.stringify(puzzleRecords().map(r=>({...r,retired:true}))));
 assert.equal(savePuzzleRecord('escape','1',GENERATOR_VERSION,actions,'attempt-before-reset').retired,true);assert.notEqual(savePuzzleRecord('escape','1',GENERATOR_VERSION,actions,'fresh-attempt-after-reset').retired,true);
 }finally{globalThis.fetch=previous;}
});
