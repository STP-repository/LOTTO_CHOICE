import {useLayoutEffect,useRef,useState} from 'react';
import type {CSSProperties,RefObject} from 'react';
import {createPortal} from 'react-dom';
import {HARVEST_PALETTE as PALETTE} from '../core/puzzles';
import type {Collection} from '../core/harvest-transport';
import './harvest-effects.css';
import {collectionRoute} from '../core/harvest-path';
type Flight={id:number;x:number;y:number;dx:number;dy:number;size:number;color:string;points:{x:number;y:number}[]};
export default function HarvestEffects({pending,grid,hole,width,height,cells}:{width:number;height:number;cells:number[];pending:Collection[];grid:RefObject<HTMLDivElement|null>;hole:RefObject<HTMLDivElement|null>}){
 const [flights,setFlights]=useState<Flight[]>([]),seen=useRef(new Set<number>()),timers=useRef(new Set<ReturnType<typeof setTimeout>>());
 useLayoutEffect(()=>{
  for(const c of pending){
   if(seen.current.has(c.id))continue;seen.current.add(c.id);
   const pixel=grid.current?.children[c.index]?.getBoundingClientRect(),target=hole.current?.getBoundingClientRect();if(!pixel||!target)continue;
   const x=pixel.x+pixel.width/2,y=pixel.y+pixel.height/2,rect=grid.current!.getBoundingClientRect(),stepX=(rect.width-12)/width,stepY=(rect.height-12)/height;const route=collectionRoute(width,height,cells,c.index);if(!route.length)continue;const points=route.map(p=>({x:rect.x+6+(p.x+.5)*stepX-x,y:rect.y+6+(p.y+.5)*stepY-y}));points.push({x:target.x+target.width/2-x,y:target.y+target.height/2-y});
   const flight={id:c.id,x:x+window.scrollX,y:y+window.scrollY,dx:target.x+target.width/2-x,dy:target.y+target.height/2-y,size:Math.max(8,Math.min(30,pixel.width)),color:PALETTE[c.color],points};
   setFlights(old=>[...old.slice(-11),flight]);
   const timer=setTimeout(()=>{setFlights(old=>old.filter(f=>f.id!==c.id));seen.current.delete(c.id);timers.current.delete(timer);},1150);timers.current.add(timer);
  }
 },[pending,grid,hole]);
 useLayoutEffect(()=>()=>{for(const timer of timers.current)clearTimeout(timer);timers.current.clear();},[]);
 return createPortal(<div className="harvest-fx-layer" aria-hidden="true">{flights.map(f=><div key={f.id} className="harvest-flight-origin" style={{left:f.x,top:f.y,'--dx':`${f.dx}px`,'--dy':`${f.dy}px`,'--mid-x':`${f.dx*.36+Math.sin(f.id)*22}px`,'--mid-y':`${Math.min(-32,f.dy*.14-48)}px`,'--flight-color':f.color,'--block-size':`${f.size}px`} as CSSProperties}>
  <div className="harvest-flight harvest-ground-route" ref={el=>{if(!el||el.dataset.running)return;el.dataset.running="1";const distances=f.points.map((p,i)=>i?Math.hypot(p.x-f.points[i-1].x,p.y-f.points[i-1].y):0);const total=distances.reduce((a,b)=>a+b,0)||1;let travelled=0;const frames=f.points.map((p,i)=>{travelled+=distances[i];return {transform:`translate(${p.x}px,${p.y}px) scale(${i===f.points.length-1?.08:1})`,opacity:i===f.points.length-1?0:1,offset:travelled/total};});el.animate(frames,{duration:670,delay:150,fill:"both",easing:"linear"});}}><i className="harvest-flight-trail"/><i className="harvest-flying-block"><span/></i><i className="harvest-flight-star">✧</i></div>
  <div className="harvest-impact" style={{left:f.dx,top:f.dy}}><i className="harvest-impact-ring"/><i className="harvest-impact-core"/>{Array.from({length:6},(_,i)=><b key={i} style={{'--spark-x':`${Math.cos(i*Math.PI/3)*26}px`,'--spark-y':`${Math.sin(i*Math.PI/3)*18}px`} as CSSProperties}/>)}</div>
 </div>)}</div>,document.body);
}
