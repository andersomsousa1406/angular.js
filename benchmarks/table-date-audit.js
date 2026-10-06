'use strict';
/* eslint-env node, es6 */
// The template embeds the browser-side compatibility matrix and timed loops.
/* eslint-disable max-len */
const http = require('http'), WS = require('../node_modules/ws'), fs = require('fs');
const get = url => new Promise((resolve, reject) => http.get(url, res => { let data = ''; res.on('data', c => { data += c; }); res.on('end', () => resolve(JSON.parse(data))); }).on('error', reject));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const pages = await get('http://127.0.0.1:9229/json');
  const ws = new WS(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.on('open', resolve));
  let seq = 0; const pending = new Map();
  ws.on('message', raw => {
    const m = JSON.parse(raw);
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) p.reject(m.error);
      else p.resolve(m.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, {resolve, reject}); ws.send(JSON.stringify({id, method, params})); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true}); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const ready = async mode => {
    const url = 'http://127.0.0.1:8767/case.html?version=' + mode + '&revision=three-versions-96e85519f';
    await send('Page.navigate', {url});
    for (let i = 0; i < 200; i++) { await delay(100); if (await evaluate('location.href === ' + JSON.stringify(url) + ' && !!(window.labReady && window.runBenchmark)')) return; }
    throw Error('Lab did not load: ' + mode + ': ' + await evaluate('JSON.stringify(window.labErrors)'));
  };
  await send('Network.enable'); await send('Network.setCacheDisabled', {cacheDisabled: true});

  await ready('new');
  const result = await evaluate(`(async()=>{
    const source=await(await fetch('backups/TabelaJS-before-date-optimization.js')).text();
    const start=source.indexOf('function(valor,campo,item)'), end=source.indexOf('COLUNAS_REC:',start);
    const original=window.eval('('+source.slice(start,end).trim().replace(/,$/,'')+')');
    const table=labVM.table,candidate=table.format;
    const values=['2026-10-06','2026-10-06 12:34:56','2026-10-06\\n','06-10-2026','2026-1-2','2026-99-99','abcd-ef-gh','2026.10.06','a-b-c-d','2026-10-06-extra',null,undefined,'',0,false,new String('2026-10-06')];
    const columns=[{TIPO:'date'},{TIPO:'timestamp'},{TIPO:'text'},{TIPO:'date',PREFIXO:'#prefix#',SUFIXO:'#suffix#'},{TIPO:'date',PREFIXO:'R$',SUFIXO:'kg',INPUT:1}];
    let checks=0;for(const value of values)for(const column of columns){const item={prefix:'data',suffix:'fim'};const before=original.call(table,value,column,item),after=candidate.call(table,value,column,item);if(before!==after)throw Error('format mismatch: '+String(value)+' '+JSON.stringify(column));checks++;}
    const rows=[];
    const cases={date:{TIPO:'date'},timestamp:{TIPO:'timestamp'},fallback:{TIPO:'date'},text:{TIPO:'text'}};
    for(let round=0;round<4;round++)for(const variant of(round%2?['after','before']:['before','after'])){
      const fn=variant==='before'?original:candidate;
      const timings={};
      for(const name of Object.keys(cases)){
        const value=name==='timestamp'?'2026-10-06 12:34:56':name==='fallback'?'06-10-2026':name==='text'?'nome':'2026-10-06';
        for(let i=0;i<50000;i++)fn.call(table,value,cases[name],{});
        const samples=[];for(let sample=0;sample<15;sample++){const start=performance.now();for(let i=0;i<100000;i++)fn.call(table,value,cases[name],{});samples.push(performance.now()-start);}
        samples.sort((a,b)=>a-b);timings[name]={median:samples[7],samples};
      }
      rows.push({round,variant,timings});
    }
    return {formatChecks:checks,formatPassed:true,rows};
  })()`);
  fs.writeFileSync('integration-lab/table-date-performance.json',JSON.stringify(result,null,2)); console.log(JSON.stringify(result));
  await send('Page.navigate',{url:'http://127.0.0.1:8767/index.html'}); ws.close();
})().catch(e=>{console.error(e); process.exit(1);});
