import test from 'node:test';import assert from 'node:assert/strict';
import {characterPixels,HARVEST_THEMES,HARVEST_PALETTE} from '../src/core/harvest-art';
test('100종 이상의 캐릭터는 이름뿐 아니라 실제 픽셀 도안도 서로 다르다',()=>{
 assert.ok(HARVEST_THEMES.length>=100);assert.equal(new Set(HARVEST_THEMES).size,HARVEST_THEMES.length);
 const pictures=HARVEST_THEMES.map((_,theme)=>characterPixels(32,32,theme,42));
 assert.ok(new Set(pictures.map(p=>p.join(','))).size>=100);
 for(const cells of pictures){assert.equal(cells.length,1024);assert.ok(cells.filter(c=>c>=0).length>=200);assert.ok(cells.every(c=>Number.isInteger(c)&&c>=-1&&c<HARVEST_PALETTE.length));}
});
