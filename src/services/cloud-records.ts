import {currentProfile,personalStorage} from './profiles';
const DELETIONS='lotto-best-choice:cloud-ticket-deletions:v1';
export function queueCloudTicketDeletion(id:string){try{const ids=JSON.parse(personalStorage.getItem(DELETIONS)||'[]');personalStorage.setItem(DELETIONS,JSON.stringify([...new Set([...ids,id])].slice(-100)));}catch{}}
const ENDPOINT='https://starseed-guardians-coop-20261022.fairfig7.chatgpt.site/api/records';
const NAMES='lotto-best-choice:recent-game-names:v1',HISTORY='lotto-best-choice:qr-history:v1',ROSTER='lotto-best-choice:active-game-roster:v1',TOKEN='lotto-best-choice:cloud-token:v1';
/** Only the active profile's own records leave this browser; credentials stay profile-scoped. */
export function startCloudRecords(){
 const profile=currentProfile();let token:string;
 try{token=personalStorage.getItem(TOKEN)||'';if(!token){token=crypto.randomUUID()+crypto.randomUUID();personalStorage.setItem(TOKEN,token);}}catch{return;}
 let running=false,pending=false,last='',timer:ReturnType<typeof setTimeout>|undefined;
 const read=(key:string,fallback:any)=>{try{return JSON.parse(personalStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
 async function sync(){if(running){pending=true;return;}if(!navigator.onLine)return;running=true;
  try{const deleted=read(DELETIONS,[]),names=read(NAMES,[]),tickets=read(HISTORY,[]),name=currentProfile().name,hash=JSON.stringify({names,tickets,name});const changed=hash!==last;
   const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({epoch:Number(localStorage.getItem("lotto-best-choice:identity-epoch:v1")||0),id:profile.id,token,name,names:changed?names:[],tickets:changed?tickets:[],deleteTickets:deleted}),signal:AbortSignal.timeout(12000)});
   if(!res.ok)return;const data=await res.json();last=hash;if(deleted.length){const pending=read(DELETIONS,[]).filter((id:string)=>!deleted.includes(id));personalStorage.setItem(DELETIONS,JSON.stringify(pending));}
   const transform=(name:string)=>{const c=data.nameChanges?.find((n:any)=>n.name===name||n.replacement===name);return c?.deleted?null:c?.replacement??name;};
   const nextNames=[...new Set((Array.isArray(names)?names:[]).map(transform).filter(Boolean))];
   if(JSON.stringify(nextNames)!==JSON.stringify(names))personalStorage.setItem(NAMES,JSON.stringify(nextNames));
   const nextTickets=(Array.isArray(tickets)?tickets:[]).filter((t:any)=>!data.ticketChanges?.some((c:any)=>c.id===t.id&&c.deleted)).map((t:any)=>{const c=data.ticketChanges?.find((c:any)=>c.id===t.id&&c.alias_override!==null);return c?{...t,name:c.alias_override}:t;});
   if(JSON.stringify(nextTickets)!==JSON.stringify(tickets))personalStorage.setItem(HISTORY,JSON.stringify(nextTickets));
   const roster=read(ROSTER,null);if(roster?.names){const next:any={names:[],selected:[]};roster.names.forEach((name:string,i:number)=>{const value=transform(name);if(value!==null){if(roster.selected?.includes(i))next.selected.push(next.names.length);next.names.push(value);}});if(JSON.stringify(next)!==JSON.stringify(roster))personalStorage.setItem(ROSTER,JSON.stringify(next));}
  }catch{/* Local features stay usable when the record service is unavailable. */}finally{running=false;if(pending){pending=false;schedule();}}
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(()=>void sync(),800);}
 window.addEventListener('lotto:personal-change',schedule);window.addEventListener('online',schedule);document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});setInterval(()=>{if(!document.hidden)void sync();},60000);schedule();
}
