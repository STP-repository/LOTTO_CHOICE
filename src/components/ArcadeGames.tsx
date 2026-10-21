import {useEffect,useRef,useState} from 'react';
import './arcade.css';
import {rememberGameNames,recentGameNames} from '../services/game-names';

const games=[
  ['galaxy','✦','스타 웨이브','좌우 이동 · 자동 발사 · 적 편대와 보스 격파'],
  ['match','◆','젬 블룸','이웃 보석 두 개를 눌러 교환 · 3개 이상 연결'],
  ['bubble','●','버블 코멧','화면을 눌러 조준 발사 · 같은 색 3개 연결'],
  ['brick','▰','프리즘 브레이커','패들을 좌우로 움직여 빛의 벽돌 깨기'],
  ['runner','➜','오로라 러너','터치 또는 스페이스로 점프 · 장애물 넘기'],
  ['snake','〰','네온 트레일','방향키 또는 스와이프로 이동 · 빛 구슬 모으기'],
  ['dodge','☄','메테오 서바이버','드래그 또는 방향키 이동 · 유성 피하기'],
  ['catch','✧','크리스탈 샤워','좌우 이동 · 보석은 받고 붉은 폭탄은 피하기'],
  ['orbit','◎','오빗 대시','터치 또는 스페이스로 궤도 변경 · 장애물 피하기'],
  ['rhythm','♫','비트 노바','노트가 아래 선에 닿을 때 터치 · D F J K'],
] as const;
type Mode=typeof games[number][0];
type Obj={x:number;y:number;vx:number;vy:number;r:number;c:number;hp?:number};
type Score={name:string;mode:Mode;score:number;date:string};
const KEY='lotto:arcade-scores:v1',palette=['#58efff','#ff61c9','#ffd66a','#97ff8c','#a292ff'];
function readScores():Score[]{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v.filter(s=>s&&typeof s.name==='string'&&games.some(g=>g[0]===s.mode)&&Number.isFinite(s.score)).slice(0,500):[];}catch{return [];}}

export default function ArcadeGames({names}:{names:string[]}){
  const [mode,setMode]=useState<Mode>('galaxy'),[player,setPlayer]=useState(0),[running,setRunning]=useState(false),[score,setScore]=useState(0),[result,setResult]=useState<number|null>(null),[scores,setScores]=useState(readScores),[notice,setNotice]=useState('');
  const [resultName,setResultName]=useState('');
  const canvas=useRef<HTMLCanvasElement>(null),control=useRef({x:240,y:530,down:false,tap:false,keys:new Set<string>(),swipe:0}),stop=useRef(()=>{});
  const current=games.find(g=>g[0]===mode)!;
  useEffect(()=>{setPlayer(p=>Math.min(p,Math.max(0,names.length-1)));},[names.length]);
  useEffect(()=>()=>stop.current(),[]);
  function start(){
    const name=names[player];if(!name){setNotice('왼쪽에서 참가자를 등록하고 선택해 주세요.');return;}
    const el=canvas.current,ctx=el?.getContext('2d');if(!el||!ctx)return;
    stop.current();rememberGameNames([name],recentGameNames());setRunning(true);setResultName(name);setResult(null);setScore(0);setNotice('');
    const input=control.current;input.keys.clear();input.tap=false;input.x=240;input.y=530;
    let raf=0,ended=false,points=0,lives=3,t=0,last=performance.now(),spawn=0,shot=0,wave=1,combo=0,power=0,invulnerable=0,px=240,py=530,vy=0,ground=true,angle=0,lane=0;
    let entities:Obj[]=[],bullets:Obj[]=[],particles:Obj[]=[],items:Obj[]=[],grid=Array.from({length:64},()=>Math.floor(Math.random()*5)),selected=-1;
    let ball={x:240,y:430,vx:155,vy:-255},snake=[{x:8,y:12},{x:7,y:12},{x:6,y:12}],dir={x:1,y:0},food={x:12,y:8},tick=0;
    const stars=Array.from({length:85},()=>({x:Math.random()*480,y:Math.random()*640,r:Math.random()*1.8+.4,v:15+Math.random()*70}));
    const add=(n:number)=>{points+=n;setScore(points);};
    const burst=(x:number,y:number,c:number,count=18)=>{for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=35+Math.random()*180;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:3+Math.random()*4,c,hp:1});}};
    const finish=(save=true)=>{if(ended)return;ended=true;cancelAnimationFrame(raf);setRunning(false);if(save){setResult(points);const entry={name,mode,score:points,date:new Date().toISOString()};const next=[entry,...readScores()].slice(0,500);try{localStorage.setItem(KEY,JSON.stringify(next));}catch{setNotice('저장 공간이 부족해 이번 기록을 보관하지 못했습니다.');}setScores(next);}};
    stop.current=()=>finish(false);
    const hurt=()=>{if(invulnerable>0)return;lives--;invulnerable=1.3;burst(px,py,1,30);if(lives<=0)finish();};
    const orb=(x:number,y:number,r:number,c:number)=>{ctx.shadowColor=palette[c%5];ctx.shadowBlur=13;ctx.fillStyle=palette[c%5];ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#ffffff99';ctx.beginPath();ctx.arc(x-r*.25,y-r*.3,r*.23,0,Math.PI*2);ctx.fill();};
    const label=(text:string,x:number,y:number,size=18)=>{ctx.fillStyle='#fff';ctx.font=`800 ${size}px system-ui`;ctx.textAlign='center';ctx.fillText(text,x,y);};
    function matches(){const found=new Set<number>();for(let y=0;y<8;y++)for(let x=0;x<8;x++){const i=y*8+x,c=grid[i];if(x<6&&c===grid[i+1]&&c===grid[i+2]){let k=x;while(k<8&&grid[y*8+k]===c)found.add(y*8+k++);}if(y<6&&c===grid[i+8]&&c===grid[i+16]){let k=y;while(k<8&&grid[k*8+x]===c)found.add(k++*8+x);}}return found;}
    // Start with no free matches; only a player's valid swap scores.
    if(mode==='match'){for(let i=0;i<64;i++){const x=i%8,y=Math.floor(i/8);while((x>1&&grid[i]===grid[i-1]&&grid[i]===grid[i-2])||(y>1&&grid[i]===grid[i-8]&&grid[i]===grid[i-16]))grid[i]=(grid[i]+1)%5;}}
    if(mode==='brick')for(let y=0;y<5;y++)for(let x=0;x<8;x++)entities.push({x:31+x*59,y:110+y*29,vx:0,vy:0,r:25,c:y,hp:1});
    if(mode==='bubble')for(let y=0;y<5;y++)for(let x=0;x<10;x++)entities.push({x:24+x*47+(y%2?12:0),y:110+y*40,vx:0,vy:0,r:20,c:Math.floor(Math.random()*5)});
    let bubbleColor=Math.floor(Math.random()*5);
    const frame=(now:number)=>{
      if(ended)return;const dt=Math.min(.035,(now-last)/1000);last=now;t+=dt;spawn+=dt;shot+=dt;invulnerable=Math.max(0,invulnerable-dt);power=Math.max(0,power-dt);
      const tap=input.tap;input.tap=false;const k=input.keys;
      if(k.has('ArrowLeft')||k.has('a'))px-=330*dt;else if(k.has('ArrowRight')||k.has('d'))px+=330*dt;else if(input.down)px=input.x;
      px=Math.max(24,Math.min(456,px));if(mode==='dodge'){if(k.has('ArrowUp'))py-=300*dt;if(k.has('ArrowDown'))py+=300*dt;if(input.down)py=input.y;py=Math.max(85,Math.min(605,py));}
      const bg=ctx.createLinearGradient(0,0,480,640);bg.addColorStop(0,'#101239');bg.addColorStop(.55,mode==='runner'?'#35144f':'#101b45');bg.addColorStop(1,'#26123e');ctx.fillStyle=bg;ctx.fillRect(0,0,480,640);
      for(const s of stars){s.y=(s.y+s.v*dt)%640;ctx.fillStyle=`rgba(180,222,255,${.3+s.r/3})`;ctx.fillRect(s.x,s.y,s.r,s.r*2);}
      ctx.globalAlpha=.15;ctx.fillStyle='#ae51ff';ctx.beginPath();ctx.ellipse(400,160,180,65,-.6,0,7);ctx.fill();ctx.fillStyle='#3fe9ff';ctx.beginPath();ctx.ellipse(30,460,150,45,-.6,0,7);ctx.fill();ctx.globalAlpha=1;
      if(mode==='galaxy'||mode==='dodge'||mode==='catch'){
        if(spawn>(mode==='galaxy'?.65:mode==='catch'?.42:.23)){spawn=0;entities.push({x:25+Math.random()*430,y:-30,vx:mode==='galaxy'?Math.sin(t)*35:(Math.random()-.5)*80,vy:85+Math.min(180,t*3),r:mode==='catch'?14:18,c:Math.floor(Math.random()*5),hp:mode==='galaxy'?2:1});if(mode==='galaxy'&&Math.floor(t)%4===0)for(const x of [90,240,390])entities.push({x,y:-65,vx:Math.sin(t)*20,vy:100+t*2,r:17,c:4,hp:2});}
        if(mode==='galaxy'&&t>wave*18){wave++;entities.push({x:240,y:90,vx:85,vy:0,r:48,c:1,hp:35+wave*5});}
        if(mode==='galaxy'&&shot>.14){shot=0;for(const offset of (power>0?[-22,-9,9,22]:[-9,9]))bullets.push({x:px+offset,y:py-25,vx:0,vy:-540,r:3,c:0});}
        bullets.forEach(b=>{b.y+=b.vy*dt;orb(b.x,b.y,b.r,b.c);});
        for(const e of entities){e.x+=e.vx*dt;e.y+=e.vy*dt;if(e.r>40){if(e.x<60||e.x>420)e.vx*=-1;if(Math.random()<dt*3)bullets.push({x:e.x,y:e.y+30,vx:0,vy:220,r:6,c:1});}
          if(mode==='galaxy'){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.sin(t*4)*.15);ctx.shadowColor=palette[e.c];ctx.shadowBlur=18;ctx.fillStyle=palette[e.c];ctx.beginPath();ctx.moveTo(0,e.r);ctx.lineTo(-e.r,-e.r/2);ctx.lineTo(0,-e.r);ctx.lineTo(e.r,-e.r/2);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#24183f';ctx.fillRect(-e.r*.45,-5,e.r*.9,9);ctx.restore();if(e.r>40){ctx.fillStyle='#ff5bbd';ctx.fillRect(e.x-45,e.y-60,90*Math.max(0,e.hp!)/(35+wave*5),5);}
            for(const b of bullets)if(b.vy<0&&Math.hypot(b.x-e.x,b.y-e.y)<e.r+b.r){b.y=-100;e.hp!--;burst(b.x,e.y,e.c,6);if(e.hp!<=0){const hitY=e.y;add(e.r>40?1000:100);burst(e.x,hitY,e.c,28);if(Math.random()<.22||e.r>40)items.push({x:e.x,y:hitY,vx:0,vy:90,r:12,c:2});e.y=800;}}
          }else if(mode==='catch'){orb(e.x,e.y,e.r,e.c===1?1:e.c);if(e.c===1)label('×',e.x,e.y+6);}else{ctx.save();ctx.translate(e.x,e.y);ctx.rotate(t);orb(0,0,e.r,e.c);ctx.strokeStyle='#ffffff60';ctx.strokeRect(-10,-10,20,20);ctx.restore();}
          if(Math.hypot(px-e.x,py-e.y)<e.r+18){if(mode==='catch'&&e.c!==1){add(50);burst(e.x,e.y,e.c);e.y=800;}else{hurt();e.y=800;}}else if(e.y>670&&e.y<790){if(mode==='galaxy')hurt();else if(mode==='catch'&&e.c!==1){lives--;if(lives<=0)finish();}}
        }
        for(const b of bullets)if(b.vy>0&&Math.hypot(b.x-px,b.y-py)<22){hurt();b.y=800;}
        for(const item of items){item.y+=item.vy*dt;orb(item.x,item.y,12,2);label("P",item.x,item.y+5,13);if(Math.hypot(item.x-px,item.y-py)<32){power=10;item.y=800;add(50);burst(px,py,2);}}items=items.filter(i=>i.y<670);if(power>0)label(`POWER ${Math.ceil(power)}s`,240,82,13);entities=entities.filter(e=>e.y<670);bullets=bullets.filter(b=>b.y>-50&&b.y<680);
        if(invulnerable===0||Math.floor(t*14)%2){ctx.save();ctx.translate(px,py);if(mode==='catch'){ctx.fillStyle='#86f4ef';ctx.shadowColor='#29f3ff';ctx.shadowBlur=20;ctx.beginPath();ctx.moveTo(-32,-8);ctx.lineTo(32,-8);ctx.lineTo(22,18);ctx.lineTo(-22,18);ctx.closePath();ctx.fill();}else{orb(0,28+Math.random()*8,7+Math.random()*5,2);ctx.fillStyle='#b6efff';ctx.shadowColor='#52e4ff';ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(0,-27);ctx.lineTo(23,20);ctx.lineTo(0,12);ctx.lineTo(-23,20);ctx.closePath();ctx.fill();orb(0,0,6,4);}ctx.restore();ctx.shadowBlur=0;}
        if(mode==='dodge')add(Math.floor(t*10)-points);
      }else if(mode==='match'){
        if(tap){const x=Math.floor((input.x-16)/56),y=Math.floor((input.y-126)/56),i=y*8+x;if(x>=0&&x<8&&y>=0&&y<8){if(selected>=0&&((Math.abs(selected-i)===1&&Math.floor(selected/8)===y)||Math.abs(selected-i)===8)){[grid[i],grid[selected]]=[grid[selected],grid[i]];let found=matches();if(!found.size)[grid[i],grid[selected]]=[grid[selected],grid[i]];else{let cascades=0;while(found.size&&cascades++<12){add(found.size*30*cascades);found.forEach(j=>burst(44+j%8*56,154+Math.floor(j/8)*56,grid[j],9));for(let col=0;col<8;col++){const remaining=Array.from({length:8},(_,row)=>row*8+col).filter(j=>!found.has(j)).map(j=>grid[j]);while(remaining.length<8)remaining.unshift(Math.floor(Math.random()*5));remaining.forEach((v,row)=>grid[row*8+col]=v);}found=matches();}}selected=-1;}else selected=i;}}
        grid.forEach((c,i)=>{const x=44+i%8*56,y=154+Math.floor(i/8)*56;ctx.fillStyle=i===selected?'#ffffff80':'#ffffff10';ctx.fillRect(x-25,y-25,50,50);ctx.save();ctx.translate(x,y+Math.sin(t*2+i)*1.5);ctx.rotate(Math.PI/4);ctx.shadowColor=palette[c];ctx.shadowBlur=12;ctx.fillStyle=palette[c];ctx.fillRect(-15,-15,30,30);ctx.fillStyle='#ffffff66';ctx.fillRect(-11,-11,13,7);ctx.restore();});
      }else if(mode==='brick'){
        ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;if(ball.x<9||ball.x>471){ball.x=Math.max(9,Math.min(471,ball.x));ball.vx*=-1;}if(ball.y<80)ball.vy=Math.abs(ball.vy);if(ball.vy>0&&ball.y>552&&ball.y<576&&Math.abs(ball.x-px)<51){ball.vy=-Math.abs(ball.vy);ball.vx=(ball.x-px)*6;burst(ball.x,560,0,6);}if(ball.y>650){lives--;ball={x:px,y:430,vx:155,vy:-255};if(lives<=0)finish();}
        for(const e of entities){if(Math.abs(ball.x-e.x)<29&&Math.abs(ball.y-e.y)<18){e.hp=0;ball.vy*=-1;add(100);burst(e.x,e.y,e.c);}ctx.shadowColor=palette[e.c];ctx.shadowBlur=10;ctx.fillStyle=palette[e.c];ctx.fillRect(e.x-25,e.y-10,50,20);ctx.shadowBlur=0;}
        entities=entities.filter(e=>e.hp);if(!entities.length){add(1500);finish();}orb(ball.x,ball.y,8,0);ctx.fillStyle='#a9fcff';ctx.shadowBlur=20;ctx.shadowColor='#70f8ff';ctx.fillRect(px-48,568,96,10);ctx.shadowBlur=0;
      }else if(mode==='bubble'){
        if(tap&&!bullets.length){const a=Math.atan2(Math.min(input.y,500)-580,input.x-240);bullets.push({x:240,y:580,vx:Math.cos(a)*460,vy:Math.sin(a)*460,r:20,c:bubbleColor});bubbleColor=Math.floor(Math.random()*5);}
        for(const b of bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<21||b.x>459){b.x=Math.max(21,Math.min(459,b.x));b.vx*=-1;}if(b.y<90||entities.some(e=>Math.hypot(e.x-b.x,e.y-b.y)<39)){entities.push({...b,vx:0,vy:0});const group=new Set<Obj>([entities[entities.length-1]]);let changed=true;while(changed){changed=false;for(const e of entities)if(e.c===b.c&&!group.has(e)&&[...group].some(v=>Math.hypot(e.x-v.x,e.y-v.y)<49)){group.add(e);changed=true;}}if(group.size>=3){group.forEach(e=>burst(e.x,e.y,e.c,10));add(group.size*60);entities=entities.filter(e=>!group.has(e));}b.hp=-1;}}
        bullets=bullets.filter(b=>b.hp!==-1);if(spawn>9){spawn=0;entities.forEach(e=>e.y+=35);}
        entities.forEach(e=>orb(e.x,e.y,e.r,e.c));bullets.forEach(e=>orb(e.x,e.y,e.r,e.c));orb(240,580,22,bubbleColor);if(entities.some(e=>e.y>535)){finish();}if(!entities.length){add(2000);finish();}
      }else if(mode==='runner'){
        if((tap||k.has(' '))&&ground){vy=-490;ground=false;burst(100,535,0,10);}vy+=1150*dt;py+=vy*dt;if(py>=530){py=530;vy=0;ground=true;}if(spawn>1.1){spawn=0;entities.push({x:510,y:535,vx:-230-Math.min(100,t*2),vy:0,r:18,c:Math.floor(Math.random()*5)});}
        ctx.strokeStyle='#72ffff';ctx.shadowColor='#72ffff';ctx.shadowBlur=15;ctx.beginPath();ctx.moveTo(0,554);ctx.lineTo(480,554);ctx.stroke();ctx.shadowBlur=0;for(let i=0;i<10;i++){ctx.fillStyle='#9772ff30';const x=(i*70-t*80)%650;ctx.fillRect(x,380+Math.sin(i)*35,35,174);}
        entities.forEach(e=>{e.x+=e.vx*dt;orb(e.x,e.y,e.r,e.c);if(Math.abs(e.x-100)<30&&Math.abs(e.y-py)<32)hurt();});entities=entities.filter(e=>e.x>-40);ctx.save();ctx.translate(100,py);ctx.rotate(ground?Math.sin(t*15)*.08:t*5);orb(0,0,20,0);ctx.restore();add(Math.floor(t*20)-points);
      }else if(mode==='snake'){
        let next=dir;if(k.has('ArrowLeft')||input.swipe===1)next={x:-1,y:0};if(k.has('ArrowRight')||input.swipe===2)next={x:1,y:0};if(k.has('ArrowUp')||input.swipe===3)next={x:0,y:-1};if(k.has('ArrowDown')||input.swipe===4)next={x:0,y:1};input.swipe=0;if(next.x!==-dir.x||next.y!==-dir.y)dir=next;tick+=dt;
        if(tick>.13){tick=0;const h={x:snake[0].x+dir.x,y:snake[0].y+dir.y},eat=h.x===food.x&&h.y===food.y;if(h.x<0||h.x>=20||h.y<0||h.y>=21||snake.slice(0,eat?snake.length:-1).some(s=>s.x===h.x&&s.y===h.y)){finish();}else{snake.unshift(h);if(eat){add(100);burst(12+food.x*24,100+food.y*24,2);const empty=Array.from({length:420},(_,i)=>({x:i%20,y:Math.floor(i/20)})).filter(p=>!snake.some(s=>s.x===p.x&&s.y===p.y));if(!empty.length)finish();else food=empty[Math.floor(Math.random()*empty.length)];}else snake.pop();}}
        ctx.strokeStyle='#ffffff0c';for(let x=0;x<21;x++){ctx.beginPath();ctx.moveTo(x*24,88);ctx.lineTo(x*24,592);ctx.stroke();}snake.forEach((s,i)=>orb(12+s.x*24,100+s.y*24,10,i===0?0:4));orb(12+food.x*24,100+food.y*24,9+Math.sin(t*5)*2,2);
      }else if(mode==='orbit'){
        if(tap||k.has(' ')){lane=1-lane;k.delete(' ');burst(240+Math.cos(angle)*(lane?155:100),335+Math.sin(angle)*(lane?155:100),0,8);}angle+=dt*1.5;for(const r of [100,155]){ctx.strokeStyle='#8584ff70';ctx.lineWidth=3;ctx.beginPath();ctx.arc(240,335,r,0,7);ctx.stroke();}orb(240,335,38+Math.sin(t*2)*3,4);if(spawn>1.1){spawn=0;entities.push({x:angle+2.5,y:Math.random()>.5?155:100,vx:0,vy:0,r:14,c:1});}const r=lane?155:100;orb(240+Math.cos(angle)*r,335+Math.sin(angle)*r,14,0);entities.forEach(e=>{orb(240+Math.cos(e.x)*e.y,335+Math.sin(e.x)*e.y,e.r,1);if(Math.abs(Math.atan2(Math.sin(angle-e.x),Math.cos(angle-e.x)))<.17&&e.y===r){hurt();e.hp=-1;}if(angle>e.x+.3&&e.hp!==-1){add(75);e.hp=-1;}});entities=entities.filter(e=>e.hp!==-1);
      }else if(mode==='rhythm'){
        const cols=[60,180,300,420];if(spawn>.46){spawn=0;entities.push({x:Math.floor(Math.random()*4),y:80,vx:0,vy:240,r:20,c:Math.floor(Math.random()*5)});}ctx.strokeStyle='#ffffff20';for(const x of cols){ctx.beginPath();ctx.moveTo(x,90);ctx.lineTo(x,600);ctx.stroke();}ctx.strokeStyle='#66f6ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,548);ctx.lineTo(480,548);ctx.stroke();
        const pressed=['d','f','j','k'].flatMap((key,i)=>k.has(key)?[i]:[]);pressed.forEach(i=>k.delete(['d','f','j','k'][i]));if(tap)pressed.push(Math.min(3,Math.floor(input.x/120)));for(const i of pressed){const e=entities.filter(e=>e.x===i&&Math.abs(e.y-548)<55).sort((a,b)=>Math.abs(a.y-548)-Math.abs(b.y-548))[0];if(e){combo++;add(100+Math.min(combo,30)*5);burst(cols[i],548,e.c);e.hp=-1;}else combo=0;}
        entities.forEach(e=>{e.y+=e.vy*dt;orb(cols[e.x],e.y,18,e.c);if(e.y>610){combo=0;e.hp=-1;lives--;if(lives<=0)finish();}});entities=entities.filter(e=>e.hp!==-1);cols.forEach((x,i)=>label(['D','F','J','K'][i],x,600));label(`${combo} COMBO`,240,325,28);
      }
      particles=particles.filter(p=>p.hp!>0);for(const p of particles){p.hp!-=dt*1.8;p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.globalAlpha=Math.max(0,p.hp!);ctx.fillStyle=palette[p.c%5];ctx.fillRect(p.x,p.y,p.r,p.r);}ctx.globalAlpha=1;ctx.shadowBlur=0;
      ctx.fillStyle='#080b26cc';ctx.fillRect(0,0,480,70);label(`${points.toLocaleString()} P`,240,42,26);label('♥'.repeat(Math.max(0,lives)),64,40,19);label(`${Math.max(0,Math.ceil(90-t))}s`,431,40,18);
      if(t>=90)finish();if(!ended)raf=requestAnimationFrame(frame);
    };raf=requestAnimationFrame(frame);
  }
  useEffect(()=>{if(!running)return;const down=(e:KeyboardEvent)=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','d','f','j','k','a'].includes(e.key)&&!(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)){e.preventDefault();control.current.keys.add(e.key);if(e.key===' '&&!e.repeat)control.current.tap=true;}};const up=(e:KeyboardEvent)=>control.current.keys.delete(e.key);const pause=()=>{if(document.hidden)stop.current();};const blur=()=>stop.current();window.addEventListener('keydown',down);window.addEventListener('keyup',up);document.addEventListener('visibilitychange',pause);window.addEventListener('blur',blur);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);document.removeEventListener('visibilitychange',pause);window.removeEventListener('blur',blur);};},[running]);
  const records=scores.filter(s=>s.mode===mode).sort((a,b)=>b.score-a.score).slice(0,10);
  return <div className="arcade"><div className="arcade-catalog">{games.map(g=><button key={g[0]} disabled={running} className={mode===g[0]?'active':''} onClick={()=>{setMode(g[0]);setResult(null);setScore(0);}}><span>{g[1]}</span><b>{g[2]}</b></button>)}</div><section className="arcade-machine"><header><div><small>COLOR ARCADE / RECORD CHALLENGE</small><h2>{current[1]} {current[2]}</h2><p>{current[3]}</p></div><b className="arcade-live-score">{score.toLocaleString()}<small>POINTS</small></b></header><div className="arcade-screen"><canvas ref={canvas} width={480} height={640} aria-label={`${current[2]} 게임 화면`} onPointerDown={e=>{if(!running)return;e.currentTarget.setPointerCapture(e.pointerId);const r=e.currentTarget.getBoundingClientRect(),c=control.current;c.x=(e.clientX-r.left)*480/r.width;c.y=(e.clientY-r.top)*640/r.height;c.down=true;c.tap=true;}} onPointerMove={e=>{const c=control.current;if(!c.down)return;const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)*480/r.width,y=(e.clientY-r.top)*640/r.height,dx=x-c.x,dy=y-c.y;if(Math.hypot(dx,dy)>12)c.swipe=Math.abs(dx)>Math.abs(dy)?dx>0?2:1:dy>0?4:3;c.x=x;c.y=y;}} onPointerUp={()=>{control.current.down=false;}} onPointerCancel={()=>{control.current.down=false;}}/>{!running&&<div className="arcade-overlay"><div className="arcade-emblem">{current[1]}</div><small>{result===null?'READY TO PLAY':'CHALLENGE COMPLETE'}</small><h3>{result===null?current[2]:`${result.toLocaleString()} POINTS`}</h3><p>{result===null?'빛과 색으로 채운 90초의 도전':`${resultName}님의 기록을 저장했어요`}</p><button className="arcade-start" disabled={!names.length} onClick={start}>{result===null?'도전 시작':'다시 도전'} <span>▶</span></button>{!names.length&&<p>참가자를 먼저 선택해 주세요.</p>}</div>}</div><div className="arcade-controls"><label>도전할 참가자 <select aria-label="기록 게임 참가자" value={player} disabled={running} onChange={e=>setPlayer(Number(e.target.value))}>{names.map((n,i)=><option key={i} value={i}>{i+1}. {n}</option>)}</select></label>{running&&<button onClick={()=>stop.current()}>중지 · 기록 저장 안 함</button>}<span>모바일 터치 / PC 키보드 · 최대 90초</span></div>{notice&&<p role="status">{notice}</p>}</section><section className="panel arcade-ranking"><h3>🏆 {current[2]} 기록 TOP 10</h3><p className="muted">이 브라우저에 저장된 플레이 기록입니다. 중지한 게임은 저장하지 않습니다.</p>{records.length?<ol>{records.map((r,i)=><li key={`${r.date}-${i}`}><b>{r.name}</b><span>{r.score.toLocaleString()} P</span><small>{new Date(r.date).toLocaleDateString('ko-KR')}</small></li>)}</ol>:<p className="muted">첫 번째 기록의 주인공이 되어 보세요.</p>}</section></div>;
}



