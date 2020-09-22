// Options: --free-variable-checker --require --validate

import {def} from '../lib/sesshim.js';
import {json} from './jessie/quasi-json.js';
import {justin} from './jessie/quasi-justin.js';
import {jessie} from './jessie/quasi-jessie.js';
import {desugar, scope, interp} from './tinyses/interp.js';

export const {} = (function () {
  console.log('----------');
  let ast = jessie`22.toString(ii);`;
  console.log(JSON.stringify(ast));

  ast = desugar(ast);
  console.log(JSON.stringify(ast));

  ast = scope(ast);
  console.log(JSON.stringify(ast));

  const val = interp(ast, {ii: 3});
  console.log(val);

  return def({});
})();
