import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyInsights } from '../src/utils/weeklyInsights.js';
const now = new Date('2026-09-09T18:00:00');
const workout = date => ({timestamp:new Date(`${date}T12:00:00`).getTime(),volume:100});

test('an empty week reports unknown comparisons and nutrition, not invented trends',()=>{
 const w=buildWeeklyInsights({now});
 assert.equal(w.sessions,0); assert.equal(w.sessionDelta,null); assert.equal(w.volumeDeltaPercent,null);
 assert.equal(w.avgCalories,null); assert.equal(w.avgProtein,null); assert.equal(w.weightDelta,null);
 assert.equal(w.latestWeight,null); assert.equal(w.hasNutritionTargets,false);
});

test('a first workout does not imply that the previous week was tracked',()=>{
 assert.equal(buildWeeklyInsights({now,workouts:[workout('2026-09-08')]}).sessionDelta,null);
});

test('an empty week remains comparable when earlier workouts establish a history',()=>{
 assert.equal(buildWeeklyInsights({now,workouts:[workout('2026-09-01')]}).sessionDelta,-1);
 assert.equal(buildWeeklyInsights({now,workouts:[workout('2026-08-01'),workout('2026-09-08')]}).sessionDelta,1);
});

test('nutrition averages include only elapsed days with entries; no goals means no adherence claim',()=>{
 const w=buildWeeklyInsights({now,nutritionEntries:[{entry_date:'2026-09-07',calories:2000,protein_g:100},{entry_date:'2026-09-09',calories:2200,protein_g:120},{entry_date:'2026-09-11',calories:9000,protein_g:500}]});
 assert.equal(w.nutritionLoggedDays,2); assert.equal(w.avgCalories,2100); assert.equal(w.avgProtein,110); assert.equal(w.hasNutritionTargets,false);
});

test('two real weights create a trend; a future weight cannot become the latest measurement',()=>{
 const bodyEntries=[{entry_date:'2026-09-07',weight_kg:74},{entry_date:'2026-09-09',weight_kg:73.7},{entry_date:'2026-09-12',weight_kg:60}];
 const w=buildWeeklyInsights({now,bodyEntries}); assert.equal(w.latestWeight,73.7);assert.equal(w.weightDelta,-.3);
 assert.equal(buildWeeklyInsights({now,bodyEntries:bodyEntries.slice(0,1)}).weightDelta,null);
});

test('week boundaries use local Monday to Sunday across months and DST',()=>{
 const w=buildWeeklyInsights({now:new Date('2026-09-06T18:00:00'),workouts:[workout('2026-08-30'),workout('2026-08-31'),workout('2026-09-06'),workout('2026-09-07')]});
 assert.equal(w.sessions,2);assert.equal(w.days[0].key,'2026-08-31');assert.equal(w.days[6].key,'2026-09-06');
});
