import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');

function worker({assets=['/','/assets/home.js','/assets/history.js'], failInstall=false}={}) {
 const listeners={};const stores=new Map([['unrelated-app',new Map()],['treino-shell-old',new Map()]]);
 const key=request=>typeof request==='string'?request:new URL(request.url).pathname;
 const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);return {async addAll(urls){if(failInstall)throw Error('download failed');for(const url of urls)data.set(url,{ok:true,url})},async match(request){return data.get(key(request))}}},async keys(){return [...stores.keys()]},async delete(name){return stores.delete(name)}};
 const self={__TREINO_BUILD_ID__:'test',__TREINO_PRECACHE_URLS__:assets,location:{origin:'https://treino.test'},clients:{claim:async()=>{}},addEventListener(type,fn){listeners[type]=fn}};
 vm.runInNewContext(source,{self,caches,URL,Set,fetch:async()=>{throw Error('offline')}});
 const lifecycle=async type=>{let result;listeners[type]({waitUntil(value){result=value}});await result};
 const request=async(url,mode='cors',method='GET')=>{let response;listeners.fetch({request:{url,mode,method},respondWith(value){response=value}});return response};
 return {stores,lifecycle,request};
}

test('a screen never opened online and the matching HTML are available offline',async()=>{
 const w=worker();await w.lifecycle('install');await w.lifecycle('activate');
 assert.equal((await w.request('https://treino.test/assets/history.js')).url,'/assets/history.js');
 assert.equal((await w.request('https://treino.test/','navigate')).url,'/');
});

test('activation cleans only Treino caches; auth/API requests are not intercepted',async()=>{
 const w=worker();await w.lifecycle('install');await w.lifecycle('activate');
 assert.ok(w.stores.has('unrelated-app'));assert.equal(w.stores.has('treino-shell-old'),false);
 assert.equal(await w.request('https://backend.test/auth/v1/user'),undefined);
 assert.equal(await w.request('https://treino.test/api/data'),undefined);
 assert.equal(await w.request('https://treino.test/assets/history.js','cors','POST'),undefined);
});

test('a failed precache install does not remove the previous working release',async()=>{
 const w=worker({failInstall:true});await assert.rejects(w.lifecycle('install'));
 assert.ok(w.stores.has('treino-shell-old'));
});
