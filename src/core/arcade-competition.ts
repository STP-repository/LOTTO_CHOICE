export interface PartyAttempt {turn:number;player:number;score:number}
export interface ArcadeCompetition {players:string[];seed:number;rounds:number;turn:number;attempts:PartyAttempt[]}
export function createCompetition(names:string[],rounds:number,seed:number):ArcadeCompetition{
  if(names.length<2||names.length>20)throw new Error('파티 대결은 2~20명을 선택해 주세요.');
  if(![1,2,3].includes(rounds))throw new Error('대결은 1~3라운드만 가능합니다.');
  return {players:names.map((n,i)=>names.filter(v=>v===n).length>1?`${n} (${i+1}번)`:n),rounds,seed:seed>>>0,turn:0,attempts:[]};
}
export function competitionSeed(c:ArcadeCompetition){return (c.seed+Math.floor(c.turn/c.players.length)*2654435761)>>>0;}
export function recordAttempt(c:ArcadeCompetition,score:number):ArcadeCompetition{
  if(!Number.isFinite(score)||score<0)throw new Error('올바른 기록이 아닙니다.');
  if(c.attempts.some(a=>a.turn===c.turn))return c;
  return {...c,attempts:[...c.attempts,{turn:c.turn,player:c.turn%c.players.length,score:Math.floor(score)}]};
}
export function competitionComplete(c:ArcadeCompetition){return c.attempts.length===c.players.length*c.rounds;}
export function nextCompetitionTurn(c:ArcadeCompetition){if(competitionComplete(c)||!c.attempts.some(a=>a.turn===c.turn))return c;return {...c,turn:c.turn+1};}
export function competitionStandings(c:ArcadeCompetition){return c.players.map((name,id)=>({id,name,played:c.attempts.filter(a=>a.player===id).length,total:c.attempts.filter(a=>a.player===id).reduce((n,a)=>n+a.score,0)})).sort((a,b)=>b.total-a.total||a.id-b.id);}
