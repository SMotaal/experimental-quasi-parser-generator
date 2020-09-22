// Options: --free-variable-checker --require --validate

import {def} from '../lib/sesshim.js';
import {json} from './jessie/quasi-json.js';
import {interpJSON} from './jessie/interp-json.js';

export const {} = (function () {
  console.log('----------');
  let ast = json`[{"a": 5}, 88]`;
  console.log(JSON.stringify(ast));

  const val = interpJSON(ast);
  console.log(JSON.stringify(val));

  return def({});
})();
