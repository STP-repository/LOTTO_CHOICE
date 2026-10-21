export interface Draw { round: number; date: string; numbers: number[]; bonus: number }
export interface Dataset { draws: Draw[]; source: string; sourceUrl: string; updatedAt: string; verified: boolean; notes: string[] }
export const OFFICIAL = 'https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd=all';
export const MIRRORS = ['https://smok95.github.io/lotto/results/all.json', 'https://papaya5rhw1984.github.io/lotto-data/all.json'];
const dayMs = 86400000;
export function seoulDate(now = new Date()) { return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10); }
export function cutoffDate(now = new Date()) { const d = new Date(seoulDate(now)); d.setUTCFullYear(d.getUTCFullYear() - 15); return d.toISOString().slice(0, 10); }
export function expectedRound(now = new Date()) {
  // Draw is broadcast on Saturday after 20:35 KST; allow publication until 22:00.
  const first = Date.parse('2002-12-07T22:00:00+09:00');
  return Math.max(0, Math.floor((now.getTime() - first) / (7 * dayMs)) + 1);
}
export function validateDraws(input: unknown, now = new Date()): Draw[] {
  if (!Array.isArray(input) || !input.length) throw new Error('유효한 회차 데이터가 없습니다.');
  const seen = new Set<number>();
  const rows = input.map((raw: Draw) => {
    if (!raw || !Number.isInteger(raw.round) || raw.round < 1 || seen.has(raw.round)) throw new Error('잘못되거나 중복된 회차가 있습니다.');
    seen.add(raw.round);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.date) || !Number.isFinite(Date.parse(raw.date)) || new Date(raw.date).toISOString().slice(0,10) !== raw.date) throw new Error(`${raw.round}회 날짜 형식 오류`);
    const expected = new Date(Date.parse('2002-12-07') + (raw.round - 1) * 7 * dayMs).toISOString().slice(0, 10);
    if (raw.date !== expected || raw.date > seoulDate(now)) throw new Error(`${raw.round}회 추첨일 불일치 또는 미래 데이터`);
    if (!Array.isArray(raw.numbers) || raw.numbers.length !== 6 || new Set(raw.numbers).size !== 6 || [...raw.numbers, raw.bonus].some(n => !Number.isInteger(n) || n < 1 || n > 45) || raw.numbers.includes(raw.bonus)) throw new Error(`${raw.round}회 번호 검증 실패`);
    return { round: raw.round, date: raw.date, numbers: [...raw.numbers].sort((a,b)=>a-b), bonus: raw.bonus };
  }).sort((a,b)=>a.round-b.round);
  for (let i=1;i<rows.length;i++) if (rows[i].round !== rows[i-1].round+1) throw new Error(`${rows[i-1].round+1}회 데이터 누락`);
  return rows;
}
export function recent15(draws: Draw[], now = new Date()) { const cutoff=cutoffDate(now); return draws.filter(d=>d.date>=cutoff && d.date<=seoulDate(now)); }
export function normalizeOfficial(raw: unknown): Draw[] {
  const list = (raw as {data?: {list?: Record<string,unknown>[]}})?.data?.list;
  if (!Array.isArray(list)) throw new Error('공식 API 응답 형식이 변경되었거나 접근이 제한되었습니다.');
  return list.map(r=>{ const date=String(r.ltRflYmd); return {round:Number(r.ltEpsd),date:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`,numbers:[1,2,3,4,5,6].map(n=>Number(r[`tm${n}WnNo`])),bonus:Number(r.bnsWnNo)}; });
}
export function normalizeMirror(raw: unknown): Draw[] {
  if (!Array.isArray(raw)) throw new Error('대체 출처 형식 오류');
  return raw.map(r=>({round:Number(r.draw_no),date:String(r.date).slice(0,10),numbers:r.numbers,bonus:Number(r.bonus_no)}));
}
export function parseCsv(text: string, now = new Date()) {
  const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
  const expected='round,date,n1,n2,n3,n4,n5,n6,bonus';
  if (lines.shift()?.trim() !== expected) throw new Error(`CSV 헤더는 ${expected} 이어야 합니다.`);
  return validateDraws(lines.map((line,i)=>{ const c=line.split(',').map(s=>s.trim()); if(c.length!==9) throw new Error(`${i+2}행 열 개수 오류`); return {round:Number(c[0]),date:c[1],numbers:c.slice(2,8).map(Number),bonus:Number(c[8])}; }), now);
}
export function toCsv(draws: Draw[]) { return 'round,date,n1,n2,n3,n4,n5,n6,bonus\n'+draws.map(d=>[d.round,d.date,...d.numbers,d.bonus].join(',')).join('\n'); }
export async function fetchJson(url:string) { const r=await fetch(url,{signal:AbortSignal.timeout(20000),cache:'no-store'}); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
export async function collectFullHistory(now=new Date(),fetcher:(url:string)=>Promise<unknown>=fetchJson):Promise<Dataset>{
  const notes:string[]=[];
  for(const url of [OFFICIAL,...MIRRORS])try{
    const draws=validateDraws(url===OFFICIAL?normalizeOfficial(await fetcher(url)):normalizeMirror(await fetcher(url)),now);
    if(draws[0].round!==1||draws.at(-1)!.round<expectedRound(now))throw new Error('제1회부터 최신 확정 회차까지의 기록이 필요합니다.');
    return {draws,source:url===OFFICIAL?'동행복권 공식 전체 이력':'공개 미러 전체 이력 (공식 미검증)',sourceUrl:url,verified:url===OFFICIAL,updatedAt:now.toISOString(),notes};
  }catch(e){notes.push(`${url}: ${e instanceof Error?e.message:String(e)}`);}
  throw new Error(notes.join('\n'));
}
export async function collect(now = new Date(), fetcher: (url:string)=>Promise<unknown> = fetchJson): Promise<Dataset> {
  const notes:string[]=[];
  for (const url of [OFFICIAL,...MIRRORS]) {
    try {
      const draws=recent15(validateDraws(url===OFFICIAL?normalizeOfficial(await fetcher(url)):normalizeMirror(await fetcher(url)),now),now);
      if (!draws.length || draws[0].date > new Date(Date.parse(cutoffDate(now))+6*dayMs).toISOString().slice(0,10)) throw new Error('15년 범위의 앞부분이 누락되었습니다.');
      if (draws.at(-1)!.round < expectedRound(now)) throw new Error(`최신 회차 누락: ${draws.at(-1)!.round}회까지만 제공`);
      return {draws,source:url===OFFICIAL?'동행복권 공식':'공개 미러 (공식 미검증)',sourceUrl:url,updatedAt:now.toISOString(),verified:url===OFFICIAL,notes};
    } catch(e) {notes.push(`${url}: ${e instanceof Error?e.message:String(e)}`);}
  }
  throw new Error(notes.join('\n'));
}
