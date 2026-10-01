import { readFileSync } from 'node:fs';
// A small presenter test double. It cannot certify browser layout or accessibility.
export async function loadPresenter(hash=''){
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={};this.attributes={};this.handlers={};this.value='';this.className='';this._text='';this.scrollTop=0;this.scrollHeight=200;this.clientHeight=200;this.hidden=false;this.open=false;this.disabled=false;this.parent=null;}
  set textContent(value){this._text=String(value);this.children=[];}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
  replaceChildren(...items){this._text='';for(const c of this.children)c.parent=null;this.children=[];this.append(...items);}
  setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}
  addEventListener(k,fn){(this.handlers[k]??=[]).push(fn);}dispatch(k,details={}){for(const fn of this.handlers[k]||[])fn({target:this,...details});}click(){this.dispatch('click');}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}querySelectorAll(selector){return this.children.flatMap(c=>[...(matches(c,selector)?[c]:[]),...c.querySelectorAll(selector)]);}
  get classList(){return{toggle:(name,value)=>{const set=new Set(this.className.split(' ').filter(Boolean));value?set.add(name):set.delete(name);this.className=[...set].join(' ');}};}
 }
 function matches(node,selector){return selector.startsWith('.')?node.className.split(' ').includes(selector.slice(1)):node.tagName===selector.toUpperCase();}
 const elements=new Map(),html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
 for(const[,tag,id]of html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"/g))elements.set(id,new Element(tag));
 const play=elements.get('play');play.append(new Element('span'));const svg=new Element('svg');svg.append(new Element('path'));play.append(svg);
 const nowPlaying=new Element('div');nowPlaying.className='now-playing';elements.get('speed').value='1';elements.get('filter').value='all';
 const root=new Element('html');root.append(...elements.values(),nowPlaying);const handlers={};
 const document={documentElement:root,hidden:false,getElementById:id=>elements.get(id),createElement:tag=>new Element(tag),createTextNode:text=>{const n=new Element('text');n.textContent=text;return n;},querySelector:s=>root.querySelector(s),querySelectorAll:s=>root.querySelectorAll(s),addEventListener:(k,fn)=>(handlers[k]??=[]).push(fn)};
 const frames=new Map();let next=1;const location={hash},windowHandlers={};const window={addEventListener:(k,fn)=>(windowHandlers[k]??=[]).push(fn)};
 const globals={document,window,location,history:{replaceState:(_,__,value)=>{location.hash=value;}},matchMedia:()=>({matches:true}),requestAnimationFrame:fn=>{const id=next++;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)};
 const originals=new Map(Object.keys(globals).map(k=>[k,globalThis[k]]));Object.assign(globalThis,globals);
 await import(`../../src/app.mjs?harness=${Math.random()}`);
 return{get:id=>elements.get(id),document,location,frames,windowHandlers,emit:(type,event)=>{for(const fn of handlers[type]||[])fn(event);},restore:()=>{for(const[k,v]of originals)globalThis[k]=v;}};
}
