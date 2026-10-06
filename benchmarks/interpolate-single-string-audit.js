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
    await send('Page.navigate', {
      url: (process.env.AUDIT_BASE_URL || 'http://127.0.0.1:8767/core-speed/case.html') + '?' + mode
    });
    await new Promise(r => setTimeout(r, 300));
    let response = await send('Runtime.evaluate', {
      expression: 'JSON.stringify(run())',
      returnByValue: true
    });
    if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails));
    let result = JSON.parse(response.result.value);
    result.mode = mode;
    result.round = round;
    output.push(result);
    console.log(mode, round, result.singleString.medianMs, result.dirtyDigest.medianMs);
  }
  if (output.some(item => JSON.stringify(item.outputs) !== JSON.stringify(output[0].outputs))) throw Error('Different interpolation outputs');
  fs.writeFileSync(process.env.AUDIT_OUTPUT || 'tmp/interpolate-single-string-results.json', JSON.stringify(output, null, 2));
  ws.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
