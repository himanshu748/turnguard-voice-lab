import{createServer}from'node:http';import{readFile}from'node:fs/promises';import{extname,resolve,sep}from'node:path';import{fileURLToPath}from'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8','.json':'application/json'};
const server=createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Method not allowed');return;}
 try{
  const pathname=decodeURIComponent(new URL(req.url,`http://${req.headers.host}`).pathname),path=resolve(root,`.${pathname==='/'?'/index.html':pathname}`),relative=path.slice(root.length);
  if(!path.startsWith(root.endsWith(sep)?root:root+sep)||relative.split(/[\\/]/).some(part=>part.startsWith('.'))){res.writeHead(403);res.end('Forbidden');return;}
  const body=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`TurnGuard is offline-ready at http://127.0.0.1:${server.address().port}`));
