import {personalStorage,currentProfile} from './profiles';
import {verifyPuzzleProof} from '../core/puzzle-proof';
import type {PuzzleAction} from '../core/puzzle-proof';
import type {PuzzleKind} from '../core/puzzles';
const KEY='puzzles:records:v1',ENDPOINT='https://starseed-guardians-coop-20261022.fairfig7.chatgpt.site/api/puzzles';
export interface PuzzleRecord {id:string;kind:PuzzleKind;stage:string;version:string;moves:number;units:number;at:string;actions:PuzzleAction[];synced?:boolean}
export function puzzleRecords():PuzzleRecord[]{try{const rows=JSON.parse(personalStorage.getItem(KEY)||'[]');return Array.isArray(rows)?rows.filter(r=>r&&['escape','harvest'].includes(r.kind)&&typeof r.stage==='string'&&/^[1-9]\d{0,39}$/.test(r.stage)&&Array.isArray(r.actions)).slice(0,500):[];}catch{return [];}}
export function savePuzzleRecord(kind:PuzzleKind,stage:string,version:string,actions:PuzzleAction[]){const proof=verifyPuzzleProof(kind,stage,version,actions),rows=puzzleRecords(),id=`${version}:${kind}:${stage}`,old=rows.find(r=>r.id===id);if(old&&old.moves<=proof.moves)return old;const r={id,kind,stage,version,...proof,actions,at:new Date().toISOString()};personalStorage.setItem(KEY,JSON.stringify([r,...rows.filter(v=>v.id!==id)].slice(0,500)));return r;}
export async function syncPuzzleRecords(){
 const profile=currentProfile(),key='lotto-best-choice:cloud-token:v1';let token=personalStorage.getItem(key);if(!token){token=crypto.randomUUID()+crypto.randomUUID();personalStorage.setItem(key,token);}
 for(const record of puzzleRecords().filter(r=>!r.synced).reverse()){
  const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:profile.id,token,name:profile.name,kind:record.kind,stage:record.stage,version:record.version,actions:record.actions}),signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw Error('공개 기록 서버에 연결하지 못했습니다. 내 기록은 기기에 보관됩니다.');
  personalStorage.setItem(KEY,JSON.stringify(puzzleRecords().map(r=>r.id===record.id?{...r,actions:[],synced:true}:r)));
 }
}
export async function publicPuzzleRanking(kind:PuzzleKind){const res=await fetch(`${ENDPOINT}?kind=${kind}`,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error('공개 랭킹을 불러오지 못했습니다.');return res.json() as Promise<{rows:{name:string;stage:string;clears:number;moves:number;updated:number}[]}>;}
