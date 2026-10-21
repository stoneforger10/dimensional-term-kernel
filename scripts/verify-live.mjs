import fs from 'node:fs';
import assert from 'node:assert/strict';
import {rpc,receipt,source,denied,canonical,digest} from './check.mjs';
import {moduleState,calculationState} from './state.mjs';
try{
 const p=JSON.parse(fs.readFileSync('PROOFS.json','utf8'));assert(p.final_readback_verified);
 assert.equal(await rpc('eth_chainId',[]),'0xf22f');assert.equal(canonical(await source(p.address)),canonical(p.source));
 for(const t of p.transactions){assert(t.hash&&t.verified&&!t.broadcast_unknown);const actual=await receipt(t.hash,t.expected,t.expected_message);
  for(const key of ['hash','address','status','execution','consensus','committed'])assert.equal(actual[key],t[key]);await new Promise(r=>setTimeout(r,2200));}
 for(const x of Object.values(p.modules))assert.equal(canonical(await moduleState(p.address,x.key)),canonical(x.state));
 for(const x of Object.values(p.calculations))assert.equal(canonical(await calculationState(p.address,x.key,p.modules.ready.state)),canonical(x.state));
 for(const nonce of ['bad-root','bad-dimension','bad-points','held']){
  assert(await denied(p.address,'get_calculation',[digest({contract:p.address,actor:p.account.address,nonce})]));
 }
 const r=p.modules.ready;assert(await denied(p.address,'evaluate',[r.key,'f'.repeat(64),'1@SPAN','SPAN']));
 console.log(JSON.stringify({verified:true,address:p.address,transactions:p.transactions.length,source_match:true,modules:3,calculations:3}));
}catch{console.error('Read-only verification failed; no transaction signed or sent');process.exitCode=1;}
