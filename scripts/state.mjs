import assert from 'node:assert/strict';
import {canonical,digest,sha,read} from './check.mjs';
import {checkTable,evaluate} from './reference.mjs';
export async function moduleState(address,key){
 const m=await read(address,'get_module',[key]),{root,...body}=m,r=m.report,s=r.spec,row=r.source;
 assert.equal(digest(body),root);assert.equal(digest(s),key);assert.equal(m.input_root,key);
 assert.equal(s.contract,address);assert.equal(s.policy,'dimensional-term-kernel-v1');assert.equal(row.url,s.source.url);
 if(['OK','HASH_MISMATCH'].includes(row.status)){
  assert.equal(row.http,200);assert(Buffer.byteLength(row.body)>=1&&Buffer.byteLength(row.body)<=4096);
  assert.equal(sha(row.body),row.hash);assert.equal(row.status,row.hash===s.source.sha256?'OK':'HASH_MISMATCH');
 }else{assert(['UNAVAILABLE','HTTP_ERROR','SIZE_ERROR','ENCODING_ERROR'].includes(row.status));assert(!row.body&&!row.hash);}
 let ready=false;
 if(row.status==='OK'){checkTable(r.definitions,s.symbols);ready=r.definitions.units.every(u=>u.kind!=='UNKNOWN');}
 else assert.deepEqual(r.definitions,{units:[]});
 assert.equal(m.status,ready?'READY':'HELD');return m;
}
export async function calculationState(address,key,module){
 const r=await read(address,'get_calculation',[key]),{root,...body}=r;
 assert.equal(digest(body),root);assert.equal(r.contract,address);assert.equal(r.input_root,module.input_root);assert.equal(r.module_root,module.root);
 assert.equal(digest({contract:address,actor:r.actor,nonce:r.nonce}),key);assert.equal(module.status,'READY');
 assert.equal(canonical(evaluate(module.report.definitions,r.expression,r.target)),canonical(r.result));
 assert.equal(canonical(await read(address,'evaluate',[r.input_root,r.module_root,r.expression,r.target])),canonical(r.result));return r;
}
