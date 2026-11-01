/** Original synthesized game sounds; no downloaded audio or external assets. */
export class PopAudio {
 private context:AudioContext|null=null;
 enabled=true;
 unlock(){if(!this.enabled)return;try{this.context??=new AudioContext();void this.context.resume().catch(()=>{});}catch{/* Unsupported audio must never interrupt a move. */}}
 clear(lines:number){const c=this.context;if(!this.enabled||!c||c.state!=='running')return;try{
 const now=c.currentTime,tier=Math.min(3,lines),duration=.24+tier*.12,master=c.createGain();master.gain.value=.19;master.connect(c.destination);
 // Low impact, rising bright chord, and a short filtered noise burst.
 const hit=c.createOscillator(),hg=c.createGain();hit.type='sine';hit.frequency.setValueAtTime(130+tier*25,now);hit.frequency.exponentialRampToValueAtTime(40,now+.15);hg.gain.setValueAtTime(.8,now);hg.gain.exponentialRampToValueAtTime(.001,now+.2);hit.connect(hg);hg.connect(master);hit.start(now);hit.stop(now+.21);
 for(let i=0;i<tier+1;i++){const o=c.createOscillator(),g=c.createGain(),start=now+i*.045;o.type='triangle';o.frequency.value=440*Math.pow(2,([0,4,7,12][i]+(tier-1)*2)/12);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.22,start+.012);g.gain.exponentialRampToValueAtTime(.001,start+duration);o.connect(g);g.connect(master);o.start(start);o.stop(start+duration+.02);}
 const noise=c.createBuffer(1,Math.floor(c.sampleRate*.14),c.sampleRate),samples=noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(1-i/samples.length);const n=c.createBufferSource(),f=c.createBiquadFilter(),ng=c.createGain();n.buffer=noise;f.type='highpass';f.frequency.value=1500;ng.gain.value=.12*tier;n.connect(f);f.connect(ng);ng.connect(master);n.start(now);n.stop(now+.15);setTimeout(()=>master.disconnect(),1200);
 }catch{/* Sound failure cannot affect score, input, or clear completion. */}}
 close(){const c=this.context;this.context=null;if(c)void c.close().catch(()=>{});}
}
