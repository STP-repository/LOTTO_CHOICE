import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newTicketHistory,nameTicket,resolveHistory,readTicketHistory,writeTicketHistory} from '../src/services/ticket-history';
import type {Dataset} from '../src/core/data';
const data:Dataset={draws:[{round:1,date:'2002-12-07',numbers:[1,2,3,4,5,6],bonus:7}],source:'테스트 공식 형식',sourceUrl:'',verified:true,updatedAt:'2026-10-21',notes:[]};
test('당첨 기록은 생성 직후 랜덤 별명이 있고 미입력도 이름 없는 기록을 만들지 않는다',()=>{
  const entry=newTicketHistory({round:1,games:[[1,2,3,4,5,6]]},data);assert.equal(entry.results![0].rank,1);assert.ok(entry.name.trim());assert.ok(nameTicket(entry,'   ').name.trim());
  const named=nameTicket(entry,'민수');assert.equal(resolveHistory(named,data).name,'민수');assert.equal(named.name,'민수');
  const losing=newTicketHistory({round:1,games:[[8,9,10,11,12,13]]},data);assert.equal(losing.name,'');assert.equal(losing.results![0].rank,null);
});
test('추첨 대기 이력은 결과 도착 후 재비교하며 당첨되면 별명을 자동 부여한다',()=>{
  const pending=newTicketHistory({round:1,games:[[1,2,3,4,5,7]]},null);assert.equal(pending.results,null);assert.equal(pending.name,'');
  const resolved=resolveHistory(pending,data);assert.equal(resolved.results![0].rank,2);assert.ok(resolved.name);assert.equal(resolveHistory(resolved,data).name,resolved.name);
});
test('확인 이력은 최대 100건 복원하고 QR 원문·사진을 포함하지 않는다',()=>{
  const store=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>store.set(k,v)}});
  const entry=newTicketHistory({round:1,games:[[1,2,3,4,5,6]]},data);assert.equal(writeTicketHistory(Array.from({length:105},()=>entry)),true);assert.equal(readTicketHistory().length,100);assert.ok(!('url' in readTicketHistory()[0]));assert.ok(!('photo' in readTicketHistory()[0]));
});
