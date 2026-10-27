import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {generateEscape,generateHarvest,hashSeed,verifyEscape,verifyHarvest,difficulty} from '../src/core/puzzles';
const stages=['1','100','500','1000','5000','30000','100000'],rows=[];
for(const stage of stages){const start=performance.now(),samples=Array.from({length:100},(_,i)=>{const seed=hashSeed(`policy:${stage}:${i}`),e=generateEscape(stage,seed),h=generateHarvest(stage,seed);if(!verifyEscape(e,e.solution)||!verifyHarvest(h,h.solution))throw Error(`Unsolvable ${stage}:${i}`);return {e,h};});
 const range=(values:number[])=>({min:Math.min(...values),max:Math.max(...values),mean:values.reduce((a,b)=>a+b,0)/values.length});
 rows.push({stage,policy:difficulty(stage),samples:samples.length,solved:samples.length*2,escape:{blocks:range(samples.map(s=>s.e.pieces.length)),walls:range(samples.map(s=>s.e.walls.length)),solutionMoves:range(samples.map(s=>s.e.solution.length)),distinctStructures:new Set(samples.map(s=>s.e.signature)).size},harvest:{pixels:range(samples.map(s=>s.h.cells.filter(c=>c>=0).length)),tokens:range(samples.map(s=>s.h.tokens.length)),distinctStructures:new Set(samples.map(s=>s.h.signature)).size},milliseconds:performance.now()-start});}
const report={generatedAt:new Date().toISOString(),seedRule:'FNV32(policy:stage:sample)',note:'Solution lengths are constructive witnesses, not proven minimum moves. Sampling does not prove every possible seed.',rows};
writeFileSync('reports/puzzle-difficulty-policy.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

