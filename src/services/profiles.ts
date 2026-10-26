export interface LocalProfile {id:string;name:string;createdAt:string}
const INDEX='lotto-best-choice:profiles:v1',LAST='lotto-best-choice:last-profile:v1',ACTIVE='lotto-best-choice:tab-profile:v1';
const LEGACY=['lotto-best-choice:recent-game-names:v1','lotto-best-choice:active-game-roster:v1','lotto-best-choice:qr-history:v1','lotto-best-choice:saved-numbers:v1','lotto:arcade-scores:v1'];
let current:LocalProfile|undefined;
const scoped=(key:string,id:string)=>`${key}:profile:${id}`;
export function listProfiles():LocalProfile[]{try{const rows=JSON.parse(localStorage.getItem(INDEX)||'[]');return Array.isArray(rows)?rows.filter(p=>p&&typeof p.id==='string'&&/^[a-z0-9-]{10,}$/.test(p.id)&&typeof p.name==='string'&&p.name.length>0&&p.name.length<=20&&Number.isFinite(Date.parse(p.createdAt))).slice(0,20):[];}catch{return [];}}
function makeProfile(name?:string):LocalProfile{const id=crypto.randomUUID();return {id,name:name?.trim().slice(0,20)||`방문자 ${id.slice(0,4).toUpperCase()}`,createdAt:new Date().toISOString()};}
export function currentProfile():LocalProfile{
  if(current)return current;
  const profiles=listProfiles();let selected:string|null=null;
  try{selected=sessionStorage.getItem(ACTIVE)||localStorage.getItem(LAST);}catch{}
  current=profiles.find(p=>p.id===selected)??profiles[0];
  if(!current){current=makeProfile();try{localStorage.setItem(INDEX,JSON.stringify([current]));
    // The first profile inherits this browser's existing records. New profiles never do.
    for(const key of LEGACY){const old=localStorage.getItem(key);if(old!==null)localStorage.setItem(scoped(key,current.id),old);}
  }catch{/* Keep a stable session identity when storage is unavailable. */}}
  try{sessionStorage.setItem(ACTIVE,current.id);localStorage.setItem(LAST,current.id);}catch{}
  return current;
}
export function createProfile(name:string){
  currentProfile();const profiles=listProfiles();if(profiles.length>=20)throw new Error('이 브라우저에는 최대 20명의 사용자를 등록할 수 있습니다.');
  if(!name.trim()||name.trim().length>20)throw new Error('사용자 이름은 1~20자로 입력해 주세요.');
  const next=makeProfile(name);localStorage.setItem(INDEX,JSON.stringify([...profiles,next]));return next;
}
export function selectProfile(id:string){if(!listProfiles().some(p=>p.id===id))throw new Error('등록된 사용자를 찾을 수 없습니다.');sessionStorage.setItem(ACTIVE,id);localStorage.setItem(LAST,id);}
export function renameProfile(name:string){if(!name.trim()||name.trim().length>20)throw new Error('사용자 이름은 1~20자로 입력해 주세요.');const old=currentProfile(),next={...old,name:name.trim()};localStorage.setItem(INDEX,JSON.stringify(listProfiles().map(p=>p.id===old.id?next:p)));current=next;return next;}
// Capture the identity for the lifetime of this page. Switching reloads the page,
// so an old asynchronous operation can never write into the newly selected profile.
export const personalStorage={getItem:(key:string)=>localStorage.getItem(scoped(key,currentProfile().id)),setItem:(key:string,value:string)=>{localStorage.setItem(scoped(key,currentProfile().id),value);if(typeof window!=='undefined')window.dispatchEvent(new Event('lotto:personal-change'));}};

export async function checkIdentityEpoch(){
 const response=await fetch('https://starseed-guardians-coop-20261022.fairfig7.chatgpt.site/api/puzzles?epoch=1',{cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('초기화 상태를 확인하지 못했습니다.');
 const {epoch}=await response.json();if(!Number.isSafeInteger(epoch)||epoch<0)throw Error('잘못된 초기화 상태');
 const key='lotto-best-choice:identity-epoch:v1',previous=Number(localStorage.getItem(key)||0);
 if(epoch>previous){const keys=Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)!);for(const k of keys)if(k===INDEX||k===LAST||LEGACY.includes(k)||k.startsWith('puzzles:')||k.startsWith('lotto:arcade')||k.includes(':profile:'))localStorage.removeItem(k);sessionStorage.removeItem(ACTIVE);current=undefined;localStorage.setItem(key,String(epoch));return true;}
 return false;
}
export function forgetDeletedProfile(){const id=currentProfile().id;for(const key of LEGACY)localStorage.removeItem(key);for(const key of Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)!))if(key.endsWith(":profile:"+id))localStorage.removeItem(key);localStorage.setItem(INDEX,JSON.stringify(listProfiles().filter(p=>p.id!==id)));if(localStorage.getItem(LAST)===id)localStorage.removeItem(LAST);sessionStorage.removeItem(ACTIVE);current=undefined;}
