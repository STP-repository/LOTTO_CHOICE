import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const data=read('public/data/full-history.json'),r=read('reports/recent200-method-five-validation.json');
const models=['full','recent100','methodFive','uniform'];
const csv=['model,round,date,actual_numbers,actual_bonus,seed,index,numbers,matched,count,bonus,rank'];
for(const row of r.rows){const actual=data.draws.find(d=>d.round===row.round);row.actualNumbers=actual.numbers;row.actualBonus=actual.bonus;for(const model of models)for(const [i,g] of row.models[model].games.entries()){const matched=g.numbers.filter(n=>actual.numbers.includes(n));assert.deepEqual(g.matched,matched);const k=matched.length,b=g.numbers.includes(actual.bonus),rank=k===6?1:k===5?(b?2:3):k===4?4:k===3?5:null;assert.equal(g.rank,rank);csv.push([model,row.round,row.date,actual.numbers.join(' '),actual.bonus,row.seed,i+1,g.numbers.join(' '),matched.join(' '),k,b,rank??'낙첨'].join(','));}}
writeFileSync('reports/recent200-method-five-validation.json',JSON.stringify(r,null,2));
writeFileSync('reports/recent200-method-five-all-tickets.csv','\ufeff'+csv.join('\n'));
const p='reports/recent200-method-five-validation.md';let md=readFileSync(p,'utf8');
const heading='\n## 재검산 증거 및 해석';md=md.split(heading)[0];
md+=heading+'\n\n- 1049~1248회, 총 200회. 신규 방식 1,000조합, 비교 모델 포함 총 4,000조합을 실제 당첨번호·보너스와 독립 재검산했습니다.\n- 전체 번호·일치 번호·등수·시드는 동봉 CSV와 JSON에 기록했습니다. `full`은 전체 이력 기존 분석, `recent100`은 최근100회 기존 분석, `methodFive`는 새 방법별5조합, `uniform`은 균등 무작위입니다.\n- 사용 데이터: 프로젝트의 동행복권 공식 전체 이력 파일. 자료에 기록된 출처: '+data.sourceUrl+' (갱신 '+data.updatedAt+'). 이번 실행에서는 외부 원본을 재수집하지 않았습니다.\n- 새 방식 평균 일치 수 차이의 95% 블록 부트스트랩 구간은 -0.015~0.070, 보정 p=0.8943입니다. 무작위 대비 유의미한 개선은 확인되지 않았습니다.\n- 5등 24회는 24개 조합이 당첨된 사후 재현 결과이며, 미래에도 200회 중 24회 당첨된다는 뜻이 아닙니다.\n- 모델·관찰 조건을 이미 본 과거 자료로 구성한 연구이므로 검정은 탐색적입니다. 네 비교 보정으로 모든 연구자 선택 편향이 제거되는 것은 아닙니다.\n';
writeFileSync(p,md);console.log(JSON.stringify({rounds:r.rows.length,tickets:csv.length-1,source:data.source,rankCounts:r.metrics.methodFive.rankCounts}));
