// Dependency-free DOM smoke test for dashboard navigation and theme persistence.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'site/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'site/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'site/styles.css'), 'utf8');
assert.equal((html.match(/class="stat stat-button"/g) || []).length, 4);
assert.match(html, /id="theme-toggle"/);
assert.match(css, /data-theme="dark"/);
class Element {
 constructor(dataset={}) {
  this.dataset=dataset;this.listeners={};this.value='';this.style={};this.hidden=false;this.innerHTML='';this.textContent='';
  this.classList={toggle:()=>{}};this.attrs={};
 }
 addEventListener(type,listener){this.listeners[type]=listener;}
 setAttribute(name,value){this.attrs[name]=value;}
 scrollIntoView(){this.scrolled=true;}
}
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const byId=Object.fromEntries(ids.map(id=>['#'+id,new Element()]));
const navs=['latest','all','wrong'].map(view=>new Element({view}));
const stats=['all','completed','wrong','incomplete'].map(stat=>new Element({stat}));
const meta=new Element();
const storage=new Map();
const document={
 documentElement:{dataset:{}},
 querySelector(selector){if(selector==='meta[name="theme-color"]')return meta;if(!byId[selector])throw new Error('Missing selector '+selector);return byId[selector];},
 querySelectorAll(selector){if(selector==='.nav')return navs;if(selector==='.stat-button')return stats;throw new Error('Unknown selector '+selector);}
};
const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const fetch=async uri=>({ok:true,json:async()=>{
 if(uri.endsWith('archive.json'))return JSON.parse(fs.readFileSync(path.join(root,'site/data/archive.json'),'utf8'));
 if(uri.endsWith('manifest.json'))return {days:[]};
 throw new Error('Unexpected request '+uri);
}});
const context=vm.createContext({document,localStorage,fetch,console,Blob,URL,setTimeout});
vm.runInContext(js,context,{filename:'site/app.js'});
(async()=>{
 await new Promise(resolve=>setImmediate(resolve));
 let all=vm.runInContext('allQuestions()',context);
 assert.equal(all.length,21);
 assert.equal(byId['#stat-total'].textContent,21);
 stats[0].listeners.click();assert.equal(vm.runInContext('state.view',context),'all');
 stats[1].listeners.click();assert.equal(vm.runInContext('state.progressFilter',context),'completed');
 assert.equal(vm.runInContext('activeGroups().flatMap(groupQs).length',context),0);
 vm.runInContext('state.progress[allQuestions()[0].id]={done:true}',context);
 stats[1].listeners.click();assert.equal(vm.runInContext('activeGroups().flatMap(groupQs).length',context),1);
 stats[3].listeners.click();assert.equal(vm.runInContext('activeGroups().flatMap(groupQs).length',context),20);
 stats[2].listeners.click();assert.equal(vm.runInContext('state.view',context),'wrong');
 navs[0].listeners.click();assert.equal(vm.runInContext('state.view',context),'latest');
 byId['#theme-toggle'].listeners.click();
 assert.equal(document.documentElement.dataset.theme,'dark');
 assert.equal(localStorage.getItem('embeddedlab:theme:v1'),'dark');
 byId['#theme-toggle'].listeners.click();
 assert.equal(document.documentElement.dataset.theme,'light');
 console.log('PASS: 4 clickable stats, completed/incomplete filters, navigation reset, persisted dark/light theme, 21 archived questions');
})().catch(e=>{console.error(e);process.exitCode=1});
