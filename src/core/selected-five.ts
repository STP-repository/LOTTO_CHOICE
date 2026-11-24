import {numberAnalysis,sampleSix,shape} from './advanced-model';
import {validateDraws,type Draw} from './data';
import {generateFrequencyFilterFive} from './frequency-filter-five';
import {methodSeed} from './method-five';
import {patternProfile,selectPatternNumbers,weightedIndex} from './pattern';
import {rng} from './recommend';

export const SELECTED_FIVE_VERSION='selected-five-v1';
export const SELECTED_POLICIES=[
 {id:'frequency',name:'최근 100회 빈도 가중 필터',salt:483,description:'최근 100회 빈도 가중 추출과 합계·홀짝·저고·AC 필터'},
 {id:'bayes',name:'베이지안 추정',salt:2361,description:'30·50·100·200회 구간의 베타 사후 평균에서 표준편차를 뺀 값의 평균으로 가중 추출'},
 {id:'reversion',name:'평균회귀',salt:2452,description:'장기·최근 출현 편차가 평균에 가까운 번호에 가중치를 주는 추출'},
 {id:'pairs',name:'동반 출현 번호쌍',salt:1040,description:'먼저 선택한 번호와 함께 출현한 횟수에 따라 다음 번호를 가중 추출'},
 {id:'shape',name:'과거 조합 형태 재현',salt:2621,description:'홀짝·연속번호·직전 회차 중복의 실제 분포를 이용한 후보 추출'},
] as const;

export function selectedIdentity(pack:ReturnType<typeof generateSelectedFive>){
 return pack.games.map(game=>game.numbers.join(',')).sort().join(';');
}

export function generateSelectedFive(input:Draw[],seed?:number,fixed:number[]=[],excluded:number[]=[]){
 const history=validateDraws(input);
 if(history[0].round!==1||history.length<100)throw Error('제1회부터 최소100회의 확정 이력이 필요합니다.');
 if(fixed.length>5||[fixed,excluded].some(list=>new Set(list).size!==list.length||
  list.some(n=>!Number.isInteger(n)||n<1||n>45))||fixed.some(n=>excluded.includes(n)))throw Error('고정수는 최대5개이며 1~45의 서로 다른 번호를 입력해 주세요.');
 if(45-excluded.length<6)throw Error('사용할 수 있는 번호가 최소6개 필요합니다.');
 const targetRound=history.at(-1)!.round+1,baseSeed=seed??methodSeed(targetRound),stats=numberAnalysis(history);
 const pairs=Array.from({length:46},()=>new Uint32Array(46)),counts=new Uint32Array(46);
 for(const draw of history)for(const a of draw.numbers){
  counts[a]++;
  for(const b of draw.numbers)if(a!==b)pairs[a][b]++;
 }
 const games=SELECTED_POLICIES.map((policy,index)=>{
  const random=rng((baseSeed^policy.salt)>>>0);
  let numbers:number[];
  if(policy.id==='frequency'){
   const first=generateFrequencyFilterFive(history,(baseSeed^policy.salt)>>>0,fixed,excluded).games[0];
   if(!first)throw Error('빈도 가중 필터 조건을 만족하는 조합을 찾지 못했습니다. 고정수·제외수를 조정해 주세요.');
   numbers=first.numbers;
  }else if(policy.id==='shape'){
   numbers=selectPatternNumbers(patternProfile(history),1,random,fixed,excluded)[0].numbers;
  }else if(policy.id!=='pairs'&&!fixed.length&&!excluded.length){
   numbers=sampleSix(random,stats.map(n=>n.scores[policy.id==='bayes'?2:3]));
  }else{
   numbers=[...fixed];
   while(numbers.length<6){
    const available=Array.from({length:45},(_,i)=>i+1).filter(n=>!numbers.includes(n)&&!excluded.includes(n));
    const weights=available.map(number=>{
     if(policy.id!=='pairs')return stats[number-1].scores[policy.id==='bayes'?2:3];
     return numbers.length?numbers.reduce((sum,from)=>sum+(pairs[from][number]+1)/(counts[from]+45),0)/numbers.length:1;
    });
    numbers.push(available[weightedIndex(weights,random)]);
   }
   numbers.sort((a,b)=>a-b);
  }
  return {slot:String.fromCharCode(65+index),method:policy.id,label:policy.name,explanation:policy.description,
   numbers,...shape(numbers,history.at(-1)!.numbers)};
 });
 if(new Set(games.map(game=>game.numbers.join())).size!==5)throw Error('두 방식에서 같은 조합이 나왔습니다. 새 시드로 다시 생성해 주세요.');
 return {version:SELECTED_FIVE_VERSION,targetRound,lastRound:history.at(-1)!.round,seed:baseSeed,games};
}
