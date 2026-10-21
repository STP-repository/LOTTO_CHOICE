import type { Draw } from './data';

export interface Ticket { round: number; games: number[][] }
export function parseTicket(input: string): Ticket {
  let value = input.trim();
  if (value.length > 2048) throw new Error('QR 내용이 너무 깁니다.');
  if (/^https?:/i.test(value)) {
    const url = new URL(value);
    if (!['dhlottery.co.kr','nlotto.co.kr'].some(host => url.hostname === host || url.hostname.endsWith('.'+host))) throw new Error('동행복권 로또 QR 주소를 사용해 주세요.');
    value = url.searchParams.get('v') ?? '';
  }
  const match = /^(\d{4})((?:[qmns]\d{12}){1,5})(?:\d{10})?$/i.exec(value);
  if (!match || Number(match[1]) < 1) throw new Error('지원하는 로또 6/45 QR 형식이 아닙니다. QR이 선명하게 보이도록 다시 촬영해 주세요.');
  const games = [...match[2].matchAll(/[qmns](\d{12})/gi)].map(m => {
    const numbers = m[1].match(/\d{2}/g)!.map(Number);
    if (new Set(numbers).size !== 6 || numbers.some(n => n < 1 || n > 45)) throw new Error('QR의 구매 번호가 잘못되었습니다. 다시 촬영해 주세요.');
    return numbers.sort((a,b) => a-b);
  });
  return { round: Number(match[1]), games };
}
export function checkGame(numbers: number[], draw: Draw) {
  const matched = numbers.filter(n => draw.numbers.includes(n));
  const bonus = numbers.includes(draw.bonus);
  const rank = matched.length === 6 ? 1 : matched.length === 5 ? (bonus ? 2 : 3) : matched.length === 4 ? 4 : matched.length === 3 ? 5 : null;
  return { matched, bonus, rank };
}
export function ticketDrawDate(round: number) {
  return new Date(Date.parse('2002-12-07') + (round-1)*7*86400000).toISOString().slice(0,10);
}
