import {validateDraws,type Draw,type Dataset} from '../core/data';
import {dataSignature,ANALYSIS_VERSION,BASE_WEIGHTS,FACTORS,overlap,type advancedGenerate} from '../core/advanced-model';
import {validCombination} from '../core/combination-groups';
import type {Mode,RecommendedGame} from '../core/recommend';
let generation=0;
export const invalidatePrecomputed=()=>{generation++;};
export async function precomputedRecommendations(draws:Draw[],mode:Mode,count:number,_scope:'all'='all'){
 const epoch=generation,r=await fetch(`${import.meta.env?.BASE_URL??'/'}data/ranked-results.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw Error('사전 분석 결과를 불러오지 못했습니다.');
 const saved=await r.json();if(epoch!==generation)throw Error('데이터가 갱신되었습니다. 다시 생성해 주세요.');
 if(saved.version!==3||saved.scopes.all.signature!==dataSignature(draws))throw Error('현재 전체 회차에 맞는 사전 분석이 준비되지 않았습니다. 이전 결과는 표시하지 않습니다.');
 const result=saved.scopes.all.results[mode] as RecommendedGame[];if(!result||result.length<count)throw Error('선택한 수의 사전 추천이 준비되지 않았습니다.');return structuredClone(result.slice(0,count));
}
export type Generated=ReturnType<typeof advancedGenerate>;
export function validateSnapshot(data:Dataset,cached:{signature:string;version:string},result:Generated,count:number,path:string){
 const draws=validateDraws(data.draws),signature=dataSignature(draws),s=result?.snapshot;
 if(s&&(s.lastDrawDate!==draws.at(-1)!.date||!Number.isFinite(Date.parse(s.generatedAt))||FACTORS.some(k=>result.weights[k]!==BASE_WEIGHTS[k])||result.games.some((g,i)=>!validCombination(g.numbers)||!Number.isFinite(g.score)||Math.abs(g.score-Math.max(0,FACTORS.reduce((sum,k)=>sum+g.features[k]*result.weights[k]/100,0)-g.penalty))>1e-8||result.games.slice(0,i).some(h=>overlap(g.numbers,h.numbers)>3))))throw Error('분석 조합과 점수 검증에 실패했습니다.');
 if(!data.verified||draws[0].round!==1||cached.version!==ANALYSIS_VERSION||cached.signature!==signature||!s||s.signature!==signature||s.lastRound!==draws.at(-1)!.round||s.targetRound!==s.lastRound+1||s.count!==count||result.games.length!==count||s.path!==path||s.settingsVersion!==ANALYSIS_VERSION||s.seed!==result.seed||s.budget!==result.budget)throw Error('입력 회차·설정과 추천 스냅샷이 다릅니다. 최신 분석을 기다려 주세요.');
 return result;
}
