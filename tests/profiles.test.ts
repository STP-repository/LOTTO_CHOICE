import test from 'node:test';
import assert from 'node:assert/strict';
import {currentProfile,personalStorage,createProfile,selectProfile,listProfiles,renameProfile} from '../src/services/profiles';
test('프로필별 기록 격리·기존 기록 이관·페이지별 고정 사용자·재진입 복원을 확인한다',async()=>{
  const store=new Map<string,string>([['lotto-best-choice:qr-history:v1','["old"]']]),session=new Map<string,string>();
  const storage=(map:Map<string,string>)=>({getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v)});
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage(store)});
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:storage(session)});
  const first=currentProfile();assert.equal(personalStorage.getItem('lotto-best-choice:qr-history:v1'),'["old"]');
  personalStorage.setItem('record','first');const second=createProfile('친구');assert.notEqual(first.id,second.id);assert.equal(listProfiles().length,2);
  selectProfile(second.id);
  // Old asynchronous work is still bound to the old page identity until reload.
  personalStorage.setItem('late','old-page');assert.equal(store.get(`late:profile:${first.id}`),'old-page');assert.equal(store.get(`late:profile:${second.id}`),undefined);
  const freshPath='../src/services/profiles.ts?new-page';
  const fresh=await import(freshPath) as typeof import('../src/services/profiles');
  assert.equal(fresh.currentProfile().id,second.id);assert.equal(fresh.personalStorage.getItem('record'),null);assert.equal(fresh.personalStorage.getItem('lotto-best-choice:qr-history:v1'),null);
  fresh.personalStorage.setItem('record','second');assert.equal(personalStorage.getItem('record'),'first');
  fresh.selectProfile(first.id);const backPath='../src/services/profiles.ts?return-page';const back=await import(backPath) as typeof import('../src/services/profiles');assert.equal(back.personalStorage.getItem('record'),'first');
  assert.equal(renameProfile('본인').id,first.id);assert.throws(()=>createProfile(' '));assert.throws(()=>selectProfile('missing'));
});
