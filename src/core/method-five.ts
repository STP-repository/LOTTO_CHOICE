import {recentPatternProfile} from './recent-patterns';
import {validateDraws,type Draw} from './data';
import {BASE_WEIGHTS,FACTORS,buildAdvancedModel,candidateFeatures,dataSignature,numberAnalysis,sampleSix,type AdvancedModel,type Candidate} from './advanced-model';
import {rng} from './recommend';import {portfolioCoverage} from './portfolio-coverage';
export const METHOD_FIVE_VERSION='recent100-four-plus-remainder-v3';
export const METHOD_IDS=['markov','montecarlo','theory','hybrid','remaining'] as const;
export type MethodId=typeof METHOD_IDS[number];
export const METHOD_NAMES:Record<MethodId,string>={markov:'마르코프 중심',montecarlo:'몬테카를로 중심',theory:'이론분포 중심',hybrid:'세 방법 결합',remaining:'네 방식 제외 · 남은 번호'};
export const METHOD_NOTES:Record<MethodId,string>={markov:'최근 100회 번호별 0/1 상태 전이와 기존 축소 추정치를 이용한 비복원 가중 추출',montecarlo:'남은 번호에서 균등 비복원 추출하는 몬테카를로 기준선. 미래 예측 모형이 아님',theory:'홀짝×고저 네 구간의 정확한 다변량 초기하분포로 구성 수를 뽑은 뒤 구간 안에서 균등 추출',hybrid:'이론분포로 네 구간 구성 수를 뽑고, 구간 안에서 마르코프 가중치로 추출',remaining:'앞 네 조합이 사용한 24개 번호를 제외한 21개 번호에서 6개를 균등 비복원 추출. 통합 가중치·관찰 패턴 필터를 선택에 사용하지 않음'};
const choose=(n:number,k:number)=>{if(k<0||k>n)return 0;let v=1;for(let i=1;i<=k;i++)v=v*(n-i+1)/i;return Math.round(v);};
const category=(n:number)=>(n<=22?0:2)+(n%2?0:1);
function drawAvailable(random:()=>number,available:number[],weights?:number[],count=6){const pool=[...available],result:number[]=[];for(let i=0;i<count;i++){let total=pool.reduce((a,n)=>a+(weights?.[n-1]??1),0),ticket=random()*total,index=pool.findIndex(n=>(ticket-=weights?.[n-1]??1)<0);if(index<0)index=pool.length-1;result.push(pool.splice(index,1)[0]);}return result.sort((a,b)=>a-b);}
/** P(k1..k4)=product C(available_i,ki)/C(total,6). No modal-pattern exclusion. */
function stratified(random:()=>number,available:number[],weights?:number[]){const groups=Array.from({length:4},(_,i)=>available.filter(n=>category(n)===i)),compositions:{counts:number[];ways:number}[]=[];for(let a=0;a<=6;a++)for(let b=0;b<=6-a;b++)for(let c=0;c<=6-a-b;c++){const d=6-a-b-c,counts=[a,b,c,d],ways=counts.reduce((v,k,i)=>v*choose(groups[i].length,k),1);if(ways)compositions.push({counts,ways});}let ticket=random()*choose(available.length,6);const selected=compositions.find(c=>(ticket-=c.ways)<0)??compositions.at(-1)!;return selected.counts.flatMap((count,i)=>drawAvailable(random,groups[i],weights,count)).sort((a,b)=>a-b);}
function score(candidate:Candidate){return Math.max(0,candidate.features.reduce((s,v,i)=>s+v*BASE_WEIGHTS[FACTORS[i]]/100,0)-candidate.penalty);}
export function methodSeed(targetRound:number){return (0x20261102^Math.imul(targetRound,2654435761))>>>0;}
export interface MethodGame {method:MethodId;name:string;role:string;numbers:number[];referenceScore:number;attempts:number;explanation:string;odd:number;low:number;sum:number}
export interface MethodFiveResult {version:string;sourceSignature:string;historySignature:string;first:Draw;last:Draw;historyCount:number;targetRound:number;seed:number;generatedAt:string;games:MethodGame[];coverage:ReturnType<typeof portfolioCoverage>;weights:typeof BASE_WEIGHTS;numberStats:ReturnType<typeof numberAnalysis>;pattern:ReturnType<typeof recentPatternProfile>;notes:string[]}
export function generateMethodFive(input:Draw[],seed?:number,now=new Date()):MethodFiveResult{
 const all=validateDraws(input,now);if(all.length<100)throw Error('최근 100회의 확정 이력이 필요합니다.');const history=all.slice(-100),last=history.at(-1)!,runSeed=seed??methodSeed(last.round+1),model:AdvancedModel=buildAdvancedModel(history),used=new Set<number>(),games:MethodGame[]=[],pattern=recentPatternProfile(history);
 const markov=model.numbers.map(n=>n.scores[1]);
 for(let index=0;index<METHOD_IDS.length;index++){
  const method=METHOD_IDS[index],random=rng(runSeed^Math.imul(index+1,0x85ebca6b)),available=Array.from({length:45},(_,i)=>i+1).filter(n=>!used.has(n));let attempts=0,chosen:Candidate|undefined;
  while(!chosen&&attempts<10000){attempts++;const numbers=method==='theory'?stratified(random,available):method==='hybrid'?stratified(random,available,markov):drawAvailable(random,available,method==='markov'?markov:undefined);const c=candidateFeatures(numbers,model,method!=='montecarlo'&&method!=='theory');
   chosen=c;
  }
  if(!chosen)throw Error('방법별 직접 추출을 완료하지 못했습니다.');
  chosen.numbers.forEach(n=>used.add(n));games.push({method,name:METHOD_NAMES[method],role:`${String.fromCharCode(65+index)} · ${METHOD_NAMES[method]}`,numbers:chosen.numbers,referenceScore:score(chosen),attempts,explanation:METHOD_NOTES[method],odd:chosen.shape.odd,low:chosen.shape.low,sum:chosen.shape.sum});
 }
 return {version:METHOD_FIVE_VERSION,sourceSignature:dataSignature(all),historySignature:dataSignature(history),first:history[0],last,historyCount:100,targetRound:last.round+1,seed:runSeed,generatedAt:now.toISOString(),games,coverage:portfolioCoverage(games.map(g=>g.numbers)),weights:{...BASE_WEIGHTS},numberStats:model.numbers,pattern,notes:['각 조합은 번호 6개, 최종 출력은 방법별 한 조합씩 총 5조합입니다. 고정 2,000개 후보 순위에서 고르지 않습니다.','묶음 분산을 위해 앞 조합의 번호를 제외한 조건부 추출입니다. 각 역할을 단독 실행한 결과와 같다고 해석하지 않습니다.','균등 몬테카를로와 이론 층화 추출은 공정한 추첨에서 같은 균등 분포를 구현하는 서로 다른 기준선입니다. 독립적인 예측력이 입증된 두 모형이 아닙니다.','이론분포의 생성 제약은 홀짝×고저의 정확한 결합 분포입니다. 다른 특성의 참고 점수는 표시용이며 마지막 조합 선정에는 쓰지 않습니다.','다섯 번째는 앞 네 조합을 제외한 21개 번호만 사용하며 통합 추출을 대체합니다. 관찰 패턴은 참고 집계로만 보존합니다.','이전 Safety/압축 및 A~E 역할 추천은 이전 분석 경로로 보존합니다. 이 새 경로가 같은 알고리즘이라고 표시하지 않습니다.','참고 점수와 묶음의 수학적 당첨 범위는 미래 예측 성능이나 개인 1등 확률 향상의 증거가 아닙니다.']};
}
export function generateMethodFiveBefore(all:Draw[],target:Draw,seed=methodSeed(target.round)){return generateMethodFive(all.filter(d=>d.round<target.round&&d.date<target.date),seed,new Date(`${target.date}T00:00:00+09:00`));}
export {sampleSix};
