import{readdirSync,readFileSync,existsSync}from'node:fs';import{resolve}from'node:path';import{fileURLToPath}from'node:url';import{spawnSync}from'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.name.startsWith('.')||entry.name==='node_modules'?[]:entry.isDirectory()?walk(resolve(dir,entry.name)):[resolve(dir,entry.name)]);
for(const file of walk(root).filter(file=>file.endsWith('.mjs'))){const check=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(check.error)throw check.error;if(check.status!==0)process.exit(check.status??1);}
const html=readFileSync(resolve(root,'index.html'),'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length)throw new Error('Duplicate DOM IDs');
for(const[,id]of readFileSync(resolve(root,'src/app.mjs'),'utf8').matchAll(/\$\('([^']+)'\)/g))if(!ids.includes(id))throw new Error(`Missing DOM element: ${id}`);
for(const[,url]of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g))if(!existsSync(resolve(root,url)))throw new Error(`Missing local asset: ${url}`);
console.log('Syntax, DOM ID references and local asset links passed.');
const tests=spawnSync(process.execPath,['--test'],{cwd:root,stdio:'inherit'});if(tests.error)throw tests.error;process.exit(tests.status??1);
