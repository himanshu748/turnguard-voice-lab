import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPresenter } from './helpers/dom-harness.mjs';
test('presenter: controls, same-time comparison, filters, reset and recovery',async(t)=>{
 const h=await loadPresenter(),$=h.get;
 try{
 await t.test('initial meaningful state is ready with seven experiments',()=>{assert.equal($('scenario-list').children.length,7);assert.equal($('run-state').textContent,'Ready');assert.equal($('scenario-name').textContent,'The interruption');assert.match($('events').textContent,/New playback owner/);});
 await t.test('step and jump change model-backed readout',()=>{$('step').click();assert.equal($('clock').textContent,'300 / 4,400 ms');assert.equal($('accepted-count').textContent,'1');$('jump').click();assert.equal($('clock').textContent,'1,600 / 4,400 ms');assert.equal($('dropped-count').textContent,'2');assert.equal($('leak-count').textContent,'0 ms');});
 await t.test('broken comparison preserves time and exposes the leak',()=>{$('broken').click();assert.equal($('clock').textContent,'1,600 / 4,400 ms');assert.equal($('leak-count').textContent,'500 ms');assert.equal($('playback-status').textContent,'WRONG TURN');});
 await t.test('inspector shows the selected synthetic event',()=>{$('events').children.at(-1).children[0].click();assert.equal($('inspector').open,true);assert.match($('payload').textContent,/Synthetic fixture data/);});
 await t.test('reset invalidates a selected future inspector',()=>{$('reset').click();assert.equal($('clock').textContent,'0 / 4,400 ms');assert.equal($('inspector').open,false);assert.equal($('inspector-label').textContent,'No event selected');});
 await t.test('run/pause and repeated resets cannot leave timers',()=>{$('play').click();assert.equal(h.frames.size,1);$('play').click();assert.equal(h.frames.size,0);$('play').click();$('reset').click();$('reset').click();assert.equal(h.frames.size,0);assert.equal($('run-state').textContent,'Ready');});
 await t.test('scenario change cancels running work and resets timeline',()=>{$('play').click();$('scenario-select').value='fatal';$('scenario-select').dispatch('change');assert.equal(h.frames.size,0);assert.equal($('scenario-name').textContent,'Fatal means finished');assert.equal($('clock').textContent,'0 / 4,200 ms');$('safe').click();$('jump').click();assert.match($('contexts').textContent,/fatal/);});
 await t.test('filter empty state recovers',()=>{$('reset').click();$('filter').value='frame';$('filter').dispatch('change');assert.equal($('empty-events').hidden,false);$('filter').value='all';$('filter').dispatch('change');assert.equal($('empty-events').hidden,true);});
 await t.test('keyboard commands avoid editable controls',()=>{h.emit('keydown',{target:{tagName:'SELECT'},key:'k'});assert.equal(h.frames.size,0);h.emit('keydown',{target:{tagName:'BODY'},key:'k',preventDefault(){}});assert.equal(h.frames.size,1);h.emit('keydown',{target:{tagName:'BODY'},key:'r',preventDefault(){}});assert.equal(h.frames.size,0);});
 }finally{h.restore();}
});
test('replay from a completed run invalidates a selected future payload',async()=>{
 const h=await loadPresenter('#interruption/safe/4400'),$=h.get;
 try{$('events').children.at(-1).children[0].click();assert.equal($('inspector').open,true);$('play').click();assert.equal($('clock').textContent,'0 / 4,400 ms');assert.equal($('inspector').open,false);assert.equal($('inspector-label').textContent,'No event selected');assert.equal($('payload').textContent,'Select a ledger event to inspect its payload.');assert.equal(h.frames.size,1);assert.ok(h.document.querySelectorAll('.event-button').every(button=>button.getAttribute('aria-pressed')==='false'));}finally{h.restore();}
});
test('pagehide leaves restored UI coherently paused and saves position',async()=>{
 const h=await loadPresenter(),$=h.get;
 try{$('jump').click();$('play').click();assert.equal($('run-state').textContent,'Running');assert.equal(h.frames.size,1);for(const handler of h.windowHandlers.pagehide)handler({persisted:true});h.document.hidden=true;h.emit('visibilitychange',{});assert.equal(h.frames.size,0);assert.equal($('run-state').textContent,'Paused');assert.equal($('play').querySelector('span').textContent,'Continue');assert.equal($('clock').textContent,'1,600 / 4,400 ms');assert.equal(h.location.hash,'#interruption/safe/1600');h.document.hidden=false;h.emit('visibilitychange',{});assert.equal($('run-state').textContent,'Paused');assert.equal(h.frames.size,0);$('play').click();assert.equal($('run-state').textContent,'Running');assert.equal(h.frames.size,1);}finally{h.restore();}
});
