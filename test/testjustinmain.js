// Options: --free-variable-checker --require --validate

import {def} from '../lib/sesshim.js';
import {justin} from './jessie/quasi-justin.js';
import {interpJustin} from './jessie/interp-justin.js';

export const {} = (function () {
  console.log('----------');
  let ast = justin`[{"a": 5, ...ra}, x.f + y[+i], ...r]`;
  console.log(JSON.stringify(ast));

  const val = interpJustin(ast, {
    x: {f: 6},
    y: [8, 7],
    i: 1,
    ra: {q: 'c', r: 'd'},
    r: ['a', 'b'],
  });
  console.log(JSON.stringify(val));

  return def({});
})();
