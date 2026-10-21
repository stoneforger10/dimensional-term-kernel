// Independent BigInt rational oracle. Never imports or executes contract Python.
import assert from 'node:assert/strict';
export function Q(n,d=1n){n=BigInt(n);d=BigInt(d);assert(d!==0n);if(d<0n){n=-n;d=-d;}let a=n<0n?-n:n,b=d;while(b){[a,b]=[b,a%b];}return [n/a,d/a];}
export const plus=(a,b)=>Q(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
export const times=(a,b)=>Q(a[0]*b[0],a[1]*b[1]);
export const minus=(a,b)=>plus(a,[-b[0],b[1]]);
export const over=(a,b)=>Q(a[0]*b[1],a[1]*b[0]);
export const pair=x=>x.map(v=>{assert(Number.isSafeInteger(v));return BigInt(v);});
export const jsonPair=x=>x.map(v=>{const n=Number(v);assert(Number.isSafeInteger(n)&&BigInt(n)===v);return n;});
export function checkTable(table,names){
 assert.deepEqual(Object.keys(table),['units']);assert.equal(table.units.length,names.length);
 table.units.forEach((u,i)=>{
  assert.deepEqual(Object.keys(u).sort(),['dimension','kind','offset','scale','symbol']);assert.equal(u.symbol,names[i]);
  if(u.kind==='UNKNOWN'){assert.deepEqual([u.dimension,u.scale,u.offset],[[],[],[]]);return;}
  assert(['LINEAR','POINT'].includes(u.kind));assert.equal(u.dimension.length,4);u.dimension.forEach(v=>assert(Number.isInteger(v)&&Math.abs(v)<=4));
  for(const p of [u.scale,u.offset]){assert.equal(p.length,2);assert.deepEqual(jsonPair(Q(...pair(p))),p);}
  assert(u.scale[0]>0);
  if(u.kind==='LINEAR')assert.deepEqual(u.offset,[0,1]);else assert.deepEqual(u.dimension,[0,0,0,1]);
 });return table;
}
export function evaluate(table,expression,target='_'){
 const units=Object.fromEntries(table.units.map(u=>[u.symbol,u])),stack=[];
 for(const token of expression.split(' ')){
  if(!['+','-','*','/'].includes(token)){
   const match=/^(-?\d+)(?:\/(\d+))?@([A-Z][A-Z0-9_]*)$/.exec(token);assert(match&&units[match[3]]);
   const u=units[match[3]];assert(u.kind!=='UNKNOWN');stack.push({q:plus(times(Q(match[1],match[2]??1),pair(u.scale)),pair(u.offset)),dim:u.dimension,point:u.kind==='POINT'});continue;
  }
  assert(stack.length>=2);const b=stack.pop(),a=stack.pop();let q,dim,point=false;
  if(token==='+'||token==='-'){
   assert.deepEqual(a.dim,b.dim);dim=a.dim;
   const allowed=token==='+'?!(a.point&&b.point):!(!a.point&&b.point);assert(allowed);
   point=token==='+'?(a.point||b.point):(a.point&&!b.point);q=token==='+'?plus(a.q,b.q):minus(a.q,b.q);
  }else{assert(!a.point&&!b.point);q=token==='*'?times(a.q,b.q):over(a.q,b.q);dim=a.dim.map((x,i)=>x+(token==='*'?b.dim[i]:-b.dim[i]));}
  stack.push({q,dim,point});
 }
 assert.equal(stack.length,1);let {q,dim,point}=stack[0];
 if(target!=='_'){const u=units[target];assert(u);assert.deepEqual(dim,u.dimension);assert.equal(point,u.kind==='POINT');q=over(minus(q,pair(u.offset)),pair(u.scale));}
 return {value:jsonPair(q),dimension:dim,kind:point?'POINT':'LINEAR',target};
}
