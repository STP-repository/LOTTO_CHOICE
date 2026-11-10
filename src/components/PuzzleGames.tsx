import BlockPopPlay from './BlockPopPlay';
import {loadPuzzleStage,savePuzzleStage} from '../services/puzzle-progress';
import {harvestStage} from '../services/harvest-stages';
import HarvestPlay from './HarvestPlay';
import {useEffect,useRef,useState} from 'react';
import {HARVEST_VERSION,initialHarvest,placeToken} from '../core/puzzles';
import type {HarvestPuzzle,HarvestState,PuzzleKind} from '../core/puzzles';
import PuzzleRanking from './PuzzleRanking';
import {savePuzzleRecord,syncPuzzleRecords} from '../services/puzzle-records';
import type {PuzzleAction} from '../core/puzzle-proof';
import {useHarvestTransport} from './useHarvestTransport';

import '../puzzles.css';
type Run={puzzle:HarvestPuzzle;state:HarvestState;actions?:PuzzleAction[];attempt?:string};
const key='puzzles:harvest:calm-v1';
async function create(stage='1'):Promise<Run>{const puzzle=await harvestStage(stage);return {puzzle,state:initialHarvest(puzzle),actions:[],attempt:crypto.randomUUID()};}
async function load():Promise<Run>{return create(loadPuzzleStage(key));}
export default function PuzzleGames(){
 const requestIndex=useRef(0);const [loading,setLoading]=useState('');
 const [kind,setKind]=useState<PuzzleKind|'popstar'|null>(null),[run,setRun]=useState<Run|null>(null),[warning,setWarning]=useState(''),[recordMessage,setRecordMessage]=useState(''),[settled,setSettled]=useState(false),[notice,setNotice]=useState(''),[epoch,setEpoch]=useState(0);
 const enterFullscreen=()=>{const root=document.documentElement as HTMLElement&{webkitRequestFullscreen?:()=>void|Promise<void>},request=root.requestFullscreen??root.webkitRequestFullscreen;if(!request){setNotice('게임 전용 화면입니다. iPhone에서 주소창까지 숨기려면 Safari 홈 화면에 추가해 실행해 주세요.');return;}try{Promise.resolve(request.call(root)).catch(()=>setNotice('게임 전용 화면으로 표시 중입니다. 브라우저가 주소창 숨기기를 허용하지 않았습니다.'));}catch{setNotice('게임 전용 화면으로 표시 중입니다.');}};
 useEffect(()=>{try{for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i)!;if(k.startsWith('astra-room:'))sessionStorage.removeItem(k);}for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i)!;if(k.startsWith('starseed:')||k.includes('astra:'))localStorage.removeItem(k);}}catch{}},[]);
 useEffect(()=>{if(!kind)return;const a=document.body.style.overflow,b=document.documentElement.style.overflow;document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';return()=>{document.body.style.overflow=a;document.documentElement.style.overflow=b;};},[kind]);
 useEffect(()=>{if(!run)return;setWarning(savePuzzleStage(key,run.puzzle.stage,HARVEST_VERSION)?'':'진행 단계를 저장하지 못했습니다.');},[run?.puzzle.stage]);
 useEffect(()=>{if(!run||run.state.phase!=='won')return;try{savePuzzleRecord('harvest',run.puzzle.stage,run.puzzle.version,run.actions??[],run.attempt);setRecordMessage('내 기록 저장 완료 · 공개 랭킹 등록 중');void syncPuzzleRecords().then(()=>setRecordMessage('공개 랭킹 등록 완료')).catch(e=>setRecordMessage(e.message));}catch{setRecordMessage('진행도는 저장됐지만 기록 검증을 완료하지 못했습니다.');}},[run?.puzzle,run?.state.phase]);
 useEffect(()=>{setSettled(false);if(run?.state.phase!=='won')return;const t=setTimeout(()=>setSettled(true),1150);return()=>clearTimeout(t);},[run?.state.phase]);
 const {flights,arrivals,onArrive,onCancel}=useHarvestTransport(run,setRun,epoch);
 const start=async(stage?:string)=>{const request=++requestIndex.current;setKind('harvest');setRun(null);setLoading('수거 순서와 해결 가능성을 확인하는 중…');try{const next=await(stage?create(stage):load());if(requestIndex.current!==request)return;setRun(next);setLoading('');void harvestStage((BigInt(next.puzzle.stage)+1n).toString()).catch(()=>{});}catch{if(requestIndex.current===request)setLoading('퍼즐을 준비하지 못했습니다. 게임 목록으로 돌아가 다시 시도해 주세요.');}};
 const leave=()=>{requestIndex.current++;setRun(null);setKind(null);document.exitFullscreen?.().catch(()=>{});};
 if(kind==='popstar')return <BlockPopPlay onExit={leave} onFullscreen={enterFullscreen}/>;
 if(kind==='harvest'&&!run)return <section className="harvest-loading" role="status"><div>✦</div><h2>픽셀 하베스트</h2><p>{loading}</p><button onClick={leave}>게임 목록</button></section>;
 if(kind==='harvest'&&run)return <HarvestPlay puzzle={run.puzzle} state={run.state} flights={flights} arrivals={arrivals} onArrive={onArrive} onCancel={onCancel} animationKey={epoch} onPlace={id=>setRun(old=>{if(!old)return old;const state=placeToken(old.puzzle,old.state,id,arrivals.filter(a=>a.remaining===0).map(a=>a.slot));return state?{...old,state,actions:[...(old.actions??[]),{type:'place',id,slot:state.slots.findIndex(t=>t?.id===id)}]}:old;})} onRestart={()=>{setEpoch(v=>v+1);setRun({...run,state:initialHarvest(run.puzzle),actions:[],attempt:crypto.randomUUID()});}} onExit={leave} onNext={()=>{setEpoch(v=>v+1);void start((BigInt(run.puzzle.stage)+1n).toString());}} onFullscreen={enterFullscreen} notice={[warning,notice].filter(Boolean).join(' ')} recordMessage={recordMessage} settled={settled}/>;
 return <section className="puzzle-lobby"><span className="puzzle-eyebrow">LITTLE WINS, ENDLESS WORLDS</span><h2>한 판씩, 기분 좋은 완성</h2><p>두 가지 퍼즐로 최고 기록에 도전하세요.</p><div className="puzzle-cards"><button className="puzzle-card harvest" onClick={()=>{void start();enterFullscreen();}}><div className="puzzle-cover">{[-1,-1,4,-1,-1,-1,4,4,4,-1,4,4,3,4,4,-1,0,-1,0,-1,-1,-1,0,-1,-1].map((c,i)=><i key={i} style={{background:c<0?'transparent':['#ff806b','#54c8ef','#b89aff','#ffd064','#69dbb4'][c]}}/>)}</div><small>무한 스테이지 · 자동 저장</small><h3>픽셀 하베스트</h3><p>수거 순서와 다섯 개 슬롯을 계획해 그림을 완성하세요</p><strong>이어서 즐기기 →</strong></button><button className="puzzle-card popstar" onClick={()=>{setKind('popstar');enterFullscreen();}}><div className="puzzle-cover popstar-cover">{[0,0,-1,1,1,-1,0,-1,1,-1,2,2,2,-1,-1,3,-1,4,4,-1,3,-1,4,4,4].map((c,i)=><i key={i} style={{background:c<0?'#20344d':['#63dbff','#b396ff','#ffd275','#ff817b','#63e0b1'][c]}}/>)}</div><small>NEW · Block Pop Star</small><h3>블록 팝스타</h3><p>블록을 배치하고 가로·세로줄을 터뜨려 최고 점수에 도전하세요!</p><strong>최고 점수 도전 →</strong></button></div><PuzzleRanking/><p>픽셀 하베스트 · 블록 팝스타</p></section>;
}

