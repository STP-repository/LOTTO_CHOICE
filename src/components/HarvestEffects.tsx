import {useLayoutEffect,useRef,useState} from 'react';
import type {CSSProperties,RefObject} from 'react';
import {createPortal} from 'react-dom';
import {PALETTE} from '../core/puzzles';
import type {Collection} from '../core/harvest-transport';
import './harvest-effects.css';
type Flight={id:number;x:number;y:number;dx:number;dy:number;size:number;color:string};
export default function HarvestEffects({pending,grid,hole}:{pending:Collection[];grid:RefObject<HTMLDivElement|null>;hole:RefObject<HTMLDivElement|null>}){
 const [flights,setFlights]=useState<Flight[]>([]),seen=useRef(new Set<number>()),timers=useRef(new Set<ReturnType<typeof setTimeout>>());
 useLayoutEffect(()=>{
  for(const c of pending){
   if(seen.current.has(c.id))continue;seen.current.add(c.id);
   const pixel=grid.current?.children[c.index]?.getBoundingClientRect(),target=hole.current?.getBoundingClientRect();if(!pixel||!target)continue;
   const x=pixel.x+pixel.width/2,y=pixel.y+pixel.height/2;
   const flight={id:c.id,x:x+window.scrollX,y:y+window.scrollY,dx:target.x+target.width/2-x,dy:target.y+target.height/2-y,size:Math.max(8,Math.min(30,pixel.width)),color:PALETTE[c.color]};
   setFlights(old=>[...old.slice(-11),flight]);
   const timer=setTimeout(()=>{setFlights(old=>old.filter(f=>f.id!==c.id));seen.current.delete(c.id);timers.current.delete(timer);},1150);timers.current.add(timer);
  }
 },[pending,grid,hole]);
 useLayoutEffect(()=>()=>{for(const timer of timers.current)clearTimeout(timer);timers.current.clear();},[]);
 return createPortal(<div className="harvest-fx-layer" aria-hidden="true">{flights.map(f=><div key={f.id} className="harvest-flight-origin" style={{left:f.x,top:f.y,'--dx':`${f.dx}px`,'--dy':`${f.dy}px`,'--mid-x':`${f.dx*.36+Math.sin(f.id)*22}px`,'--mid-y':`${Math.min(-32,f.dy*.14-48)}px`,'--flight-color':f.color,'--block-size':`${f.size}px`} as CSSProperties}>
  <div className="harvest-flight"><i className="harvest-flight-trail"/><i className="harvest-flying-block"><span/></i><i className="harvest-flight-star">✧</i></div>
  <div className="harvest-impact" style={{left:f.dx,top:f.dy}}><i className="harvest-impact-ring"/><i className="harvest-impact-core"/>{Array.from({length:6},(_,i)=><b key={i} style={{'--spark-x':`${Math.cos(i*Math.PI/3)*26}px`,'--spark-y':`${Math.sin(i*Math.PI/3)*18}px`} as CSSProperties}/>)}</div>
 </div>)}</div>,document.body);
}
