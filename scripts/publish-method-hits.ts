import {readFile, writeFile} from 'node:fs/promises';
import {validateDraws} from '../src/core/data';
import {dataSignature} from '../src/core/advanced-model';
import {generateMethodFiveBefore, methodSeed} from '../src/core/method-five';
import {generateAdaptiveFive} from '../src/core/adaptive-five';
import {generateFrequencyFilterFive} from '../src/core/frequency-filter-five';
import {generateCombinedFormulas,generateRecommendationPack} from '../src/core/combined-formulas';
import {buildMixedPortfolio, buildLowOverlapPortfolio, MIXED_DISPLAY_ORDER} from '../src/core/top-two-portfolio';
import {checkGame} from '../src/core/ticket';
import type {MethodHits,SelectedRound} from '../src/services/method-five';
import {generateSelectedFive,SELECTED_FIVE_VERSION} from '../src/core/selected-five';

const draws = validateDraws(JSON.parse(await readFile('public/data/full-history.json', 'utf8')).draws);
const previous: Partial<MethodHits> = await readFile('public/data/method-hits.json', 'utf8')
  .then(content => JSON.parse(content), error => {
    if (error.code === 'ENOENT') return {};
    throw error;
  });
const modes = {five: 5, mixed: 10, 'low-overlap': 10, 'frequency-filter': 5};
const totals = Object.fromEntries(Object.entries(modes).map(([mode, count]) =>
  [mode, Array.from({length: count}, () => [0, 0, 0, 0, 0])]));
let latest: MethodHits['latest'];
for (const [i, draw] of draws.entries()) {
  if (i < 100) continue;
  const history = draws.slice(0, i);
  const result = generateMethodFiveBefore(history, draw);
  const five = result.games.map(game => game.numbers);
  const mixed = buildMixedPortfolio(five, result.seed, history);
  const filtered = generateFrequencyFilterFive(history, result.seed).games.map(game => game.numbers);
  const packs = {five, mixed: MIXED_DISPLAY_ORDER.map(index => mixed[index]), 'low-overlap': buildLowOverlapPortfolio(result.seed), 'frequency-filter': filtered};
  if (i === draws.length - 1) {
    latest = {draw, tickets: filtered.map(numbers => ({numbers, ...checkGame(numbers, draw)}))};
  }
  for (const [mode, tickets] of Object.entries(packs)) {
    tickets.forEach((numbers, index) => {
      const {rank} = checkGame(numbers, draw);
      if (rank) totals[mode][index][rank - 1]++;
    });
  }
}
const targetRound = draws.at(-1)!.round + 1;
const adaptive = {targetRound, ...generateAdaptiveFive(draws, methodSeed(targetRound))};
const upcoming = {targetRound, ...generateRecommendationPack(draws, methodSeed(targetRound))};
const settled = draws.at(-1)!;
const recorded = previous.upcoming?.targetRound === settled.round ? previous.upcoming : undefined;
const previousResult = previous.combinedLatest?.draw.round === settled.round && !previous.combinedLatest.replayed
  ? previous.combinedLatest : undefined;
const pastPack = previousResult ?? (() => {
  const replay = previous.upcoming && 'integrated' in previous.upcoming ? generateRecommendationPack : generateCombinedFormulas;
  const pack = recorded ?? replay(draws.slice(0, -1), methodSeed(settled.round));
  const secondary = 'integrated' in pack ? pack.integrated.games : pack.frequency;
  return {draw: settled, frequencyCount: secondary.length, integrated: 'integrated' in pack, replayed: !recorded,
    tickets: [...secondary, ...pack.markov.games].map(({numbers}) => ({numbers, ...checkGame(numbers, settled)}))};
})();
const oldSelected=previous.selected;
const selectedUpcoming=previous.signature===dataSignature(draws)&&oldSelected?.upcoming.targetRound===targetRound&&oldSelected.upcoming.version===SELECTED_FIVE_VERSION
  ?oldSelected.upcoming:generateSelectedFive(draws);
const savedSelected=oldSelected?.upcoming.targetRound===settled.round?oldSelected.upcoming:undefined;
const savedLatest=oldSelected?.latest.draw.round===settled.round&&!oldSelected.latest.replayed?oldSelected.latest:undefined;
const selectedLatest:SelectedRound=savedLatest?{
  ...savedLatest,draw:settled,tickets:savedLatest.tickets.map(ticket=>({...ticket,...checkGame(ticket.numbers,settled)})),
}:{
  draw:settled,replayed:!savedSelected,tickets:(savedSelected??generateSelectedFive(draws.slice(0,-1))).games
    .map(game=>({...game,...checkGame(game.numbers,settled)})),
};
const oldHistory=oldSelected?.history;
const historyStart=Math.max(100,draws.length-10);
const baseSignature=dataSignature(draws.slice(0,historyStart));
const historyRows:SelectedRound[]=oldHistory?.version===SELECTED_FIVE_VERSION&&oldHistory.baseSignature===baseSignature
  ?oldHistory.rows.filter(row=>row.draw.round<=settled.round):[];
// Reuse history only when both the draw and its preceding inputs still match.
const prefixValid=historyRows.every((row,i)=>row.draw.round===draws[historyStart+i]?.round&&JSON.stringify(row.draw)===JSON.stringify(draws[historyStart+i]));
if(!prefixValid)historyRows.length=0;
for(let i=historyStart+historyRows.length;i<draws.length;i++){
  const draw=draws[i];
  historyRows.push({draw,replayed:true,tickets:generateSelectedFive(draws.slice(0,i)).games
    .map(game=>({...game,...checkGame(game.numbers,draw)}))});
}
const selectedTotals=Array.from({length:5},()=>[0,0,0,0,0]);
let best:{rank:number;round:number;slot:string}|null=null;
for(const row of historyRows)row.tickets.forEach((ticket,i)=>{
  if(ticket.rank){
    selectedTotals[i][ticket.rank-1]++;
    if(!best||ticket.rank<best.rank)best={rank:ticket.rank,round:row.draw.round,slot:ticket.slot};
  }
});
const archive=(oldSelected?.archive??[]).filter(row=>row.draw.round!==selectedLatest.draw.round);
if(!selectedLatest.replayed)archive.push(selectedLatest);
const selected={upcoming:selectedUpcoming,latest:selectedLatest,archive,
  history:{version:SELECTED_FIVE_VERSION,baseSignature,rows:historyRows,best,totals:selectedTotals},updatedAt:new Date().toISOString()};
await writeFile('public/data/method-hits.json', JSON.stringify({
  signature: dataSignature(draws), first: draws[100].round, last: draws.at(-1)!.round,
  rounds: draws.length - 100, totals, latest, adaptive, upcoming,selected,
  combinedLatest: {...pastPack, draw: settled, tickets: pastPack.tickets.map(({numbers}) => ({numbers, ...checkGame(numbers, settled)}))},
}));
