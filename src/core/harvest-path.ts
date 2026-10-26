// Grid route from an exposed block to the bottom collection port. Occupied cells are walls.
export function collectionRoute(width:number,height:number,cells:number[],index:number){
 const w=width+2,h=height+2,start=(Math.floor(index/width)+1)*w+index%width+1,target=(h-1)*w+Math.floor(w/2),queue=[start],parent=new Map<number,number>([[start,-1]]);
 for(let at=0;at<queue.length&&!parent.has(target);at++){
  const i=queue[at],x=i%w,y=Math.floor(i/w);
  for(const [dx,dy]of [[0,1],[-1,0],[1,0],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*w+nx;if(nx<0||ny<0||nx>=w||ny>=h||parent.has(n))continue;
   if(nx>0&&nx<=width&&ny>0&&ny<=height&&cells[(ny-1)*width+nx-1]>=0)continue;
   parent.set(n,i);queue.push(n);
  }
 }
 if(!parent.has(target))return [];
 const path:number[]=[];for(let n=target;n!==-1;n=parent.get(n)!)path.push(n);
 return path.reverse().map(n=>({x:n%w-1,y:Math.floor(n/w)-1}));
}
