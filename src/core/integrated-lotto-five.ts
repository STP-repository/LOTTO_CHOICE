import {overlap} from './advanced-model';
import type {Draw} from './data';
import {buildMarkovCandidates, SIMULATION_COUNT} from './markov-monte-carlo-five';
import {portfolioCoverage} from './portfolio-coverage';
import {rng} from './recommend';

export const DEFAULT_FITNESS = [0.30, 0.35, 0.35] as const;
type FitnessWeights = readonly [number, number, number];
type Candidate = ReturnType<typeof buildMarkovCandidates>['ranked'][number];

function popularity(numbers: number[], recent: Draw[]) {
  const high = numbers.filter(number => number > 31).length;
  const cells = numbers.map(number => [Math.floor((number - 1) / 7), (number - 1) % 7]);
  const sameColumn = cells.some(([,column]) => cells.filter(cell => cell[1] === column).length >= 3);
  const line = [(r:number,c:number)=>r, (r:number,c:number)=>c, (r:number,c:number)=>r+c, (r:number,c:number)=>r-c]
    .some(coordinate => new Set(cells.map(([row,column]) => coordinate(row,column))).size === 1);
  const sequence = numbers.some((start,i) => numbers.slice(i+1).some(next =>
    numbers.includes(2*next-start) && numbers.includes(3*next-2*start)));
  const consecutive = numbers.some(start => numbers.includes(start+1) && numbers.includes(start+2));
  return -((high===0?5:high===1?1:0) + (sameColumn||line?2:0) + (sequence?2:0) +
    (consecutive?2:0) + (recent.some(draw => overlap(numbers,draw.numbers)>=4)?2:0) +
    (numbers.filter(number => [7,3,1,9].includes(number)).length>=4?1:0));
}

export function buildIntegratedPool(history: Draw[], seed:number, fixed:number[] = [], excluded:number[] = [], simulations=SIMULATION_COUNT, markovRatio=0.5, alreadySelected:number[][] = []) {
  const {ranked,...stats} = buildMarkovCandidates(history,seed,fixed,excluded,alreadySelected,simulations,true,markovRatio);
  const recent = history.slice(-10);
  return {candidates:ranked.map(candidate => ({...candidate,popularity:popularity(candidate.numbers,recent)})),...stats};
}

export function selectIntegratedFive(
  pool:ReturnType<typeof buildIntegratedPool>, seed:number, fixed:number[] = [], excluded:number[] = [],
  weights:FitnessWeights=DEFAULT_FITNESS, generations=300,
) {
  const random = rng(seed ^ 0x7257a39f);
  const fixedSet = new Set(fixed);
  const maximumCoverage = 30-4*fixed.length;
  const target = Math.min(26,maximumCoverage);
  const range = (number:number) => Math.floor((number-1)/10);
  if (maximumCoverage<20 || 45-excluded.length<target || Array.from({length:5},(_,group)=>
    excluded.filter(number=>range(number)===group).length).some((count,group)=>(group===4?5:10)-count<4)) {
    return {games:[] as (Candidate & {popularity:number})[],relaxed:3,unique:0,maxCommon:0,theoretical:null};
  }
  const pick = (count:number) => Math.floor(random()*count);
  let relaxed=0;
  for (;relaxed<=3;relaxed++) {
    const candidates = pool.candidates.filter(candidate => candidate.tier<=relaxed);
    if (candidates.length<5) continue;
    const minScore = candidates.at(-1)!.score, maxScore = candidates[0].score;
    const minPopularity = candidates.reduce((min,candidate)=>Math.min(min,candidate.popularity),0);
    function assess(ids:number[]) {
      const counts = new Uint8Array(46), ranges = new Uint8Array(5);
      let unique=0, maxCommon=0, violations=0, score=0, unpopular=0;
      const tickets = ids.map(id=>candidates[id]);
      tickets.forEach((ticket,i)=>{
        score += ticket.score;
        unpopular += ticket.popularity;
        for(const number of ticket.numbers) {
          if(++counts[number]===1){unique++;ranges[range(number)]++;}
          if(counts[number]===3 && !fixedSet.has(number)) violations++;
        }
        for(let j=0;j<i;j++){
          const common=overlap(ticket.numbers,tickets[j].numbers);
          maxCommon=Math.max(maxCommon,common);
          if(common-fixed.length>2 || ids[i]===ids[j]) violations++;
        }
      });
      violations += Number(unique<target)+ranges.filter(count=>count<4).length;
      const fitness=weights[0]*(score/5-minScore)/(maxScore-minScore||1)
        +weights[1]*(unpopular/5-minPopularity)/(-minPopularity||1)
        +weights[2]*unique/30-violations;
      return {ids,fitness,violations,unique,maxCommon};
    }
    const sample = () => pick(candidates.length);
    const sort = (a:ReturnType<typeof assess>,b:ReturnType<typeof assess>) => b.fitness-a.fitness;
    let population = Array.from({length:200},()=>{
      const ids = new Set<number>();
      while(ids.size<5) ids.add(sample());
      return assess([...ids]);
    }).sort(sort);
    let best=population[0], stable=0;
    for(let generation=0;generation<generations && stable<30;generation++){
      const elite=population.slice(0,40);
      const next=[...elite];
      while(next.length<200){
        const left=elite[pick(elite.length)], right=elite[pick(elite.length)], cut=1+pick(4);
        const ids=[...left.ids.slice(0,cut),...right.ids.slice(cut)];
        if(random()<0.10) ids[pick(5)]=sample();
        next.push(assess(ids));
      }
      population=next.sort(sort);
      if(population[0].fitness>best.fitness){best=population[0];stable=0;}
      else stable++;
    }
    if(!best.violations){
      const games=best.ids.map(id=>candidates[id]).sort((a,b)=>b.score-a.score);
      return {games,relaxed,unique:best.unique,maxCommon:best.maxCommon,
        theoretical:portfolioCoverage(games.map(game=>game.numbers)).probability};
    }
  }
  return {games:[] as (Candidate & {popularity:number})[],relaxed:3,unique:0,maxCommon:0,theoretical:null};
}
