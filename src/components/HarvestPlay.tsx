import {useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import type {HarvestPuzzle,HarvestState,Token} from '../core/puzzles';
import {HARVEST_PALETTE,exposedPixels,harvestLane} from '../core/puzzles';
import type {Collection} from '../core/harvest-transport';
import type {Arrival} from './useHarvestTransport';
import HarvestCollection from './HarvestCollection';
import './harvest-play.css';
import {HARVEST_COLOR_NAMES as names} from '../core/harvest-art';
function boxStyle(color:number):CSSProperties{return {'--box-color':HARVEST_PALETTE[color],color:[2,6,8,12].includes(color)?'#fff':'#302c3b'} as CSSProperties;}
export default function HarvestPlay({puzzle:p,state:s,flights,arrivals,onArrive,onCancel,onPlace,onRestart,onExit,onNext,onFullscreen,notice,recordMessage,settled,animationKey}:{puzzle:HarvestPuzzle;state:HarvestState;flights:Collection[];arrivals:Arrival[];onArrive:(id:number)=>void;onCancel:(id:number)=>void;onPlace:(id:number)=>void;onRestart:()=>void;onExit:()=>void;onNext:()=>void;onFullscreen:()=>void;notice:string;recordMessage:string;settled:boolean;animationKey:number}){
 const grid=useRef<HTMLDivElement>(null),hole=useRef<HTMLDivElement>(null),[help,setHelp]=useState(false);
 const total=p.cells.filter(c=>c>=0).length,progress=s.collected/total*100,locked=new Set(flights.map(c=>c.index));
 const openColors=new Set(exposedPixels(p,s.cells).map(i=>s.cells[i]));
 const closing=new Map(arrivals.filter(a=>a.remaining===0).map(a=>[a.slot,a]));
 const full=s.slots.every((t,i)=>!!t||closing.has(i));
 const countBox=(t:Token)=> <><span className="ph-box-lid"/><small>수거 수량</small><b key={t.remaining} className="ph-count">{t.remaining}</b><span className="ph-box-shine"/></>;
 return createPortal(<section className="ph-game" aria-label="픽셀 하베스트 게임">
  <header className="ph-header"><button onClick={onExit} aria-label="게임 목록으로 나가기">‹ <span>나가기</span></button><div><small>PIXEL HARVEST</small><h2>픽셀 하베스트 <b>{p.stage}</b></h2></div><button onClick={onFullscreen}>전체화면</button></header>
  <div className="ph-workbench">
   <div className="ph-stage-info"><span>{p.theme}</span><span><b>{s.collected}</b> / {total} 수거</span></div>
   <div className="ph-progress" role="progressbar" aria-label="그림 수거 진행도" aria-valuenow={s.collected} aria-valuemin={0} aria-valuemax={total}><i style={{width:`${progress}%`}}/></div>
   <div className="ph-picture"><div ref={grid} className="ph-pixel-grid" style={{gridTemplateColumns:`repeat(${p.width},1fr)`,gridTemplateRows:`repeat(${p.height},1fr)`}} aria-label="수거할 픽셀 그림">{s.cells.map((c,i)=><div key={i} className={`ph-pixel ${c<0?'ph-empty':''}`} data-pixel-index={i} data-color={c} data-reserved={locked.has(i)||undefined} style={{'--pixel-color':c<0?'transparent':HARVEST_PALETTE[c]} as CSSProperties}/>)}</div><span className="ph-frame-glint"/></div>
   <div ref={hole} className={`ph-collector ${flights.length?'ph-collecting':''}`} aria-label="블록 수거 구멍"><i className="ph-collector-rim"/><i className="ph-collector-depth"/><i className="ph-collector-orbit"/><span>COLLECT</span></div>
   <div className="ph-slot-label"><strong>수거 중인 상자</strong><small>5개 슬롯 · 숫자 1 = 픽셀 1개</small></div>
   <div className="ph-five-slots" role="list" aria-label="숫자상자 슬롯 5개">{s.slots.map((t,i)=>{
    const end=closing.get(i);return <div key={i} role="listitem" data-slot={i} className={`ph-slot ${t?'ph-filled':''}`}>
     {t?<div className={`ph-number-box ${flights.some(c=>c.slot===i)?'ph-device-active':''}`} style={boxStyle(t.color)} aria-label={`${names[t.color]} 상자 남은 수량 ${t.remaining}`}>{countBox(t)}<span className="ph-slot-state">{openColors.has(t.color)?'수거 중':'길 열림 대기'}</span></div>:end?<div className="ph-number-box ph-box-finish" style={boxStyle(end.color)}><small>수거 완료</small><b>0</b><em>✦</em></div>:<span className="ph-empty-slot">＋<small>빈 슬롯</small></span>}
    </div>;
   })}</div>
   <div className="ph-queue-label"><strong>{s.queue.length?'다음 색을 보고 선택하세요':'마무리 수거 · 빠르게 모으는 중'}</strong><small>{full?'슬롯이 비워지면 선택할 수 있어요':'4개 줄 · 맨 위 상자만 선택'}</small></div>
   <div className="ph-box-queue ph-lane-queue" aria-label="4개 세로 대기줄 · 앞으로 4칸 미리보기">{Array.from({length:4},(_,lane)=>{
    const line=s.queue.filter(t=>harvestLane(t)===lane);return <div key={lane} className="ph-queue-lane" data-lane={lane} aria-label={`${lane+1}번째 대기줄`}><div key={line[0]?.id??'empty'} className="ph-lane-stack">{Array.from({length:4},(_,row)=>{
     const t=line[row];return t?<button key={t.id} data-token-id={t.id} data-ready={row===0} data-row={row} className={`ph-number-box ${row?'ph-preview-box':'ph-front-box'}`} style={boxStyle(t.color)} disabled={row!==0||full||s.phase!=='playing'} onClick={()=>onPlace(t.id)} aria-label={`${lane+1}번 줄 ${row+1}칸 · ${names[t.color]} 상자 ${t.remaining}개 수거${row?' · 앞 상자를 먼저 선택하세요':''}`}>{countBox(t)}{row>0&&<span className="ph-wait-mark">다음</span>}</button>:<div key={`empty:${row}`} className="ph-queue-empty" aria-hidden="true"/>;
    })}</div></div>;
   })}</div>
   <div className="ph-tail"><small>시간제한 없이 그림을 완성해요</small><div><button onClick={()=>setHelp(v=>!v)}>게임 방법</button><button onClick={onRestart}>↻ 재시작</button></div></div>
   {help&&<div className="ph-help"><b>4개 줄의 맨 위 상자 중 하나를 선택하세요.</b><p>선택한 줄의 아래 상자가 한 칸 올라옵니다. 앞으로 4칸의 색과 수량을 보고, 그림의 바깥 테두리를 먼저 열어 주세요. 안에 갇힌 색만 슬롯에 모으면 막힐 수 있어요.</p><p>숫자 1은 픽셀 1개입니다. 다 쓴 상자는 슬롯을 비우고, 모든 대기 상자를 올린 마지막 구간은 자동으로 빠르게 수거해요. 막히면 같은 판을 재시작할 수 있어요.</p></div>}
   {notice&&<p className="ph-notice" role="status">{notice}</p>}
  </div>
  <HarvestCollection key={`${p.stage}:${animationKey}`} pending={flights} width={p.width} height={p.height} cells={s.cells} grid={grid} hole={hole} onArrive={onArrive} onCancel={onCancel} finishing={s.queue.length===0}/>
  {(s.phase==='lost'||s.phase==='won'&&settled)&&<div className={`ph-result ${s.phase==='won'?'ph-celebrate':''}`} role="dialog" aria-modal="true" aria-label={s.phase==='won'?'스테이지 클리어':'다시 도전'}><div className="ph-result-card"><div className="ph-confetti">{Array.from({length:18},(_,i)=><i key={i} style={{'--n':i,'--confetti-color':HARVEST_PALETTE[i%6]} as CSSProperties}/>)}</div><span className="ph-result-star">✦</span><small>{s.phase==='won'?'PICTURE COMPLETE':'ONE MORE TRY'}</small><h2>{s.phase==='won'?'그림 수거 완료!':'다시 해도 괜찮아요'}</h2><p>{s.phase==='won'?`${p.stage}단계 · ${total}개 블록을 모두 모았어요.`:'5개 슬롯의 상자가 모두 막혔어요. 새로운 순서로 다시 도전해 보세요.'}</p><p className="ph-record">{recordMessage}</p><button onClick={s.phase==='won'?onNext:onRestart}>{s.phase==='won'?'다음 그림 →':'이 단계 다시 시작'}</button><button className="ph-secondary" onClick={onExit}>게임 목록</button></div></div>}
 </section>,document.body);
}
