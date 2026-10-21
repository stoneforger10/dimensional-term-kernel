import fs from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {getAddress} from 'viem';
import {rpc,receipt,source,read,denied,sha,digest,canonical} from './check.mjs';
import {moduleState,calculationState} from './state.mjs';
const account={name:'studio-proof-deployer',address:getAddress('0x7a413bb4ab62e31d62d4cd9efc8c8a8dae37fb42')};
const file='PROOFS.json',commit=process.argv[2],names='SPAN,BEAT,RATE,HOT,COLD,DELTA';
if(!/^[0-9a-f]{40}$/.test(commit??''))throw Error('Supply published full fixture commit');
let p=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):
 {network:'studionet',chain_id:61999,fixture_commit:commit,account,transactions:[],modules:{},calculations:{}};
assert.equal(p.fixture_commit,commit);
const save=()=>fs.writeFileSync(file,JSON.stringify(p,null,2)+'\n');p.final_readback_verified=false;save();let phase='preflight';
function broadcast(args,onHash){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,['scripts/run-cli.cjs',...args],{windowsHide:true,env:{...process.env,DTK_TEST_ACCOUNT:account.name},stdio:['ignore','pipe','pipe']});
 let carry='';child.stderr.resume();child.stdout.on('data',data=>{carry+=data.toString();const lines=carry.split(/\r?\n/);carry=lines.pop();
  for(const line of lines)if(/^BROADCAST_HASH 0x[0-9a-fA-F]{64}$/.test(line))onHash(line.split(' ')[1]);});
 child.on('error',()=>reject(Error('CLI launch failed')));child.on('close',resolve);
});}
async function tx(step,args,expected='SUCCESS',message){
 phase=step;let entry=p.transactions.find(t=>t.step===step);
 if(!entry){
  const latest=await rpc('eth_getTransactionCount',[account.address,'latest']),pending=await rpc('eth_getTransactionCount',[account.address,'pending']);
  assert.equal(latest,pending,'Signer has pending transactions');
  entry={step,signer:account.address,expected,cli_arguments:args,nonce_before:latest,broadcast_unknown:true,verified:false,...(message?{expected_message:message}:{})};
  p.transactions.push(entry);save();await broadcast(args,hash=>{entry.hash=hash;delete entry.broadcast_unknown;save();console.log(step+' '+hash);});
 }
 if(!entry.hash)throw Error('Unknown broadcast outcome; audit history before any retry');
 assert.equal(canonical(entry.cli_arguments),canonical(args));
 Object.assign(entry,await receipt(entry.hash,expected,message),{verified:true});save();
 console.log(JSON.stringify({step,status:entry.status,execution:entry.execution,consensus:entry.consensus}));
 if(expected==='SUCCESS'&&!entry.committed)throw Error('No state committed');return entry;
}
const write=(step,method,args,expected='SUCCESS',message)=>tx(step,['write',p.address,method,'--args',...args.map(String)],expected,message);
function definitionArgs(nonce,fixture='units',bad=false){return [nonce,'stoneforger10/dimensional-term-kernel/'+commit+'/examples/'+fixture+'.txt',bad?'f'.repeat(64):sha(fs.readFileSync('examples/'+fixture+'.txt')),fixture==='ambiguous'?'SPAN,BEAT':names];}
async function interpret(step,nonce,fixture='units',bad=false){
 const args=definitionArgs(nonce,fixture,bad);await write(step,'interpret',args);
 const key=await read(p.address,'module_key',args.slice(1)),module=await moduleState(p.address,key);
 p.modules[nonce]={key,state:module};assert.equal(await read(p.address,'get_attempt',[account.address,nonce]),key);save();return module;
}
async function calculation(nonce,module,expression,target,expected){
 await write('record-'+nonce,'record_calculation',[nonce,module.input_root,module.root,expression,target]);
 const key=digest({contract:p.address,actor:account.address,nonce}),state=await calculationState(p.address,key,module);
 assert.deepEqual(state.result.value,expected);p.calculations[nonce]={key,state};save();
}
try{
 assert.equal(await rpc('eth_chainId',[]),'0xf22f');
 for(const name of ['units','ambiguous']){
  const path='examples/'+name+'.txt',url='https://raw.githubusercontent.com/stoneforger10/dimensional-term-kernel/'+commit+'/'+path;
  const r=await fetch(url,{signal:AbortSignal.timeout(20000)});assert(r.ok);assert.equal(sha(Buffer.from(await r.arrayBuffer())),sha(fs.readFileSync(path)));
 }
 const deployed=await tx('deploy',['deploy','--contract','contracts/DimensionalTermKernel.py']);p.address=deployed.address;p.source=await source(p.address);save();
 const ready=await interpret('interpret-ready','ready');assert.equal(ready.status,'READY');
 assert.deepEqual(ready.report.definitions.units.map(u=>[u.symbol,u.scale,u.offset,u.kind]),[
  ['SPAN',[1,100],[0,1],'LINEAR'],['BEAT',[120,1],[0,1],'LINEAR'],['RATE',[1,1],[0,1],'LINEAR'],
  ['HOT',[1,1],[5463,20],'POINT'],['COLD',[1,1],[0,1],'POINT'],['DELTA',[1,1],[0,1],'LINEAR']]);
 await calculation('speed',ready,'150@SPAN 2@BEAT /','RATE',[1,160]);
 await calculation('point-shift',ready,'20@HOT 5@DELTA +','COLD',[5963,20]);
 await calculation('point-difference',ready,'30@HOT 20@HOT -','DELTA',[10,1]);
 await write('calculation-replay','record_calculation',['speed',ready.input_root,ready.root,'1@SPAN','SPAN'],'ERROR','Calculation nonce used');
 await write('root-substitution','record_calculation',['bad-root',ready.input_root,'f'.repeat(64),'1@SPAN','SPAN'],'ERROR','Module root mismatch');
 await write('dimension-mismatch','record_calculation',['bad-dimension',ready.input_root,ready.root,'1@SPAN 1@BEAT +','_'],'ERROR','Dimension mismatch');
 await write('point-addition','record_calculation',['bad-points',ready.input_root,ready.root,'20@HOT 10@HOT +','_'],'ERROR','Invalid point arithmetic');
 const bad=await interpret('interpret-bad-hash','bad-hash','units',true);assert.equal(bad.status,'HELD');assert.equal(bad.report.source.status,'HASH_MISMATCH');
 await write('held-definitions','record_calculation',['held',bad.input_root,bad.root,'1@SPAN','SPAN'],'ERROR','Definitions held');
 const unknown=await interpret('interpret-ambiguous','ambiguous','ambiguous');assert.equal(unknown.status,'HELD');assert(unknown.report.definitions.units.every(u=>u.kind==='UNKNOWN'));
 await write('module-resampling','interpret',definitionArgs('resample'),'ERROR','Definition set already examined');
 await write('creator-nonce-replay','interpret',definitionArgs('ready','ambiguous'),'ERROR','Nonce already used');
 assert(await denied(p.address,'evaluate',[ready.input_root,'f'.repeat(64),'1@SPAN','SPAN']));
 for(const x of Object.values(p.modules))assert.equal(canonical(await moduleState(p.address,x.key)),canonical(x.state));
 for(const x of Object.values(p.calculations))assert.equal(canonical(await calculationState(p.address,x.key,ready)),canonical(x.state));
 for(const nonce of ['bad-root','bad-dimension','bad-points','held']){
  assert(await denied(p.address,'get_calculation',[digest({contract:p.address,actor:account.address,nonce})]));
 }
 p.rejected_calculations_absent=true;
 p.source=await source(p.address);assert(p.transactions.every(t=>t.verified&&t.hash&&!t.broadcast_unknown));p.final_readback_verified=true;save();
 console.log(JSON.stringify({complete:true,address:p.address,transactions:p.transactions.length,modules:Object.keys(p.modules).length,calculations:Object.keys(p.calculations).length}));
}catch(e){console.error('Sanitized workflow stopped at '+phase+' ('+(e instanceof assert.AssertionError?'assertion':'network/receipt check')+'); inspect journal before retry');process.exitCode=1;}
