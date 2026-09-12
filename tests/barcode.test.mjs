import test from 'node:test';
import assert from 'node:assert/strict';
import { BarcodeConsensus, expandUpcE, isValidDetectedBarcode } from '../src/utils/barcodeValidation.js';
const ean = {rawValue:'4006381333931',format:'ean_13'};
const upc = {rawValue:'036000291452',format:'upc_a'};

test('valid EAN-13, EAN-8, UPC-A and UPC-E; rejects partial, malformed and wrong checksum codes', () => {
  for (const [code,format] of [['4006381333931','ean_13'],['96385074','ean_8'],['036000291452','upc_a'],['04252614','upc_e']]) assert.ok(isValidDetectedBarcode(code,format),format);
  assert.equal(expandUpcE('04252614'),'042100005264');
  for(const [code,format] of [['400638133393','ean_13'],['4006381333932','ean_13'],['abc4006381333931','ean_13'],['96385074','upc_a'],['24252614','upc_e'],['4006381333931','qr_code']]) assert.equal(isValidDetectedBarcode(code,format),false,`${code}/${format}`);
});

test('the same consensus rule accepts the third reading from either detector', () => {
  for(const source of ['native','quagga']) {
    const scanner=new BarcodeConsensus();
    const result=source==='native'?ean:{...ean,format:null};
    assert.equal(scanner.accept([result],0),null);
    assert.equal(scanner.accept([result],240),null);
    assert.equal(scanner.accept([result],480),ean.rawValue);
  }
});

test('duplicate detections in one frame cannot satisfy consensus', () => {
  const scanner=new BarcodeConsensus();
  assert.equal(scanner.accept([ean,ean,ean],0),null);
  assert.equal(scanner.accept([ean],0),null);
  assert.equal(scanner.accept([ean],240),null);
  assert.equal(scanner.accept([ean],480),ean.rawValue);
});

test('expired, different or invalid readings cannot produce a false confirmation', () => {
  const scanner=new BarcodeConsensus();
  scanner.accept([ean],0);
  scanner.accept([ean],240);
  assert.equal(scanner.accept([ean],1800),null);
  assert.equal(scanner.accept([upc],2040),null);
  assert.equal(scanner.accept([{...ean,rawValue:'4006381333932'}],2280),null);
  assert.equal(scanner.accept([ean],2520),null);
  assert.equal(scanner.accept([ean],2760),ean.rawValue);
  assert.equal(scanner.accept([ean],3000),null);
});

test('UPC-E expansion covers each GS1 compression branch', () => {
  assert.equal(expandUpcE('01234500'),'012000003450');
  assert.equal(expandUpcE('01234530'),'012300000450');
  assert.equal(expandUpcE('01234540'),'012340000050');
  assert.equal(expandUpcE('01234560'),'012345000060');
});
