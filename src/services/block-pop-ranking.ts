import {currentProfile,personalStorage,notifyIdentityExpired} from './profiles';
import {replayPop,type PopState} from '../core/block-pop';
const URL='https://starseed-guardians-coop-20261022.eogus3535.chatgpt.site/api/pop';
export interface PopRank {name:string;score:number;moves:number;updated:number}
export async function popRanking():Promise<PopRank[]>{const r=await fetch(URL,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('랭킹 연결을 확인해 주세요.');return (await r.json()).rows;}
type Pending={seed:number;actions:NonNullable<PopState['actions']>;score:number;at:number;id:string};
const KEY='puzzles:pop-ranking-pending:v2';
function pending():Pending[]{try{return JSON.parse(personalStorage.getItem(KEY)||'[]');}catch{return [];}}
let flight:Promise<void>|undefined;
export async function uploadPop(s:PopState){
 if(!s.initialSeed||!s.actions?.length)throw Error('이전 판은 내 기록으로 보존됩니다. 새 게임부터 공개 랭킹에 등록돼요.');
 const proof=replayPop(s.initialSeed,s.actions);if(proof.score!==s.score||proof.phase!=='over')throw Error('게임 기록을 확인하지 못했습니다.');
 const id=`${s.initialSeed}:${s.actions.length}:${s.score}`;
 if(!pending().some(r=>r.id===id))personalStorage.setItem(KEY,JSON.stringify([...pending(),{seed:s.initialSeed,actions:s.actions,score:s.score,at:Date.now(),id}].slice(-10)));
 return syncPopRanking();
}
export function syncPopRanking(){if(!flight)flight=flush().finally(()=>{flight=undefined;});return flight;}
async function flush(){
 if(!pending().length)return;
 const profile=currentProfile(),key='lotto-best-choice:cloud-token:v1';let token=personalStorage.getItem(key);if(!token){token=crypto.randomUUID()+crypto.randomUUID();personalStorage.setItem(key,token);}
 const epoch=await fetch(URL+'?rankingsEpoch=1',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!epoch.ok)throw Error('랭킹 초기화 상태 확인 실패');
 const {epoch:rankingEpoch}=await epoch.json();
 personalStorage.setItem(KEY,JSON.stringify(pending().filter(p=>p.at>rankingEpoch)));
 for(const record of pending()){
 const r=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:profile.id,name:profile.name,token,profileRevision:Number(personalStorage.getItem('profile:revision:v1')||0),epoch:Number(localStorage.getItem('lotto-best-choice:identity-epoch:v1')||0),rankingEpoch,seed:record.seed,actions:record.actions,score:record.score}),signal:AbortSignal.timeout(20000)});
 if(!r.ok){const data=await r.json();if(data.code==='IDENTITY_RESET')notifyIdentityExpired();throw Error(data.error||'기록 전송 실패');}
 personalStorage.setItem(KEY,JSON.stringify(pending().filter(p=>p.id!==record.id)));
 window.dispatchEvent(new Event('puzzle-records-updated'));
 }
}
