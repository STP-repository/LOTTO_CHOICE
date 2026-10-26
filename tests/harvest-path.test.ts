import test from 'node:test';import assert from 'node:assert/strict';
import {collectionRoute} from '../src/core/harvest-path';
test('수거 경로는 검은 테두리를 뛰어넘지 않고 열린 길과 외곽만 통과한다',()=>{
 const cells=[2,2,2,2,0,2,2,2,2];assert.deepEqual(collectionRoute(3,3,cells,4),[]);
 cells[1]=-1;const route=collectionRoute(3,3,cells,4);assert.ok(route.length>0);
 for(const p of route.slice(1))if(p.x>=0&&p.x<3&&p.y>=0&&p.y<3)assert.equal(cells[p.y*3+p.x],-1);
 for(let i=1;i<route.length;i++)assert.equal(Math.abs(route[i].x-route[i-1].x)+Math.abs(route[i].y-route[i-1].y),1);
});
