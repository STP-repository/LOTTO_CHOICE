import {useEffect,useRef,useState} from 'react';
import {recommendationIdentity,type generateRecommendationPack} from '../core/combined-formulas';
import type {Dataset} from '../core/data';
import {dataSignature} from '../core/advanced-model';
import {parseFilterNumbers} from '../core/frequency-filter-five';
import {loadMethodFive} from '../services/method-five';
import {saveSelectedNumbers} from '../services/saved-numbers';
import {Balls} from './Charts';
import DrawAnimation from './DrawAnimation';
import {IntegratedBacktest} from './MethodHits';

type CombinedResult = ReturnType<typeof generateRecommendationPack>;
const relaxation = ['기본 필터', '합계 78~198까지 확대', '합계 78~198 · 이월수 최대 3개', '합계 78~198 · 이월수 최대 3개 · AC 6 이상'];

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
 const games=result?[
  ...result.markov.games.map((game,i)=>({...game,slot:String.fromCharCode(65+i),label:'마르코프·몬테카를로·이론분포',
   explanation:'핫 '+game.counts[0]+' · 중립 '+game.counts[1]+' · 콜드 '+game.counts[2]+' · 점수 '+game.score.toFixed(2)})),
  ...result.integrated.games.map((game,i)=>({...game,slot:String.fromCharCode(70+i),label:'A~H 통합 공식',
   explanation:'핫 '+game.counts[0]+' · 중립 '+game.counts[1]+' · 콜드 '+game.counts[2]+' · 점수 '+game.score.toFixed(2)+' · 인기도 '+game.popularity})),
 ]:[];
 const busy=calculating||animating;
 function clear(){setResult(null);setSelected([]);setNote('');}
 function show(pack:CombinedResult){
  lastPack.current=recommendationIdentity(pack);
  setResult(pack);setAnimating(pack.integrated.games.length+pack.markov.games.length>0);
 }
 function recommend(newSeed:boolean){
  if(!file||!r||busy)return;
  clear();setFresh(newSeed);
  try{
   const fixedNumbers=parseFilterNumbers(fixed),excludedNumbers=parseFilterNumbers(excluded);
   const seed=newSeed?crypto.getRandomValues(new Uint32Array(1))[0]:r.seed;
   const upcoming=file.hits.upcoming;
   const prepared=upcoming&&'integrated' in upcoming?upcoming:undefined;
   if(!newSeed&&!fixedNumbers.length&&!excludedNumbers.length&&prepared?.targetRound===r.targetRound&&prepared.seed===seed){show(prepared);return;}
   const avoid=newSeed?[lastPack.current,...(prepared?[recommendationIdentity(prepared)]:[])].filter(Boolean):[];
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
   <h2>두 공식으로 추천 10조합</h2>
   <p role="status">{r?'제'+r.targetRound+'회 대상 · 제'+r.last.round+'회까지 반영':error||'확정 당첨 기록을 불러오는 중…'}</p>
   <h3>A~E · 마르코프·몬테카를로·이론분포</h3>
   <p>직전 본번호에서 3개 이상 나온 번호대가 다시 3개 이상 들어가는 조합은 A~E 중 최대 한 장입니다. 번호대는 1~9, 10~19, 20~29, 30~39, 40~45 기준입니다.</p>
   <p>전체 회차의 번호 간 전이확률과 최근 100회 빈도 점수를 50:50으로 합쳐 100만 회 추출합니다. 이론분포 필터를 통과한 조합을 번호별 시뮬레이션 출현율의 로그 합과 핫·중립·콜드 2:2:2에 가까운 정도로 채점해 최대 5장을 선정합니다.</p>
   <h3>F~J · A~H 통합 공식</h3>
   <p>마르코프 50%와 최근 100회 빈도 50%에 베이지안 보정을 적용합니다. 가상 추첨 100만 회에서 후보를 만든 뒤 통계 점수 30%, 비인기 점수 35%, 커버리지 35%로 5조합을 고릅니다.</p>
   <details><summary>두 공식의 필터 상세</summary>
    <p>기본 조건은 연속번호 최대 1쌍, 한 번호 구간에 최대 3개, 같은 끝자리 최대 2개, 직전 본번호와 최대 2개 겹침, 역대 1등 조합 제외입니다. F~J 후보에서 A~E와 동일한 6개 번호 조합을 제외합니다.</p>
    <p>두 공식 모두 기본 합계 108~168을 적용합니다. 필요하면 합계 78~198, 이월수 3개 허용, AC 6 이상 순서로 완화합니다. F~J는 고정수를 제외한 공통 번호가 두 장 사이 최대 2개이고, 다섯 구간에서 각각 4개 이상을 덮어야 합니다. 전체 커버리지 목표는 26개이며 고정수에 따라 조정됩니다.</p>
   </details>
   <fieldset disabled={busy||!r}><legend>고정수·제외수 (선택)</legend><div className="controls">
    <label>고정수 (전체 10조합을 받으려면 최대 2개)<input value={fixed} placeholder="예시 3, 11" onChange={e=>{setFixed(e.target.value);clear();}}/></label>
    <label>제외수<input value={excluded} placeholder="예시 2, 19" onChange={e=>{setExcluded(e.target.value);clear();}}/></label>
   </div></fieldset>
   <div className="controls">
    <button type="button" className="btn btn-primary" disabled={busy||!r} onClick={()=>recommend(false)}>메인 추천번호</button>
    <button type="button" className="btn btn-white" disabled={busy||!r} onClick={()=>recommend(true)}>새로운 시드번호 받기</button>
   </div>
   <p className="muted">조건을 비운 메인 추천은 대시보드와 같습니다. 새 시드 추천은 두 공식을 다시 실행합니다. 조건에 따라 10장보다 적을 수 있습니다.</p>
   {calculating&&<p role="status">100만 회 시뮬레이션 계산 중…</p>}
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
   <p>기준 제{result.markov.lastRound}회 · 공식별 시뮬레이션 {result.markov.simulations.toLocaleString()}회 · 시드 {result.seed}</p>
   <p>핫수 {result.markov.hot.join(' · ')||'없음'} / 콜드수 {result.markov.cold.join(' · ')||'없음'}</p>
   <p>A~E 적용 필터 · {relaxation[result.markov.relaxed]}</p>
   <p>F~J 편향 검정 · χ² {result.integrated.chiSquare.toFixed(2)} · p {result.integrated.p.toFixed(4)} · {result.integrated.p<0.05?'편향 검정 기준 통과':'편향 증거 부족'}</p>
   {result.integrated.theoretical!==null?<p>F~J · {relaxation[result.integrated.relaxed]} · 커버 {result.integrated.unique}/30개 · 최대 공통 {result.integrated.maxCommon}개 · 한 장 이상 5등 이상 이론 확률 {(100*result.integrated.theoretical).toFixed(2)}%</p>
    :<p>F~J 커버리지 조건을 충족한 세트를 찾지 못했습니다. 고정수 3개 이상이면 5개 구간을 각각 4개씩 덮을 수 없습니다.</p>}
   {games.length<10&&<p role="status">조건을 충족한 {games.length}조합을 표시했습니다.</p>}
   <div className="controls">
    <button type="button" className="btn btn-primary" disabled={!selected.length} onClick={()=>{
     try{
      const count=saveSelectedNumbers(selected.map(index=>games[index].numbers),r.targetRound,'두 공식 추천',{
       signature:r.sourceSignature,settingsVersion:'combined-formulas-v2',seed:result.seed,budget:result.markov.simulations,
       count:games.length,path:'combined-formulas',lastRound:r.last.round,targetRound:r.targetRound,generatedAt:r.generatedAt,lastDrawDate:r.last.date});
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
  {r&&result&&!animating&&<IntegratedBacktest/>}
 </div>;
}
