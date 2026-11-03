import assert from 'node:assert/strict';
import { REGIONS_DATA } from '../src/client/data/regions';
import { placeMastersWithoutCollision,parseSvgPathToPoints,pointInPolygon } from '../src/client/lib/marker-placement';
let total=0;
for(const region of Object.values(REGIONS_DATA)){
 const points=Array.from({length:300},(_,id)=>({id,x:region.labelX,y:region.labelY,rating:id%5}));
 const [x=0,y=0,width=0,height=0]=region.viewBox.split(/\s+/).map(Number);
 const start=performance.now();const placed=placeMastersWithoutCollision(points,region.path,{x,y,width,height});
 assert.equal(placed.placed.length,300,region.id);
 const polygon=parseSvgPathToPoints(region.path);
 const halo=placed.radius+Math.min(0.9,placed.radius*.15);
 for(const p of placed.placed){for(let angle=0;angle<16;angle++)assert.ok(pointInPolygon({x:p.x+Math.cos(angle*Math.PI/8)*halo,y:p.y+Math.sin(angle*Math.PI/8)*halo},polygon),region.id+' marker boundary');}
 const pts=placed.placed;
 for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++)assert.ok(Math.hypot(pts[i]!.x-pts[j]!.x,pts[i]!.y-pts[j]!.y)>=halo*2,region.id+' collision');
 for(const axis of ['x','y'] as const){const coords=polygon.map(p=>p[axis]??0);const low=Math.min(...coords),high=Math.max(...coords);assert.ok(Math.min(...pts.map(p=>p[axis]))<low+(high-low)*.25,region.id+' coverage near minimum');assert.ok(Math.max(...pts.map(p=>p[axis]))>high-(high-low)*.25,region.id+' coverage near maximum');}

 console.log(region.id,placed.placed.length,Math.round(performance.now()-start)+' ms');total+=points.length;
}
assert.equal(total,7800);console.log('Marker placement: all 26 outlines, 300 non-overlapping points per outline, full coverage.');
