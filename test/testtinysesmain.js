// Options: --free-variable-checker --require --validate

import {def} from '../lib/sesshim.js';
import {tinyses} from './tinyses/tinyses.js';
import {desugar, scope, interp} from './tinyses/interp.js';

export const {} = (function () {
  console.log('----------');
  let ast = tinyses`22.toString(ii);`;
  console.log(JSON.stringify(ast));

  ast = desugar(ast);
  console.log(JSON.stringify(ast));

  ast = scope(ast);
  console.log(JSON.stringify(ast));

  const val = interp(ast, {ii: 3});
  console.log(val);

  return def({});
})();
