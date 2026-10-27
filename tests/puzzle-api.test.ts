import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';import {build} from 'esbuild';
import {generateEscape,hashSeed,GENERATOR_VERSION} from '../src/core/puzzles';
test('실제 랭킹 API는 서로 다른 두 사용자의 검증된 클리어를 저장·조회하고 초기화 전 사용자를 거절한다',async t=>{
 const root=path.resolve('defense-online');if(!existsSync(path.join(root,'app/api/puzzles/route.ts'))){t.skip('Sites checkout unavailable');return;}
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE directory_audit(action TEXT,target TEXT,created INTEGER);CREATE TABLE directory_profiles(id TEXT PRIMARY KEY,secret TEXT,name TEXT,created INTEGER,seen INTEGER);CREATE TABLE puzzle_clears(id TEXT PRIMARY KEY,profile_id TEXT,kind TEXT,stage TEXT,version TEXT,moves INTEGER,units INTEGER,updated INTEGER);');
 const wrap=(sql:string,args:any[]=[])=>({bind:(...v:any[])=>wrap(sql,v),first:async()=>db.prepare(sql).get(...args)??null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>db.prepare(sql).run(...args)});
 (globalThis as any).__puzzleTestEnv={DB:{prepare:wrap,batch:async(queries:any[])=>Promise.all(queries.map(q=>q.run()))}};
 try{const result=await build({entryPoints:[path.join(root,'app/api/puzzles/route.ts')],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'test-env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test-env'}));b.onLoad({filter:/.*/,namespace:'test-env'},()=>({contents:'export const env=globalThis.__puzzleTestEnv;'}));b.onResolve({filter:/^@\//},a=>({path:path.join(root,a.path.slice(2))+'.ts'}));}}]});
 const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 const stage='1',p=generateEscape(stage,hashSeed(`${GENERATOR_VERSION}:escape:${stage}`)),actions=p.solution.map(m=>({type:'move',...m}));
 const post=(id:string,epoch=0)=>api.POST(new Request('https://example.test/api/puzzles',{method:'POST',headers:{Origin:'https://stp-repository.github.io','Content-Type':'application/json'},body:JSON.stringify({id,epoch,rankingEpoch:0,token:id.repeat(5),name:id,kind:'escape',stage,version:GENERATOR_VERSION,actions})}));
 for(const id of ['test-user-one','test-user-two']){const res=await post(id);assert.equal(res.status,200,JSON.stringify(await res.json()));}
 const res=await api.GET(new Request('https://example.test/api/puzzles?kind=escape'));const data=await res.json();assert.equal(data.rows.length,2);assert.deepEqual(new Set(data.rows.map((r:any)=>r.name)),new Set(['test-user-one','test-user-two']));
 db.prepare('INSERT INTO directory_audit VALUES(?,?,?)').run('reset-users','all',123);const rejected=await post('test-user-old');assert.equal(rejected.status,409);assert.equal((await rejected.json()).code,'IDENTITY_RESET');assert.equal((db.prepare('SELECT COUNT(*) n FROM puzzle_clears').get() as any).n,2);
 }finally{db.close();delete (globalThis as any).__puzzleTestEnv;}
});
