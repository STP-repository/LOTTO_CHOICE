import {useEffect,useRef,useState} from 'react';
import type {Dispatch,SetStateAction} from 'react';
import {harvestAvailable} from '../core/puzzles';
import type {HarvestPuzzle,HarvestState,EscapePuzzle,EscapeState} from '../core/puzzles';
import {reserveCollection,completeCollection} from '../core/harvest-transport';
import type {Collection} from '../core/harvest-transport';
import type {PuzzleAction} from '../core/puzzle-proof';
type Run=({puzzle:EscapePuzzle;state:EscapeState}|{puzzle:HarvestPuzzle;state:HarvestState})&{actions?:PuzzleAction[]};
export interface Arrival {id:number;slot:number;color:number;remaining:number}
export function useHarvestTransport(run:Run|null,setRun:Dispatch<SetStateAction<Run|null>>,epoch:number){
 const current=useRef(run),pending=useRef<Collection[]>([]),serial=useRef(0),lastStart=useRef(0),[flights,setFlights]=useState<Collection[]>([]),[arrivals,setArrivals]=useState<Arrival[]>([]);
 useEffect(()=>{current.current=run;},[run]);
 useEffect(()=>{
  pending.current=[];setFlights([]);setArrivals([]);lastStart.current=0;
  const arrivalTimers=new Set<ReturnType<typeof setTimeout>>();
  const timer=setInterval(()=>{
   const r=current.current;if(!r||r.puzzle.kind!=='harvest'||r.state.phase!=='playing'||document.hidden)return;
   const p=r.puzzle;let state=r.state as HarvestState;const now=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?180:820;
   let changed=false;const collected:PuzzleAction[]=[];
   for(const c of pending.current.filter(c=>now-c.started>=duration)){
    const next=completeCollection(p,state,c);pending.current=pending.current.filter(v=>v.id!==c.id);
    if(next!==state){collected.push({type:'collect',...c});const arrival={id:c.id,slot:c.slot,color:c.color,remaining:next.slots[c.slot]?.remaining??0};setArrivals(old=>[...old.filter(v=>v.slot!==c.slot),arrival]);const t=setTimeout(()=>{setArrivals(old=>old.filter(v=>v.id!==arrival.id));arrivalTimers.delete(t);},340);arrivalTimers.add(t);state=next;changed=true;}
   }
   const actions=[...(r.actions??[]),...collected];
   if(changed){const next={puzzle:p,state,actions};current.current=next;setRun(next);}
   if(state.phase==='playing'&&pending.current.length<3&&now-lastStart.current>190){
    const c=reserveCollection(p,state,pending.current,++serial.current,now);
    if(c){pending.current.push(c);lastStart.current=now;}
    else if(!pending.current.length&&!harvestAvailable(p,state)&&state.slots.every(Boolean)){const next={puzzle:p,state:{...state,phase:'lost' as const},actions};current.current=next;setRun(next);}
   }
   setFlights(old=>old.length===pending.current.length&&old.every((c,i)=>c.id===pending.current[i].id)?old:[...pending.current]);
  },40);
  return()=>{clearInterval(timer);for(const t of arrivalTimers)clearTimeout(t);pending.current=[];};
 },[run?.puzzle,epoch,setRun]);
 return {flights,arrivals};
}
