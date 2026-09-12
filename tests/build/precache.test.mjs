import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
test('production worker includes every generated JS/CSS chunk',()=>{
 const built=readFileSync(new URL('../../dist/sw.js',import.meta.url),'utf8');
 const urls=JSON.parse(built.match(/self\.__TREINO_PRECACHE_URLS__ = (\[.*?\]);/)[1]);
 const assets=readdirSync(new URL('../../dist/assets/',import.meta.url)).filter(name=>/\.(js|css)$/.test(name));
 assert.ok(assets.some(name=>name.startsWith('HistoryPage-')));
 for(const name of assets)assert.ok(urls.includes(`/assets/${name}`),name);
 assert.ok(urls.includes('/'));
});
