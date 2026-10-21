import { useEffect, useRef, useState } from 'react';


export default function Landing({onStart}:{onStart:(page:number)=>void}){
  const [spinning,setSpinning]=useState(false),[balls,setBalls]=useState([6,12,18,24,36,45]),[turn,setTurn]=useState(0);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  function play(){if(spinning)return;setSpinning(true);setTurn(n=>n+1);const numbers:number[]=[];while(numbers.length<6){const n=1+Math.floor(Math.random()*45);if(!numbers.includes(n))numbers.push(n);}
    timer.current=setTimeout(()=>{setBalls(numbers.sort((a,b)=>a-b));setSpinning(false);},matchMedia('(prefers-reduced-motion: reduce)').matches?0:1500);
  }
  return <div className="landing">
    <header className="landing-nav"><a href="#" className="landing-brand" aria-label="Lotto Best Choice 홈"><span className="landing-logo">6<small>/45</small></span><span>Lotto<br/><b>Best Choice.</b></span></a></header>
    <main className="landing-main"><section className="landing-hero"><div className="landing-hero-copy"><span className="landing-eyebrow"><i/> 숫자를 만나는 조금 다른 방법</span><h1>여섯 개의 숫자,<br/>고르는 재미를<br/><em>더하다.</em><span className="landing-star" aria-hidden="true">✳</span></h1><p>대시보드에서 번호 생성, QR 당첨 확인,<br/>랜덤게임을 한곳에서 이용하세요.</p><div className="landing-hero-actions"><button className="landing-primary" onClick={()=>onStart(0)}>프로그램 시작하기 <span>↗</span></button></div></div>
      <div className={`lotto-playground ${spinning?'is-spinning':''}`} aria-label="로또 공 애니메이션"><span className="playground-tag">A LITTLE BIT OF PLAY</span><span className="playground-doodle doodle-one" aria-hidden="true">✳</span><span className="playground-doodle doodle-two" aria-hidden="true">+</span><div className="lotto-machine"><div className="machine-glass"><div className="machine-shine"/><div className="machine-paddle" aria-hidden="true"/>{[3,7,12,18,22,27,31,36,41,45].map((n,i)=><span key={n} aria-hidden="true" className={`machine-ball color-${Math.floor((n-1)/10)}`} style={{'--i':i} as React.CSSProperties}>{n}</span>)}<span className="machine-label">LET’S ROLL</span></div><div className="machine-neck"/><div className="machine-base"><div className="machine-light"/><strong>6 <small>/ 45</small></strong><span className="machine-knob"/></div><div className="machine-feet"/></div><div className="playground-result" aria-live="polite" aria-label="연출용 번호">{balls.map((n,i)=><span key={`${turn}-${i}`} className={`preview-ball color-${Math.floor((n-1)/10)}`} style={{'--i':i} as React.CSSProperties}>{spinning?'?':n}</span>)}</div><button className="playground-button" onClick={play} disabled={spinning}>{spinning?'공들이 신나게 굴러가는 중…':'톡! 눌러서 공 굴려보기'} <span aria-hidden="true">↻</span></button><p className="playground-caption">재미를 위한 화면 연출입니다. 추천 결과가 아닙니다.</p></div>
    </section>
    </main><footer className="landing-footer"><strong>Lotto Best Choice.</strong><span>숫자를 탐색하는 즐거움 · 로또 6/45 통계 도구</span></footer>
  </div>;
}
