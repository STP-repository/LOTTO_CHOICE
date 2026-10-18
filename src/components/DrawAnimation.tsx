import { useEffect, useRef, useState, type CSSProperties } from 'react';

export default function DrawAnimation({ numbers, games, onComplete }: {
  numbers: number[]; games: number; onComplete: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const complete = useRef(onComplete);
  const finished = useRef(false);
  const [revealed, setRevealed] = useState(0);
  complete.current = onComplete;
  function finish() {
    if (finished.current) return;
    finished.current = true;
    complete.current();
  }
  useEffect(() => {
    finished.current = false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    const modal = dialog.current;
    modal?.showModal();
    const timers = numbers.map((_, i) => window.setTimeout(() => setRevealed(i + 1), 1300 + i * 400));
    timers.push(window.setTimeout(finish, 4200));
    return () => { timers.forEach(window.clearTimeout); modal?.close(); };
  }, []);

  return <dialog ref={dialog} className="draw-dialog" aria-labelledby="draw-animation-title"
    onCancel={e => { e.preventDefault(); finish(); }}>
    <div className="draw-stage">
      <span className="draw-eyebrow">LOTTO BEST CHOICE</span>
      <h2 id="draw-animation-title">공을 굴려 번호를 만나보세요</h2>
      <p className="draw-subtitle">{games > 1 ? `첫 게임의 6개 번호를 공개한 뒤 ${games}게임을 모두 보여드려요.` : '선택한 방식으로 생성한 6개 번호를 하나씩 보여드려요.'}</p>
      <div className={`lotto-machine ${revealed === 6 ? 'is-revealed' : ''}`} aria-hidden="true">
        <div className="machine-globe">
          <div className="machine-rotor"/>
          {Array.from({ length: 18 }, (_, i) => {
            const n = (i * 7) % 45 + 1;
            return <span key={i} className="mix-ball-orbit" style={{
              '--orbit-angle': `${i * 47}deg`, '--orbit-radius': `${39 + (i % 4) * 15}px`,
              '--orbit-time': `${1.05 + (i % 5) * .17}s`, '--orbit-delay': `${-i * .23}s`,
            } as CSSProperties}><span className={`ball ball-${Math.floor((n - 1) / 10)}`}>{n}</span></span>;
          })}
          <span className="machine-shine"/>
        </div>
        <div className="machine-neck"/><div className="machine-base"><span/> LOTTO 6/45</div>
      </div>
      <div className="draw-reveal" aria-label={`첫 게임 번호 ${revealed}개 공개`}>
        {numbers.map((n, i) => <span key={i} className={`draw-slot ${i < revealed ? 'is-open' : ''}`}>
          {i < revealed ? <span className={`ball ball-${Math.floor((n - 1) / 10)}`}>{n}</span> : <span className="draw-placeholder">?</span>}
        </span>)}
      </div>
      <p className="draw-progress" role="status">{revealed < 6 ? `${revealed} / 6개 번호 공개` : '번호가 준비됐어요!'}</p>
      <button autoFocus type="button" className="btn btn-white" onClick={finish}>애니메이션 건너뛰기</button>
      <small className="draw-caption">번호 공개를 위한 연출이며 실제 복권 추첨이 아닙니다.</small>
    </div>
  </dialog>;
}
