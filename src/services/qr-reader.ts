import jsQR from 'jsqr';
export function decodeQrPixels(data:Uint8ClampedArray,width:number,height:number){return jsQR(data,width,height,{inversionAttempts:'attemptBoth'})?.data??null;}
export function qrRegions(width:number,height:number,thorough=true){
 const regions=[{x:0,y:0,width,height}];if(!thorough)return regions;
 for(const fraction of [.65,.4])for(const px of [0,.5,1])for(const py of [0,.5,1]){const w=Math.max(1,Math.round(width*fraction)),h=Math.max(1,Math.round(height*fraction));regions.push({x:Math.round((width-w)*px),y:Math.round((height-h)*py),width:w,height:h});}
 return regions;
}
export async function readQrImage(source:CanvasImageSource,width:number,height:number,thorough=true):Promise<string|null>{
 if(!width||!height)return null;
 const Native=(globalThis as unknown as {BarcodeDetector?:new(o:{formats:string[]})=>{detect:(source:CanvasImageSource)=>Promise<{rawValue:string}[]>}}).BarcodeDetector;
 if(Native)try{const found=await new Native({formats:['qr_code']}).detect(source);if(found[0]?.rawValue)return found[0].rawValue;}catch{/* jsQR remains available on Safari and unsupported formats. */}
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('사진 처리 기능을 사용할 수 없습니다.');
 for(const region of qrRegions(width,height,thorough)){
  const scale=Math.min(2,1800/Math.max(region.width,region.height));canvas.width=Math.max(1,Math.round(region.width*scale));canvas.height=Math.max(1,Math.round(region.height*scale));
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,region.x,region.y,region.width,region.height,0,0,canvas.width,canvas.height);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),decoded=decodeQrPixels(pixels.data,pixels.width,pixels.height);if(decoded)return decoded;
  if(thorough){const contrast=new Uint8ClampedArray(pixels.data);for(let i=0;i<contrast.length;i+=4){const gray=(contrast[i]*.299+contrast[i+1]*.587+contrast[i+2]*.114);const adjusted=Math.max(0,Math.min(255,(gray-128)*1.65+128));contrast[i]=contrast[i+1]=contrast[i+2]=adjusted;}const value=decodeQrPixels(contrast,pixels.width,pixels.height);if(value)return value;}
  await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 return null;
}
