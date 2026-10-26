import type {Candidate,Prepared,Weights} from './advanced-model';
import type {Draw} from './data';
import theory from './theory-distributions.json';
export const GROUP_LABELS={odd:'홀짝',low:'고저',sum:'합계 구간',consecutive:'연속번호',ranges:'번호 구간',ac:'AC 구간',endings:'동일 끝수',spacing:'번호 간격'};
export type GroupKey=keyof typeof GROUP_LABELS;
export function groupKeys(s:Candidate['shape']):Record<GroupKey,string>{return {odd:String(s.odd),low:String(s.low),sum:String(Math.floor(s.sum/20)),consecutive:String(s.consecutive),ranges:s.ranges,ac:String(Math.floor(s.ac/2)),endings:String(s.endings),spacing:`${Math.floor(s.gapMean/2)}:${Math.floor(s.gapSd/3)}`};}
export function wilson(hits:number,n:number){if(!n)return [0,1];const z=1.95996398454,p=hits/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,r=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [Math.max(0,c-r),Math.min(1,c+r)];}
export const validCombination=(ns:number[])=>ns.length===6&&new Set(ns).size===6&&ns.every((n,i)=>Number.isInteger(n)&&n>=1&&n<=45&&(!i||n>ns[i-1]));
const factorOrder=['frequency','markov','bayes','deviation','balance','sum','ranges','patterns','spacing','diversity'] as const;
export const candidateScore=(c:Candidate,w:Weights)=>Math.max(0,c.features.reduce((s,v,i)=>s+v*w[factorOrder[i]]/100,0)-c.penalty);
export function groupReport(candidates:Candidate[],past:Candidate['shape'][],weights:Weights){
 const keys=Object.keys(GROUP_LABELS) as GroupKey[];
 return keys.flatMap(factor=>{
  const historical=new Map<string,number>(),sample=new Map<string,number[]>();
  for(const s of past){const k=groupKeys(s)[factor];historical.set(k,(historical.get(k)??0)+1);}
  for(const c of candidates){const k=groupKeys(c.shape)[factor];const a=sample.get(k)??[];a.push(candidateScore(c,weights));sample.set(k,a);}
  const theoretical=(theory.hist as Record<string,Record<string,number>>)[factor]??{};
  return [...new Set([...Object.keys(theoretical),...historical.keys(),...sample.keys()])].sort().map(group=>{const scores=sample.get(group)??[],count=historical.get(group)??0,expected=(theoretical[group]??0)/theory.total;return {factor,label:GROUP_LABELS[factor],group,candidates:scores.length,theoretical:expected,historical:past.length?count/past.length:0,difference:(past.length?count/past.length:0)-expected,ci:wilson(count,past.length),scoreMean:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null,scoreMin:scores.length?scores.reduce((a,b)=>Math.min(a,b),Infinity):null,scoreMax:scores.length?scores.reduce((a,b)=>Math.max(a,b),-Infinity):null};});
 });
}
export type SelectionPath='standard'|'compressed';
export function compressCandidates(prepared:Prepared,weights:Weights,count:number){
 const records:{numbers:number[];reason:string;restored:boolean}[]=[],valid=prepared.candidates.filter(c=>{if(validCombination(c.numbers))return true;records.push({numbers:c.numbers,reason:'번호 유효성 위반',restored:false});return false;});
 const excluded=valid.filter(c=>c.flagged),kept=valid.filter(c=>!c.flagged),restored:Candidate[]=[];
 // Independent bias control: compare each marginal group with its exact uniform share.
 const frequencies=new Map<string,number>();
 for(const s of prepared.model.shapes)for(const [f,g]of Object.entries(groupKeys(s)))frequencies.set(`past:${f}:${g}`,(frequencies.get(`past:${f}:${g}`)??0)+1);
 for(const c of kept)for(const [f,g]of Object.entries(groupKeys(c.shape)))frequencies.set(`kept:${f}:${g}`,(frequencies.get(`kept:${f}:${g}`)??0)+1);
 for(const c of excluded){const keys=groupKeys(c.shape);let reason=c.restored?'기존 꼬리 비율 검정에서 복구':'';
  for(const factor of Object.keys(GROUP_LABELS) as GroupKey[]){const group=keys[factor],expected=((theory.hist as Record<string,Record<string,number>>)[factor]?.[group]??0)/theory.total;
   const observed=frequencies.get(`past:${factor}:${group}`)??0,ci=wilson(observed,prepared.model.count),remaining=(frequencies.get(`kept:${factor}:${group}`)??0)/Math.max(1,kept.length);
   if(ci[0]<=expected&&expected<=ci[1]&&remaining<expected*.5){reason=`${GROUP_LABELS[factor]} ${group} 과잉 제외 완화`;break;}}
  if(reason)restored.push(c);records.push({numbers:c.numbers,reason:reason||'Safety 분위수 밖',restored:!!reason});
 }
 const pool=[...kept,...restored],scores=new Map(pool.map(c=>[c,candidateScore(c,weights)])),target=Math.min(pool.length,Math.max(count*40,Math.floor(pool.length*.35))),ordered=[...pool].sort((a,b)=>scores.get(b)!-scores.get(a)!),selected:Candidate[]=[],seen=new Set<string>(),groupCounts=new Map<string,number>();
 const joint=(c:Candidate)=>`${c.shape.odd}:${c.shape.low}:${c.shape.groups}`;
 // Preserve at least one representative per populated composition group.
 for(const c of ordered){const g=joint(c);if(!seen.has(g)&&selected.length<target){selected.push(c);seen.add(g);groupCounts.set(g,1);}}
 const selectedSet=new Set(selected);
 for(const c of ordered){if(selected.length>=target)break;if(selectedSet.has(c))continue;const g=joint(c);if((groupCounts.get(g)??0)>=Math.ceil(target*.4))continue;selected.push(c);selectedSet.add(c);groupCounts.set(g,(groupCounts.get(g)??0)+1);}
 if(selected.length<count)throw Error(`압축 후 후보 ${selected.length}개로 ${count}조합을 만들 수 없습니다.`);
 const compressed=new Set(selected);return {candidates:selected,diagnostics:{independent:true,theoryTotal:theory.total,primary:prepared.candidates.length,invalid:prepared.candidates.length-valid.length,safetyExcluded:excluded.length,restored:restored.length,afterRecovery:pool.length,afterCompression:selected.length,compressionExcluded:pool.length-selected.length,byFilter:Object.fromEntries(prepared.model.bounds.map(b=>[b.key,valid.filter(c=>c.shape[b.key]<b.low||c.shape[b.key]>b.high).length])),records,compressionRecords:pool.filter(c=>!compressed.has(c)).map(c=>({numbers:c.numbers,reason:'점수 및 그룹 집중도 압축',restored:false})),groupsBefore:groupReport(valid,prepared.model.shapes,weights),groupsAfter:groupReport(selected,prepared.model.shapes,weights)}};
}
