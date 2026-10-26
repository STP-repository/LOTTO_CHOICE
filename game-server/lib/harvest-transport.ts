import {exposedPixels} from './puzzles';
import type {HarvestBoard,HarvestState} from './puzzles';
export interface Collection {id:number;index:number;slot:number;tokenId:number;color:number;started:number}
// Reservations never alter the saved board or counter. Reloading cancels them safely.
export function reserveCollection(p:HarvestBoard,s:HarvestState,pending:Collection[],id:number,started:number):Collection|null{
 if(s.phase!=='playing')return null;
 const locked=new Set(pending.map(v=>v.index)),exposed=exposedPixels(p,s.cells);
 for(let slot=0;slot<5;slot++){
  const token=s.slots[slot];if(!token)continue;
  if(pending.some(v=>v.slot===slot&&v.tokenId===token.id))continue;
  const index=exposed.find(i=>!locked.has(i)&&s.cells[i]===token.color);
  if(index!==undefined)return {id,index,slot,tokenId:token.id,color:token.color,started};
 }
 return null;
}
export function completeCollection(p:HarvestBoard,s:HarvestState,c:Collection):HarvestState{
 const token=s.slots[c.slot];
 if(s.phase!=='playing'||s.cells[c.index]!==c.color||!token||token.id!==c.tokenId||token.color!==c.color||token.remaining<1||!exposedPixels(p,s.cells).includes(c.index))return s;
 const cells=[...s.cells],slots=[...s.slots];cells[c.index]=-1;slots[c.slot]=token.remaining===1?null:{...token,remaining:token.remaining-1};
 return {...s,cells,slots,collected:s.collected+1,last:{index:c.index,color:c.color,slot:c.slot},phase:cells.every(v=>v<0)?'won':'playing'};
}
