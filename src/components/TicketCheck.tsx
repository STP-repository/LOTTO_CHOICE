import {queueCloudTicketDeletion} from '../services/cloud-records';
import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import type { Dataset } from '../core/data';
import { checkGame, parseTicket, ticketDrawDate, type Ticket } from '../core/ticket';
import { Balls } from './Charts';
import {readTicketHistory,writeTicketHistory,newTicketHistory,resolveHistory,nameTicket,type TicketHistory} from '../services/ticket-history';

export default function TicketCheck({ data, onRefresh, refreshing }: { data: Dataset | null; onRefresh: () => void; refreshing: boolean }) {
  const [ticket,setTicket]=useState<Ticket|null>(null),[error,setError]=useState(''),[text,setText]=useState('');
  const [camera,setCamera]=useState(false),[starting,setStarting]=useState(false),[reading,setReading]=useState(false);
  const [history,setHistory]=useState<TicketHistory[]>(readTicketHistory),[activeId,setActiveId]=useState(''),[nameInput,setNameInput]=useState(''),[editingName,setEditingName]=useState(false),[historyNote,setHistoryNote]=useState('');
  function commitHistory(rows:TicketHistory[]){setHistory(rows);setHistoryNote(writeTicketHistory(rows)?'':'브라우저 저장을 사용할 수 없어 이번 방문에서만 이력을 확인할 수 있습니다.');}
  useEffect(()=>{setHistory(prev=>{const next=prev.map(e=>resolveHistory(e,data));if(JSON.stringify(next)!==JSON.stringify(prev)){if(!writeTicketHistory(next))setHistoryNote('갱신된 이력을 브라우저에 저장하지 못했습니다.');return next;}return prev;});},[data]);
  const video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null),generation=useRef(0);
  function stop(){generation.current++;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current)video.current.srcObject=null;setCamera(false);setStarting(false);}
  useEffect(()=>()=>{generation.current++;stream.current?.getTracks().forEach(t=>t.stop());},[]);
  useEffect(()=>{const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
  function accept(value:string){stop();try{const next=parseTicket(value),entry=newTicketHistory(next,data);commitHistory([entry,...history].slice(0,100));setActiveId(entry.id);setNameInput('');setEditingName(!!entry.results?.some(r=>r.rank));setTicket(next);setError('');}catch(e){setTicket(null);setError(e instanceof Error?e.message:String(e));}}
  function decode(source:CanvasImageSource,width:number,height:number){
    const scale=Math.min(1,1600/Math.max(width,height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('이 브라우저에서 사진을 읽을 수 없습니다.');
    ctx.drawImage(source,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    return jsQR(pixels.data,pixels.width,pixels.height)?.data;
  }
  useEffect(()=>{if(!camera)return;let timer:ReturnType<typeof setTimeout>;let active=true;
    const scan=()=>{if(!active)return;const v=video.current;try{if(v&&v.readyState>=2){const value=decode(v,v.videoWidth,v.videoHeight);if(value){accept(value);return;}}}catch{setError('카메라 화면을 읽지 못했습니다. 사진 업로드를 사용해 주세요.');stop();return;}timer=setTimeout(scan,300);};
    scan();return()=>{active=false;clearTimeout(timer);};
  },[camera]);
  async function start(){stop();const id=generation.current;setStarting(true);setError('');setTicket(null);
    try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('카메라는 HTTPS 주소에서 지원됩니다. QR 사진을 업로드해 주세요.');
      const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false});
      if(id!==generation.current){media.getTracks().forEach(t=>t.stop());return;}stream.current=media;
      if(!video.current){stop();return;}video.current.srcObject=media;await video.current.play();if(id===generation.current)setCamera(true);
    }catch(e){if(id===generation.current){stop();setError(e instanceof DOMException&&e.name==='NotAllowedError'?'카메라 권한이 거부되었습니다. 브라우저에서 허용하거나 QR 사진을 업로드해 주세요.':e instanceof Error?e.message:'카메라를 열 수 없습니다.');}}
    finally{if(id===generation.current)setStarting(false);}
  }
  async function upload(file?:File){if(!file)return;stop();setReading(true);setError('');setTicket(null);const id=generation.current;let url='';
    try{if(file.size>20_000_000)throw new Error('사진은 20MB 이하여야 합니다.');url=URL.createObjectURL(file);const img=new Image();img.src=url;await img.decode();if(id!==generation.current)return;const value=decode(img,img.naturalWidth,img.naturalHeight);if(!value)throw new Error('QR을 찾지 못했습니다. QR 부분을 크게, 선명하게 촬영해 주세요.');accept(value);
    }catch(e){if(id===generation.current)setError(e instanceof Error?e.message:'사진을 읽지 못했습니다. JPG 또는 PNG로 다시 시도해 주세요.');}finally{if(url)URL.revokeObjectURL(url);setReading(false);}
  }
  const draw=ticket?data?.draws.find(d=>d.round===ticket.round):undefined;
  const drawDate=ticket?ticketDrawDate(ticket.round):'';
  const waiting=ticket&&Date.now()<Date.parse(`${drawDate}T20:35:00+09:00`);
  const active=history.find(e=>e.id===activeId),won=!!active?.results?.some(r=>r.rank);
  function saveName(value:string){if(!active)return;commitHistory(history.map(e=>e.id===active.id?nameTicket(e,value):e));setEditingName(false);setNameInput('');}
  return <><section className="panel qr-panel"><div className="panel-head"><div><h2>QR로 내 로또 당첨 확인</h2><p>용지의 QR을 비추거나 사진을 올리면 구매 회차와 번호를 자동 비교합니다.</p></div></div>
    <div className="controls"><button className="btn btn-primary" onClick={()=>void start()} disabled={starting||camera||reading}>{starting?'카메라 연결 중…':'카메라로 QR 스캔'}</button>{(camera||starting)&&<button className="btn btn-white" onClick={stop}>카메라 중지</button>}<label className="btn btn-white">{reading?'사진 읽는 중…':'QR 사진 업로드'}<input className="qr-file" aria-label="QR 사진 업로드" type="file" accept="image/*" disabled={reading||starting} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label></div>
    <video ref={video} className={`qr-video ${camera||starting?'':'qr-hidden'}`} muted playsInline autoPlay aria-label="QR 스캔 카메라"/>{camera&&<p role="status">QR이 화면 중앙에 크게 보이도록 맞춰 주세요. 인식하면 카메라가 자동으로 꺼집니다.</p>}
    <p className="muted">사진·QR 원문은 보관하지 않습니다. 회차·구매 번호·결과·별명은 이 브라우저에 저장되며, 사이트 소유자 전용 관리 화면에도 동기화됩니다. 다른 일반 이용자에게는 공개되지 않습니다.</p>
    <details><summary>QR 주소를 직접 붙여넣기</summary><form onSubmit={e=>{e.preventDefault();stop();accept(text);}}><label className="qr-text">QR에서 읽은 주소<textarea value={text} onChange={e=>setText(e.target.value)} placeholder="https://m.dhlottery.co.kr/qr.do?method=winQr&v=…" maxLength={2048}/></label><button className="btn btn-primary" disabled={reading||!text.trim()}>당첨 확인</button></form></details>
    {error&&<p className="alert error" role="alert">{error}</p>}
  </section>{ticket&&<section className="panel qr-panel" aria-live="polite"><div className="panel-head"><div><h2>{ticket.round}회 · {ticket.games.length}게임 확인 결과</h2><p>{drawDate} 추첨 · QR에서 읽은 회차로 비교</p></div></div>
    {draw?<><p>당첨번호</p><div className="qr-winning"><Balls numbers={draw.numbers}/><span>+ 보너스</span><Balls numbers={[draw.bonus]}/></div><p className="muted">비교 데이터: {data?.source} · {data?.verified?'공식 데이터':'공식 대조 미검증 — 공식 결과를 함께 확인하세요.'}</p></>:<div className="alert warning"><p>{waiting?'추첨 대기 — 아직 추첨 시간이 되지 않았습니다.':'결과 데이터 없음 — 해당 회차의 결과가 아직 게시되지 않았거나 저장 범위에 없습니다.'}</p><button className="btn btn-white" onClick={onRefresh} disabled={refreshing}>{refreshing?'갱신 중…':'결과 데이터 새로고침'}</button></div>}
    <div className="qr-games">{ticket.games.map((numbers,i)=>{const result=draw?checkGame(numbers,draw):null;return <article className="qr-game" key={i}><div className="qr-game-head"><strong>{String.fromCharCode(65+i)}게임</strong><b className={result?.rank?'qr-prize':''}>{result?(result.rank?`${result.rank}등 당첨`:'낙첨'):(waiting?'추첨 대기':'확인 대기')}</b></div><div className="qr-numbers">{numbers.map(n=><span key={n} className={`ball ${result?.matched.includes(n)?'qr-match':result?.bonus&&n===draw?.bonus?'qr-bonus':'qr-neutral'}`}>{n}</span>)}</div>{result&&<p>당첨번호 {result.matched.length}개 일치{result.bonus?' · 보너스 일치':''}</p>}</article>;})}</div>
    {won&&active&&<div className="qr-name-box"><h3>당첨자 이름 남기기</h3><p>현재 기록: <strong>{active.name}</strong></p><p className="muted">직접 입력하지 않거나 취소하면 랜덤 별명으로 남깁니다.</p>{editingName?<form onSubmit={e=>{e.preventDefault();saveName(nameInput);}}><input aria-label="당첨 이력에 남길 이름" placeholder="이름 또는 별명 (미입력 시 랜덤)" maxLength={40} value={nameInput} onChange={e=>setNameInput(e.target.value)}/><div className="advanced-actions"><button className="btn btn-primary">이름 저장</button><button type="button" className="btn btn-white" onClick={()=>saveName('')}>랜덤 별명으로 남기기</button><button type="button" className="btn btn-white" onClick={()=>{setEditingName(false);setNameInput('');}}>취소</button></div></form>:<div className="advanced-actions"><button className="btn btn-primary" onClick={()=>setEditingName(true)}>이름 직접 남기기</button><button className="btn btn-white" onClick={()=>saveName('')}>랜덤 별명으로 남기기</button></div>}</div>}
    <p className="muted">초록 테두리: 당첨번호 일치 · 주황 테두리: 보너스 일치. 지급 여부는 원본 복권과 동행복권 공식 결과로 최종 확인하세요.</p><a href="https://www.dhlottery.co.kr/" target="_blank" rel="noreferrer">동행복권 공식 결과 확인 ↗</a>
  </section>}<section className="panel qr-panel"><div className="panel-head"><div><h2>QR 확인 이력</h2><p>최근 100건 · 추첨 대기 복권도 결과 데이터가 있으면 다시 비교합니다.</p></div></div>{historyNote&&<p className="alert warning">{historyNote}</p>}{!history.length?<p className="muted">아직 확인한 복권이 없습니다.</p>:<div className="qr-history-list">{history.map(entry=>{const ranks=entry.results?.flatMap(r=>r.rank?[r.rank]:[])??[],best=ranks.length?Math.min(...ranks):null;return <article className="qr-history-entry" key={entry.id}><div className="qr-game-head"><strong>{entry.ticket.round}회 · {entry.ticket.games.length}게임</strong><b className={best?'qr-prize':''}>{best?`최고 ${best}등 당첨`:entry.results?'낙첨':'결과 대기'}</b></div><p className="muted">{new Date(entry.checkedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} KST{best?` · 당첨자: ${entry.name}`:''}</p><details><summary>구매 번호와 게임별 결과</summary>{entry.ticket.games.map((ns,i)=><p key={i}>{String.fromCharCode(65+i)}: {ns.join(' · ')} — {entry.results?(entry.results[i].rank?`${entry.results[i].rank}등`:'낙첨'):'결과 대기'}</p>)}<p className="muted">출처: {entry.source||'결과 없음'} · {entry.verified?'공식 데이터':'공식 대조 미검증'}</p></details><div className="advanced-actions"><button className="btn btn-white" onClick={()=>{stop();setTicket(entry.ticket);setActiveId(entry.id);setEditingName(false);setNameInput('');}}>다시 보기{best?' · 이름 관리':''}</button><button className="btn btn-white" onClick={()=>{queueCloudTicketDeletion(entry.id);commitHistory(history.filter(e=>e.id!==entry.id));if(activeId===entry.id)setActiveId('');}}>이력 삭제</button></div></article>;})}</div>}</section></>;
}
