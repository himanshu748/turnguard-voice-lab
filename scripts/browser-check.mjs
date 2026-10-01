/** Optional: uses an existing Playwright install. Never installs packages or changes settings. */
import assert from'node:assert/strict';import{mkdir}from'node:fs/promises';import{resolve}from'node:path';
let chromium;
try{({chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'));}catch{console.error('Playwright unavailable. Optional browser check did not run. Use node scripts/check.mjs for offline checks.');process.exit(2);}
const base=process.env.TURNGUARD_URL||'http://127.0.0.1:4173';if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('Browser checks are restricted to the local demo');
const output=resolve(process.env.TURNGUARD_SCREENSHOTS||'/tmp/turnguard-browser-qa');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
try{
 for(const viewport of[{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(new URL(r.url()).origin!==new URL(base).origin)external.push(r.url());});
  await page.goto(base);assert.match(await page.title(),/TurnGuard/);assert.equal(await page.locator('#scenario-name').textContent(),'The interruption');
  await page.getByRole('button',{name:'Jump to the key moment'}).click();assert.equal(await page.locator('#dropped-count').textContent(),'2');assert.equal(await page.locator('#leak-count').textContent(),'0 ms');
  await page.getByRole('button',{name:'Broken client',exact:true}).click();assert.equal(await page.locator('#leak-count').textContent(),'500 ms');
  await page.locator('.event-button').last().click();assert.equal(await page.locator('#inspector').getAttribute('open'),'');
  await page.getByRole('button',{name:'Reset experiment',exact:true}).click();assert.equal(await page.locator('#inspector').getAttribute('open'),null);
  await page.getByRole('button',{name:'Safe client',exact:true}).click();await page.getByRole('button',{name:'Jump to the key moment'}).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:resolve(output,`safe-${viewport.width}.png`),fullPage:true});await page.getByRole('button',{name:'Broken client',exact:true}).click();await page.screenshot({path:resolve(output,`broken-${viewport.width}.png`),fullPage:true});
  await page.getByRole('button',{name:'Reset experiment',exact:true}).click();await page.keyboard.press('k');assert.equal(await page.locator('#run-state').textContent(),'Running');await page.keyboard.press('r');assert.equal(await page.locator('#run-state').textContent(),'Ready');
  const[download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export trace'}).click()]);assert.match(download.suggestedFilename(),/turnguard-interruption-broken\.json/);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(`${viewport.width}x${viewport.height}: browser interaction, console, local-only requests and overflow checks passed`);await context.close();
 }
 console.log(`Screenshots saved in ${output}. Inspect them before claiming visual quality.`);
}finally{await browser.close();}
