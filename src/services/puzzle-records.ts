import {HARVEST_VERSION,GENERATOR_VERSION} from '../core/puzzles';
import {personalStorage,currentProfile,notifyIdentityExpired} from './profiles';
import {verifyPuzzleProof} from '../core/puzzle-proof';
import type {PuzzleAction} from '../core/puzzle-proof';
import type {PuzzleKind} from '../core/puzzles';
const KEY='puzzles:records:v1',ENDPOINT='https://starseed-guardians-coop-20261022.eogus3535.chatgpt.site/api/puzzles';
export interface PuzzleRecord {id:string;kind:PuzzleKind;stage:string;version:string;moves:number;units:number;at:string;actions:PuzzleAction[];synced?:boolean;retired?:boolean;attempt?:string;items?:number;syncError?:string}
export function puzzleRecords():PuzzleRecord[]{try{const rows=JSON.parse(personalStorage.getItem(KEY)||'[]');return Array.isArray(rows)?rows.filter(r=>r&&['escape','harvest'].includes(r.kind)&&typeof r.stage==='string'&&/^[1-9]\d{0,39}$/.test(r.stage)&&Array.isArray(r.actions)).slice(0,500):[];}catch{return [];}}
export function savePuzzleRecord(kind:PuzzleKind,stage:string,version:string,actions:PuzzleAction[],attempt?:string):PuzzleRecord{const proof=verifyPuzzleProof(kind,stage,version,actions),rows=puzzleRecords(),id=`${version}:${kind}:${stage}`,old=rows.find(r=>r.id===id);if(old&&(old.attempt===attempt||!old.retired&&((old.items??0)<proof.items||(old.items??0)===proof.items&&old.moves<=proof.moves)))return old;const r={id,kind,stage,version,...proof,actions,attempt,at:new Date().toISOString()};personalStorage.setItem(KEY,JSON.stringify([r,...rows.filter(v=>v.id!==id)].slice(0,500)));return r;}
let syncing:Promise<void>|undefined;
export function syncPuzzleRecords(retryRejected=false){if(!syncing){if(retryRejected)personalStorage.setItem(KEY,JSON.stringify(puzzleRecords().map(r=>({...r,syncError:undefined}))));syncing=uploadPending().finally(()=>{syncing=undefined;});}return syncing;}
async function uploadPending(){
 const epochResponse=await fetch(`${ENDPOINT}?rankingsEpoch=1`,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!epochResponse.ok)throw Error('랭킹 초기화 상태를 확인하지 못했습니다.');const {epoch:rankingEpoch}=await epochResponse.json() as {epoch:number};
 if(rankingEpoch>0)personalStorage.setItem(KEY,JSON.stringify(puzzleRecords().map(r=>Date.parse(r.at)<=rankingEpoch?{...r,retired:true}:r)));
 const profile=currentProfile(),key='lotto-best-choice:cloud-token:v1';let token=personalStorage.getItem(key);if(!token){token=crypto.randomUUID()+crypto.randomUUID();personalStorage.setItem(key,token);}
 let rejected='';
 for(const record of puzzleRecords().filter(r=>!r.synced&&!r.retired&&!r.syncError&&(r.kind==='harvest'?[HARVEST_VERSION]:[GENERATOR_VERSION,'color-block-escape-v1']).includes(r.version)).reverse()){
  const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({epoch:Number(localStorage.getItem("lotto-best-choice:identity-epoch:v1")||0),rankingEpoch,id:profile.id,token,profileRevision:Number(personalStorage.getItem("profile:revision:v1")||0),name:profile.name,kind:record.kind,stage:record.stage,version:record.version,actions:record.actions}),signal:AbortSignal.timeout(15000)});
  if(!res.ok){const data=await res.json().catch(()=>({})) as {error?:string;code?:string};const reason=data.error||'공개 기록 서버에 연결하지 못했습니다. 내 기록은 기기에 보관됩니다.';
   if(res.status===409&&data.code!=='RANKINGS_RESET'){notifyIdentityExpired();throw Error('관리자가 사용자를 초기화했습니다. 새로고침 후 아이디를 다시 등록해 주세요.');}
   if(res.status===400){rejected=reason;personalStorage.setItem(KEY,JSON.stringify(puzzleRecords().map(r=>r.id===record.id?{...r,syncError:reason}:r)));continue;}
   throw Error(reason);
  }
  personalStorage.setItem(KEY,JSON.stringify(puzzleRecords().map(r=>r.id===record.id?{...r,actions:[],synced:true}:r)));
  window.dispatchEvent(new Event('puzzle-records-updated'));
 }
 if(rejected)throw Error(`일부 기록은 서버 검증에서 제외됐습니다: ${rejected}`);
}
export async function publicPuzzleRanking(kind:PuzzleKind,rules='current'){const res=await fetch(`${ENDPOINT}?kind=${kind}&rules=${rules}`,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error('공개 랭킹을 불러오지 못했습니다.');return res.json() as Promise<{rows:{name:string;stage:string;clears:number;moves:number;updated:number;assisted?:number}[]}>;}
