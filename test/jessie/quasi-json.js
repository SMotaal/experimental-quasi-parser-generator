// Options: --free-variable-checker --require --validate

// Subsets of JavaScript, starting from the grammar as defined at
// http://www.ecma-international.org/ecma-262/9.0/#sec-grammar-summary

// Defined to be extended into the Jessie grammar.
// See https://github.com/Agoric/Jessie/blob/master/README.md
// for documentation of the Jessie grammar.

import {def} from '../../lib/sesshim.js';
import {bnf} from '../../lib/bootbnf.js';

export const {json} = (function () {
  const json = bnf`
    # to be overridden or inherited
    start ::= assignExpr EOF                               ${(v, _) => (..._) => v};

    # to be extended
    primaryExpr ::=
      dataLiteral                                          ${n => ['data', JSON.parse(n)]}
    / array
    / record
    / HOLE                                                 ${h => ['exprHole', h]};

    dataLiteral ::=  "null" / "false" / "true" / NUMBER / STRING;

    array ::= "[" element ** "," "]"                       ${(_, es, _2) => ['array', es]};

    # to be extended
    element ::= assignExpr;

    # The JavaScript and JSON grammars calls records "objects"
    record ::= "{" propDef ** "," "}"                      ${(_, ps, _2) => ['record', ps]};

    # to be extended
    propDef ::= propName ":" assignExpr                    ${(k, _, e) => ['prop', k, e]};

    # to be extended
    propName ::= STRING                                    ${str => ['data', JSON.parse(str)]};

    # to be overridden
    assignExpr ::= primaryExpr;
  `;

  return def({json});
})();
