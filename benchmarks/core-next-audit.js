'use strict';
/* eslint-env node, es6 */

const http = require('http'), WS = require('ws'), fs = require('fs');

const get = url => new Promise((r, j) => http.get(url, res => {
  let s = '';
  res.on('data', c => { s += c; });
  res.on('end', () => r(JSON.parse(s)));
}).on('error', j));

(async () => {
  const pages = await get('http://127.0.0.1:' + (process.env.CDP_PORT || 9229) + '/json');
  const page = pages.find(p => p.type === 'page');
  const ws = new WS(page.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  let n = 0, pending = new Map();
  ws.on('message', raw => {
    let m = JSON.parse(raw);
    if (m.id) {
      let q = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) q.reject(m.error);
      else q.resolve(m.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    let id = ++n;
    pending.set(id, {
      resolve: resolve,
      reject: reject
    });
    ws.send(JSON.stringify({
      id: id,
      method: method,
      params: params
    }));
  });
  await send('Network.enable');
  await send('Network.setCacheDisabled', {
    cacheDisabled: true
  });
  let output = [];
  for (let round = 0; round < 4; round++) for (let mode of round % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate']) {
    const url = (process.env.AUDIT_BASE_URL || 'http://127.0.0.1:8767/core-next/case.html') + '?' + mode;
    await send('Page.navigate', {
      url: url
    });
    let ready = false;
    for (let attempt = 0; attempt < 100 && !ready; attempt++) {
      await new Promise(r => setTimeout(r, 100));
      const state = await send('Runtime.evaluate', {
        expression: 'location.href === ' + JSON.stringify(url) +
          ' && document.readyState === "complete" && typeof window.run === "function"',
        returnByValue: true
      });
      ready = state.result.value === true;
    }
    if (!ready) throw new Error('Audit page did not finish loading');
    let response = await send('Runtime.evaluate', {
      expression: 'JSON.stringify(run())',
      returnByValue: true
    });
    if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails));
    let result = JSON.parse(response.result.value);
    result.mode = mode;
    result.round = round;
    output.push(result);
    console.log(mode, round, JSON.stringify(Object.fromEntries(Object.keys(result).filter(k => result[k] && result[k].medianMs !== undefined).map(k => [k, result[k].medianMs]))));
  }
  if (output.some(item => JSON.stringify(item.outputs) !== JSON.stringify(output[0].outputs))) throw Error('Different core audit outputs');
  fs.writeFileSync(process.env.AUDIT_OUTPUT || 'tmp/core-next-results.json', JSON.stringify(output, null, 2));
  ws.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
