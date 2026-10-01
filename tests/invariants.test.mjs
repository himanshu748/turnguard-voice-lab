import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition } from '../src/core.mjs';
function random(seed){let x=seed;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/2**32;};}
function invariant(s,previous,seed){
 const message=`seed=${seed}, at=${s.now}`;
 assert.equal(s.stats.leakedMs,0,message);assert.ok(s.now>=previous.now,message);
 if(s.playing){assert.equal(s.playing.contextId,s.activeId,message);assert.ok(['streaming','complete'].includes(s.contexts[s.playing.contextId].status),message);assert.ok(s.playing.remainingMs>0,message);}
 for(const item of s.queue)assert.ok(['streaming','complete'].includes(s.contexts[item.contextId].status),message);
 for(const context of Object.values(s.contexts)){
  assert.equal(new Set(context.seen).size,context.seen.length,message);assert.equal(context.received,context.seen.length,message);
  const prior=Object.hasOwn(previous.contexts,context.id)?previous.contexts[context.id]:null;
  if(prior&&prior.status!=='streaming')assert.notEqual(context.status,'streaming',message);
 }
 for(let i=1;i<s.segments.length;i++)assert.ok(s.segments[i].startedAt>=s.segments[i-1].endedAt,message);
 assert.ok(s.segments.every(segment=>!segment.stale),message);
}
test('120 seeded schedules / 14,400 transitions preserve safe-client invariants',()=>{
 for(let seed=1;seed<=120;seed++){
  const rng=random(seed);let s=initialState(),at=0;
  for(let i=0;i<120;i++){
   at+=Math.floor(rng()*90);const id=['turn-a','turn-b','turn-c','ghost','constructor'][Math.floor(rng()*5)];const kind=Math.floor(rng()*9);let event;
   if(kind===0)event={type:'start',contextId:id,at,focus:rng()>.25};
   else if(kind===1)event={type:'interrupt',contextId:id,at};
   else if(kind===2)event={type:'frame',at,raw:'not-json'};
   else if(kind===3)event={type:'frame',at,raw:{context_id:id,final:true}};
   else if(kind===4)event={type:'frame',at,raw:{context_id:id,error:'Fixture error',error_code:'FIXTURE_ERROR',fatal:rng()>.3}};
   else if(kind===5)event={type:'frame',at,raw:{context_id:id,warning:'Fixture warning',warning_code:'INVALID_BUFFER_SIZE'}};
   else if(kind===6)event={type:'tick',at};
   else event={type:'frame',at,raw:{context_id:id,audio:'synthetic:fixture',demo:{chunk_id:`chunk-${Math.floor(rng()*8)}`,duration_ms:Math.floor(rng()*900)+1,label:'Synthetic words'}}};
   const previous=s;s=transition(s,event);invariant(s,previous,seed);
  }
  const previous=s;s=transition(s,{type:'tick',at:at+5000});invariant(s,previous,seed);assert.ok(Object.values(s.contexts).every(c=>c.status!=='streaming'));
 }
});
test('all short orderings around cancel/audio/final stay safe',()=>{
 const permutations=items=>items.length?items.flatMap((item,i)=>permutations(items.filter((_,j)=>i!==j)).map(rest=>[item,...rest])):[[]];
 const events=[{type:'interrupt'},{type:'frame',raw:{context_id:'turn-a',audio:'synthetic:x',demo:{chunk_id:'chunk-x',duration_ms:500,label:'x'}}},{type:'frame',raw:{context_id:'turn-a',final:true}},{type:'start',contextId:'turn-b'}];
 for(const order of permutations(events)){let s=transition(initialState(),{type:'start',contextId:'turn-a',at:0});for(const event of order){const previous=s;s=transition(s,{...event,at:100});invariant(s,previous,'permutation');}}
});
