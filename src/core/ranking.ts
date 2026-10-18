import {evidenceModel,FEATURE_WEIGHTS,type FeatureWeights} from './evidence';
export const TOTAL_COMBINATIONS=8_145_060;
export type RankedCombination={numbers:number[];rating:number};
const lex=(a:number[],b:number[])=>{for(let i=0;i<6;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
export const compareRank=(a:RankedCombination,b:RankedCombination)=>Math.abs(a.rating-b.rating)>1e-12?b.rating-a.rating:lex(a.numbers,b.numbers);
/** Exact enumeration, no random candidate pool, no diversity penalty, no pattern exclusions. */
export function rankAllCombinations(m:ReturnType<typeof evidenceModel>,count=10,limit=45,onProgress?:(checked:number,total:number)=>void,W:FeatureWeights=FEATURE_WEIGHTS){
 if(!Number.isInteger(limit)||limit<6||limit>45||!Number.isInteger(count)||count<1)throw new Error('검색 범위 또는 개수가 잘못되었습니다.');
 const number=new Float64Array(46),pair=new Float64Array(46*46),rangeCode=new Uint16Array(46),previous=new Uint8Array(46);
 const hist=(i:number,w:number)=>{const t=new Float64Array(7),max=Math.max(1,...m.hist[i].values());for(const [k,n]of m.hist[i])t[Number(k)]=w*n/max;return t;};
 const odd=hist(0,W.odd),consecutive=hist(2,W.consecutive),overlap=hist(3,W.overlap),ranges=new Float64Array(16807);
 const maxima=[m.counts,m.recent,m.gap].map(x=>Math.max(1,...x));
 for(let n=1;n<=45;n++){
  number[n]=(W.frequency*m.counts[n]/maxima[0]+W.recent*m.recent[n]/maxima[1]+W.overdue*m.gap[n]/maxima[2])/6;
  rangeCode[n]=7**Math.floor((n-1)/10);previous[n]=Number(m.last.numbers.includes(n));
 }
 const maxPair=Math.max(1,...m.pairs.values());
 for(const [key,n]of m.pairs){const [a,b]=key.split(',').map(Number);pair[a*46+b]=W.pairs*n/(15*maxPair);}
 const maxRange=Math.max(1,...m.hist[1].values());
 for(const [key,n]of m.hist[1]){const code=key.split(':').reduce((s,v,i)=>s+Number(v)*7**i,0);ranges[code]=W.ranges*n/maxRange;}

 const top:RankedCombination[]=[];let checked=0;let total=1;for(let i=0;i<6;i++)total=total*(limit-i)/(i+1);total=Math.round(total);
 for(let a=1;a<=limit-5;a++){
  for(let b=a+1;b<=limit-4;b++)for(let c=b+1;c<=limit-3;c++)for(let d=c+1;d<=limit-2;d++)for(let e=d+1;e<=limit-1;e++){
   const base=number[a]+number[b]+number[c]+number[d]+number[e]+pair[a*46+b]+pair[a*46+c]+pair[a*46+d]+pair[a*46+e]+pair[b*46+c]+pair[b*46+d]+pair[b*46+e]+pair[c*46+d]+pair[c*46+e]+pair[d*46+e];
   const o=(a%2)+(b%2)+(c%2)+(d%2)+(e%2),r=rangeCode[a]+rangeCode[b]+rangeCode[c]+rangeCode[d]+rangeCode[e],p=previous[a]+previous[b]+previous[c]+previous[d]+previous[e],co=Number(b===a+1)+Number(c===b+1)+Number(d===c+1)+Number(e===d+1);
   for(let f=e+1;f<=limit;f++){
    const rating=base+number[f]+pair[a*46+f]+pair[b*46+f]+pair[c*46+f]+pair[d*46+f]+pair[e*46+f]+odd[o+f%2]+ranges[r+rangeCode[f]]+consecutive[co+Number(f===e+1)]+overlap[p+previous[f]];
    checked++;
    if(top.length<count||rating>top[top.length-1].rating+1e-12){top.push({numbers:[a,b,c,d,e,f],rating});top.sort(compareRank);if(top.length>count)top.pop();}
   }
  }
  onProgress?.(checked,total);
 }
 return {top,checked,total};
}

