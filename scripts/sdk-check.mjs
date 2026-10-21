import assert from 'node:assert/strict';
import {abi} from 'genlayer-js';
const root='a'.repeat(64),coordinate='stoneforger10/dimensional-term-kernel/'+'b'.repeat(40)+'/examples/units.txt';
for(const [name,args] of [
 ['module_key',[coordinate,root,'SPAN,BEAT']],['interpret',['demo',coordinate,root,'SPAN,BEAT']],
 ['get_module',[root]],['evaluate',[root,root,'150@SPAN 2@BEAT /','RATE']],
 ['record_calculation',['speed',root,root,'150@SPAN 2@BEAT /','RATE']],
 ['get_calculation',[root]],['get_attempt',['0x'+'1'.repeat(40),'demo']]
]){const bytes=abi.calldata.encode(abi.calldata.makeCalldataObject(name,args,{}));assert.deepEqual(abi.calldata.encode(abi.calldata.decode(bytes)),bytes);}
console.log('7 SDK calldata roundtrips passed');
