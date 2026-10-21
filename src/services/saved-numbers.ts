export interface SavedNumbers {id:string;createdAt:string;round:number;method:string;numbers:number[]}
const KEY='lotto-best-choice:saved-numbers:v1';
export const SAVED_EVENT='lotto-saved-numbers-changed';
export function readSavedNumbers():SavedNumbers[]{try{const rows:unknown=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(rows))return [];return rows.filter((r):r is SavedNumbers=>!!r&&typeof r.id==='string'&&typeof r.createdAt==='string'&&Number.isFinite(Date.parse(r.createdAt))&&Number.isInteger(r.round)&&r.round>0&&typeof r.method==='string'&&Array.isArray(r.numbers)&&r.numbers.length===6&&new Set(r.numbers).size===6&&r.numbers.every((n:number)=>Number.isInteger(n)&&n>=1&&n<=45)).slice(0,200);}catch{return [];}}
function persist(rows:SavedNumbers[]){try{localStorage.setItem(KEY,JSON.stringify(rows));window.dispatchEvent(new Event(SAVED_EVENT));}catch{throw new Error('브라우저 저장 공간을 사용할 수 없습니다. 번호를 복사해 보관해 주세요.');}}
export function saveSelectedNumbers(games:number[][],round:number,method:string){
  if(!games.length)throw new Error('저장할 조합을 먼저 선택해 주세요.');
  if(!Number.isInteger(round)||round<1||games.some(ns=>ns.length!==6||new Set(ns).size!==6||ns.some(n=>!Number.isInteger(n)||n<1||n>45)))throw new Error('올바른 번호 조합이 아닙니다.');
  const old=readSavedNumbers(),next=[...old];let added=0;
  for(const ns of games){const numbers=[...ns].sort((a,b)=>a-b);if(next.some(r=>r.round===round&&r.method===method&&r.numbers.join()===numbers.join()))continue;next.unshift({id:crypto.randomUUID(),createdAt:new Date().toISOString(),round,method,numbers});added++;}
  if(next.length>200)throw new Error('최대 200조합까지 저장할 수 있습니다. 저장 목록에서 일부 번호를 삭제해 주세요.');
  persist(next);return added;
}
export function removeSavedNumbers(id:string){persist(readSavedNumbers().filter(r=>r.id!==id));}
