import type {Dataset} from '../core/data';
import {checkGame,type Ticket} from '../core/ticket';
export interface TicketHistory {id:string;checkedAt:string;ticket:Ticket;results:ReturnType<typeof checkGame>[]|null;source:string;verified:boolean;name:string}
const KEY='lotto-best-choice:qr-history:v1';
export function randomAlias(){const a=['통통 튀는','반짝이는','느긋한','신나는','초록빛','씩씩한'],b=['수달','토끼','고양이','펭귄','다람쥐','별'];const r=crypto.getRandomValues(new Uint32Array(3));return `${a[r[0]%a.length]} ${b[r[1]%b.length]} ${String(r[2]%1000).padStart(3,'0')}`;}
function valid(t:Ticket){return t&&Number.isInteger(t.round)&&t.round>0&&t.round<=9999&&Array.isArray(t.games)&&t.games.length>0&&t.games.length<=5&&t.games.every(g=>Array.isArray(g)&&g.length===6&&new Set(g).size===6&&g.every(n=>Number.isInteger(n)&&n>=1&&n<=45));}
export function readTicketHistory():TicketHistory[]{try{const rows=JSON.parse(localStorage.getItem(KEY)??'[]');return Array.isArray(rows)?rows.filter(r=>r&&typeof r.id==='string'&&Number.isFinite(Date.parse(r.checkedAt))&&valid(r.ticket)).slice(0,100).map(r=>({...r,name:typeof r.name==='string'?r.name.slice(0,40):'',results:Array.isArray(r.results)&&r.results.length===r.ticket.games.length&&r.results.every((x:{rank:unknown;matched:unknown;bonus:unknown})=>x&&(x.rank===null||[1,2,3,4,5].includes(Number(x.rank)))&&Array.isArray(x.matched)&&typeof x.bonus==='boolean')?r.results:null})):[];}catch{return [];}}
export function writeTicketHistory(rows:TicketHistory[]){try{localStorage.setItem(KEY,JSON.stringify(rows.slice(0,100)));return true;}catch{return false;}}
export function resolveHistory(entry:TicketHistory,data:Dataset|null):TicketHistory{
  const draw=data?.draws.find(d=>d.round===entry.ticket.round);const results=draw?entry.ticket.games.map(ns=>checkGame(ns,draw)):entry.results;
  return {...entry,results,source:draw?data!.source:entry.source,verified:draw?data!.verified:entry.verified,name:results?.some(r=>r.rank!==null)?entry.name||randomAlias():entry.name};
}
export function newTicketHistory(ticket:Ticket,data:Dataset|null):TicketHistory{return resolveHistory({id:crypto.randomUUID(),checkedAt:new Date().toISOString(),ticket:structuredClone(ticket),results:null,source:'',verified:false,name:''},data);}
export function nameTicket(entry:TicketHistory,value:string):TicketHistory{return {...entry,name:value.trim().slice(0,40)||randomAlias()};}
