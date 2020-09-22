// Options: --free-variable-checker --require --validate

import {def} from './sesshim.js';

export const {indent} = (function () {
  function indent(template, ...substs) {
    const result = [];
    let newnewline = '\n';
    for (let i = 0, ilen = substs.length; i < ilen; i++) {
      let segment = template[i];
      if (i == 0 && segment.startsWith('\n')) {
        segment = segment.substr(1);
      }
      const lastnl = segment.lastIndexOf('\n');
      if (lastnl >= 0) {
        newnewline = `\n${' '.repeat(segment.length - lastnl - 1)}`;
      }
      result.push(segment);
      const subst = String(substs[i]).replace(/\n/g, newnewline);
      result.push(subst);
    }
    result.push(template[substs.length]);
    return result.join('');
  }

  return def({indent});
})();
