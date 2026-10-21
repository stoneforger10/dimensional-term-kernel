import test from 'node:test';
import assert from 'node:assert/strict';
import {Q,plus,times,over,checkTable,evaluate} from '../scripts/reference.mjs';
const table={units:[
 {symbol:'SPAN',kind:'LINEAR',dimension:[1,0,0,0],scale:[1,100],offset:[0,1]},
 {symbol:'BEAT',kind:'LINEAR',dimension:[0,1,0,0],scale:[120,1],offset:[0,1]},
 {symbol:'RATE',kind:'LINEAR',dimension:[1,-1,0,0],scale:[1,1],offset:[0,1]},
 {symbol:'HOT',kind:'POINT',dimension:[0,0,0,1],scale:[1,1],offset:[5463,20]},
 {symbol:'COLD',kind:'POINT',dimension:[0,0,0,1],scale:[1,1],offset:[0,1]},
 {symbol:'DELTA',kind:'LINEAR',dimension:[0,0,0,1],scale:[1,1],offset:[0,1]}
]};
test('independent dimensional and affine examples',()=>{
 checkTable(table,table.units.map(u=>u.symbol));
 assert.deepEqual(evaluate(table,'150@SPAN 2@BEAT /','RATE').value,[1,160]);
 assert.deepEqual(evaluate(table,'20@HOT 5@DELTA +','COLD').value,[5963,20]);
 assert.deepEqual(evaluate(table,'30@HOT 20@HOT -','DELTA').value,[10,1]);
});
test('point/difference operator truth table',()=>{
 for(const a of ['HOT','DELTA'])for(const b of ['HOT','DELTA'])for(const op of ['+','-','*','/']){
  const valid=op==='+'?!(a==='HOT'&&b==='HOT'):op==='-'?!(a==='DELTA'&&b==='HOT'):a==='DELTA'&&b==='DELTA';
  if(valid)evaluate(table,`2@${a} 3@${b} ${op}`);else assert.throws(()=>evaluate(table,`2@${a} 3@${b} ${op}`));
 }
 assert.throws(()=>evaluate(table,'1@SPAN 1@BEAT +'));assert.throws(()=>evaluate(table,'1@HOT','DELTA'));
});
test('exact reversible affine conversions for 201 rational readings',()=>{
 for(let i=-100;i<=100;i++){
  const result=evaluate(table,`${i}/7@HOT`,'COLD');
  const [n,d]=result.value;assert.deepEqual(evaluate(table,`${n}/${d}@COLD`,'HOT').value,[Number(Q(i,7)[0]),Number(Q(i,7)[1])]);
 }
});
test('rational identities use BigInt, not binary floating point',()=>{
 for(let i=-30;i<=30;i++)for(let j=1;j<=15;j++){
  const a=Q(i,j),b=Q(j,17);assert.deepEqual(over(times(a,b),b),a);assert.deepEqual(plus(a,Q(-i,j)),[0n,1n]);
 }
});
