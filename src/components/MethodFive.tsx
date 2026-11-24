import {useEffect,useRef,useState} from 'react';
import {selectedIdentity,type generateSelectedFive} from '../core/selected-five';
import type {Dataset} from '../core/data';
import {dataSignature} from '../core/advanced-model';
import {parseFilterNumbers} from '../core/frequency-filter-five';
import {loadMethodFive} from '../services/method-five';
import {saveSelectedNumbers} from '../services/saved-numbers';
import {Balls} from './Charts';
import DrawAnimation from './DrawAnimation';
import {SelectedHistory} from './MethodHits';

type CombinedResult = ReturnType<typeof generateSelectedFive>;


export default function MethodFive({fallback}:{fallback:Dataset|null}) {
 const signature=fallback?dataSignature(fallback.draws):'';
 const worker=useRef<Worker|null>(null);
 const lastPack=useRef('');
 const [file,setFile]=useState<Awaited<ReturnType<typeof loadMethodFive>>|null>(null);
 const [result,setResult]=useState<CombinedResult|null>(null);
 const [fixed,setFixed]=useState(''),[excluded,setExcluded]=useState('');
 const [error,setError]=useState(''),[note,setNote]=useState('');
 const [calculating,setCalculating]=useState(false),[animating,setAnimating]=useState(false);
 const [selected,setSelected]=useState<number[]>([]);
 const [fresh,setFresh]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  lastPack.current='';
  setFile(null);setResult(null);setSelected([]);setError('');setNote('');setCalculating(false);setAnimating(false);
  loadMethodFive(fallback,controller.signal).then(setFile).catch(e=>{if(!controller.signal.aborted)setError((e as Error).message);});
  return ()=>{controller.abort();worker.current?.terminate();worker.current=null;};
 },[signature]);
 const r=file?.result;
 const games=result?.games??[];
 const busy=calculating||animating;
 function clear(){setResult(null);setSelected([]);setNote('');}
 function show(pack:CombinedResult){
  lastPack.current=selectedIdentity(pack);
  setResult(pack);setAnimating(pack.games.length>0);
 }
 function recommend(newSeed:boolean){
  if(!file||!r||busy)return;
  clear();setFresh(newSeed);
  try{
   const fixedNumbers=parseFilterNumbers(fixed),excludedNumbers=parseFilterNumbers(excluded);
   const seed=newSeed?crypto.getRandomValues(new Uint32Array(1))[0]:r.seed;
   const prepared=file.hits.selected?.upcoming;
   if(!newSeed&&!fixedNumbers.length&&!excludedNumbers.length&&prepared?.targetRound===r.targetRound&&prepared.seed===seed){show(prepared);return;}
   const avoid=newSeed?[lastPack.current,...(prepared?[selectedIdentity(prepared)]:[])].filter(Boolean):[];
   const task=new Worker(new URL('../workers/markov-monte-carlo.worker.ts',import.meta.url),{type:'module'});
   worker.current=task;setCalculating(true);
   const finish=()=>{task.terminate();worker.current=null;setCalculating(false);};
   task.onmessage=({data}:MessageEvent<CombinedResult|{error:string}>)=>{
    finish();if('error' in data)setNote(data.error);else show(data);
   };
   task.onerror=()=>{finish();setNote('시뮬레이션을 완료하지 못했습니다. 다시 시도해 주세요.');};
   task.postMessage({history:file.draws,seed,fixed:fixedNumbers,excluded:excludedNumbers,avoid});
  }catch(e){worker.current?.terminate();worker.current=null;setCalculating(false);setNote((e as Error).message);}
 }
 return <div className="method-five">
  <section className="panel">
   <h2>다섯 방식으로 추천 5조합</h2>
   <p role="status">{r?'제'+r.targetRound+'회 대상 · 제'+r.last.round+'회까지 반영':error||'확정 당첨 기록을 불러오는 중…'}</p>
   <p>빈도 가중 필터·베이지안 추정·평균회귀·동반 출현 번호쌍·과거 조합 형태 재현에서 한 장씩 생성합니다.</p>
   <p className="muted">과거 결과를 보고 선택한 시드 설정을 사용합니다. 과거 재현 등수는 미래 당첨 확률의 증거가 아닙니다.</p>
   <fieldset disabled={busy||!r}><legend>고정수·제외수 (선택)</legend><div className="controls">
    <label>고정수 (최대 5개)<input value={fixed} placeholder="예시 3, 11" onChange={e=>{setFixed(e.target.value);clear();}}/></label>
    <label>제외수<input value={excluded} placeholder="예시 2, 19" onChange={e=>{setExcluded(e.target.value);clear();}}/></label>
   </div></fieldset>
   <div className="controls">
    <button type="button" className="btn btn-primary" disabled={busy||!r} onClick={()=>recommend(false)}>메인 추천번호</button>
    <button type="button" className="btn btn-white" disabled={busy||!r} onClick={()=>recommend(true)}>새로운 시드번호 받기</button>
   </div>
   <p className="muted">조건을 비운 메인 추천은 대시보드와 같습니다. 새 시드는 다섯 방식의 번호를 다시 생성합니다.</p>
   {calculating&&<p role="status">다섯 방식의 추천번호 생성 중…</p>}
   {!result&&note&&<p role="alert">{note}</p>}
  </section>
  {animating&&games.length>0&&<DrawAnimation key={result?.seed} numbers={games[0].numbers} games={games.length} onComplete={()=>setAnimating(false)}/>}
  {r&&result&&!animating&&<section className="panel">
   <h2>제{r.targetRound}회 · {fresh?'새 시드 추천':'메인 추천'} {games.length}조합</h2>
   <div className="choice-results">{games.map((game,index)=><article className="choice-ticket" key={game.slot}>
    <div className="ticket-meta"><strong>{game.slot} · {game.label}</strong><label className="pick-game">
     <input type="checkbox" aria-label={game.slot+' 조합 선택'} checked={selected.includes(index)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,index]:prev.filter(n=>n!==index))}/>이 조합 선택
    </label></div><Balls numbers={game.numbers}/>
    <small>합계 {game.sum} · 홀짝 {game.odd}:{6-game.odd} · 저고 {game.low}:{6-game.low} · AC {game.ac}</small>
    {game.explanation&&<p className="muted">{game.explanation}</p>}
   </article>)}</div>
   <p>기준 제{result.lastRound}회 · 시드 {result.seed}</p>
   <div className="controls">
    <button type="button" className="btn btn-primary" disabled={!selected.length} onClick={()=>{
     try{
      const count=saveSelectedNumbers(selected.map(index=>games[index].numbers),r.targetRound,'다섯 방식 추천',{
       signature:r.sourceSignature,settingsVersion:result.version,seed:result.seed,budget:0,
       count:games.length,path:'selected-five',lastRound:r.last.round,targetRound:r.targetRound,generatedAt:r.generatedAt,lastDrawDate:r.last.date});
      setNote(count+'조합을 저장했습니다.');
     }catch(e){setNote((e as Error).message);}
    }}>선택한 {selected.length}조합 저장</button>
    <button type="button" className="btn btn-white" disabled={!games.length} onClick={async()=>{
     try{await navigator.clipboard.writeText(games.map(g=>g.slot+' · '+g.numbers.join(', ')).join('\n'));setNote(games.length+'조합을 복사했습니다.');}
     catch{setNote('복사 권한을 확인해 주세요.');}
    }}>{games.length}조합 복사</button>
   </div>
   <p role="status">{note}</p>
   <p className="muted">※ 모든 조합의 1등 확률은 1/8,145,060로 같습니다. 참고용입니다.</p>
  </section>}
  {r&&result&&!animating&&<SelectedHistory data={file?.hits.selected}/>}
 </div>;
}
