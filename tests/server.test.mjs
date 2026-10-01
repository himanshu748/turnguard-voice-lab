import test from'node:test';import assert from'node:assert/strict';import{spawn}from'node:child_process';import{once}from'node:events';
test('loopback server serves assets, blocks dotfiles and mutation methods',async()=>{
 const child=spawn(process.execPath,['scripts/serve.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});let timeout;
 try{
  const ready=await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw new Error('Server exited before readiness');}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Server readiness timeout')),4000);})]);clearTimeout(timeout);
  const port=Number(String(ready[0]).match(/:(\d+)/)?.[1]);assert.ok(port>0);const base=`http://127.0.0.1:${port}`;
  const home=await fetch(base);assert.equal(home.status,200);assert.match(await home.text(),/TurnGuard/);
  const js=await fetch(`${base}/src/core.mjs`);assert.equal(js.status,200);assert.match(js.headers.get('content-type'),/javascript/);
  assert.equal((await fetch(`${base}/.git/config`)).status,403);assert.equal((await fetch(base,{method:'POST'})).status,405);assert.equal((await fetch(`${base}/missing`)).status,404);
  const head=await fetch(base,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
 }finally{clearTimeout(timeout);child.kill();await once(child,'exit').catch(()=>{});}
});
