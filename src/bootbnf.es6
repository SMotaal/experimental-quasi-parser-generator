const to5 = require('babel');
const sc = require('./scanner.es6');

module.exports = (function(){
  "use strict";

  // TODO: Should test if in SES, and use SES's def if so.
  const def = Object.freeze;

  // TODO: Should test if in SES, and use SES's confine if so.
  function confine(expr, env) {
    const names = Object.getOwnPropertyNames(env);
    let closedFuncSrc =
`(function(${names.join(',')}) {
  "use strict";
  return ${expr};
})`
    closedFuncSrc = to5.transform(closedFuncSrc).code;
    const closedFunc = (1,eval)(closedFuncSrc);
    return closedFunc(...names.map(n => env[n]));
  }

  function simple(prefix, list) {
    if (list.length === 0) { return ['empty']; }
    if (list.length === 1) { return list[0]; }
    return [prefix, ...list];
  }

  function indent(str, newnewline) {
    return str.replace(/\n/g, newnewline);
  }

  function compile(sexp) {
    let numSubs = 0;
    const tokenTypes = new Set();

    // generated names
    // act_${i}      action parameter
    // rule_${name}  function from bnf rule
    // seq_${i}      sequence failure label
    // or_${i}       choice success label
    // pos_${i}      backtrack token index
    // s_${i}        accumulated list of values
    // v_${i}        set to s_${i} on fall thru path

    let alphaCount = 0;
    const vars = ['let value = FAIL'];
    function nextVar(prefix) {
      const result = `${prefix}_${alphaCount++}`;
      vars.push(result);
      return result;
    }
    function takeVarsSrc() {
      const result = `${vars.join(', ')};`;
      vars.length = 1;
      return result;
    }
    function nextLabel(prefix) {
      return `${prefix}_${alphaCount++}`;
    }


    function peval(sexp) {
      const vtable = Object.freeze({
        bnf(...rules) {
          // The following line also initializes tokenTypes and numSubs
          const rulesSrc = rules.map(peval).join('\n');

          const paramSrcs = [];
          for (let i = 0; i < numSubs; i++) {
            paramSrcs.push(`act_${i}`)
          }
          const tokenTypeListSrc =
                `[${[...tokenTypes].map(tt => JSON.stringify(tt)).join(', ')}]`;
          return (
`(function(${paramSrcs.join(', ')}) {
  return BaseParser => class extends BaseParser {
    constructor(template, tokenTypeList=[]) {
      super(template, ${tokenTypeListSrc}.concat(tokenTypeList));
    }
    start() {
      return this.rule_${rules[0][1]}(0)[1];
    }
    ${indent(rulesSrc,`
    `)}
  }
})
`);
        },
        def(name, body) {
          // The following line also initializes vars
          const bodySrc = peval(body);
          return (
`rule_${name}(pos) {
  ${takeVarsSrc()}
  ${indent(bodySrc,`
  `)}
  return [pos, value];
}`);
        },
        empty() {
          return `value = [];`;
        },
        fail() {
          return `value = FAIL;`;
        },
        or(...choices) {
          const labelSrc = nextLabel('or');
          const choicesSrc = choices.map(peval).map(cSrc =>
`${cSrc}
if (value !== FAIL) break ${labelSrc};`).join('\n');

        return (
`${labelSrc}: {
  ${indent(choicesSrc,`
  `)}
}`);
        },
        seq(...terms) {
          const posSrc = nextVar('pos');
          const labelSrc = nextLabel('seq');
          const sSrc = nextVar('s');
          const vSrc = nextVar('v');
          const termsSrc = terms.map(peval).map(termSrc =>
`${termSrc}
if (value === FAIL) break ${labelSrc};
${sSrc}.push(value);`).join('\n');

          return (
`${sSrc} = [];
${vSrc} = FAIL;
${posSrc} = pos;
${labelSrc}: {
  ${indent(termsSrc,`
  `)}
  ${vSrc} = ${sSrc};
}
if ((value = ${vSrc}) === FAIL) pos = ${posSrc};`);
        },
        act(terms, hole) {
          numSubs = Math.max(numSubs, hole + 1);
          const termsSrc = vtable.seq(...terms);
          return (
`${termsSrc}
if (value !== FAIL) value = act_${hole}(...value);`);
        },
        '**'(patt, sep) {
          const posSrc = nextVar('pos');
          const sSrc = nextVar('s');
          const pattSrc = peval(patt);
          const sepSrc = peval(sep);
          return (
// after first iteration, backtrack to before the separator
`${sSrc} = [];
${posSrc} = pos;
while (true) {
  ${indent(pattSrc,`
  `)}
  if (value === FAIL) {
    pos = ${posSrc};
    break;
  }
  ${sSrc}.push(value);
  ${posSrc} = pos;
  ${indent(sepSrc,`
  `)}
  if (value === FAIL) break;
}
value = ${sSrc};`);
        },
        '++'(patt, sep) {
          const starSrc = vtable['**'](patt, sep);
          return (
`${starSrc}
if (value.length === 0) value = FAIL;`);
        },
        '?'(patt) {
          return vtable['**'](patt, ['fail']);
        },
        '*'(patt) {
          return vtable['**'](patt, ['empty']);
        },
        '+'(patt) {
          return vtable['++'](patt, ['empty']);
        },
        'super'(ident) {
          return `[pos, value] = super.rule_${ident}(pos);`;
        }
      });

      if (typeof sexp === 'string') {
        if (sc.allRE(sc.STRING_RE).test(sexp)) {
          tokenTypes.add(sexp);
          return `[pos, value] = this.eat(pos, ${sexp});`;
        }
        if (sc.allRE(sc.IDENT_RE).test(sexp)) {
          // Assume a standalone identifier is a rule name.
          return `[pos, value] = this.rule_${sexp}(pos);`;
        }
        throw new Error('unexpected: ' + sexp);
      }
      return vtable[sexp[0]](...sexp.slice(1));
    }

    return peval(sexp);
  }


  function quasiMemo(quasiCurry) {
    const wm = new WeakMap();
    return function(template, ...subs) {
      let quasiRest = wm.get(template);
      if (!quasiRest) {
        quasiRest = quasiCurry(template);
        wm.set(template, quasiRest);
      }
      if (typeof quasiRest !== 'function') {
        console.log(`
-------template--------
${JSON.stringify(template, void 0, ' ')}
-------`);
        throw new Error(`${typeof quasiRest}: ${quasiRest}`);
      }
      return quasiRest(...subs);
    }
  }

  function quasifyParser(Parser) {
    function baseCurry(template) {
      const parser = new Parser(template);
      return parser.start();
    }
    const quasiParser = quasiMemo(baseCurry);
    quasiParser.Parser = Parser;
    return quasiParser;
  }

  const defaultQuasiParser = quasifyParser(sc.Scanner);

  function metaCompile(baseRules, _=void 0) {
    const baseAST = ['bnf', ...baseRules];
    const parserTraitMakerSrc = compile(baseAST);
//console.log('\n\n' + parserTraitMakerSrc + '\n\n');
    const makeParserTrait = confine(parserTraitMakerSrc, {
      Scanner: sc.Scanner,
      FAIL: sc.FAIL
    });
    return function(...baseActions) {
      const parserTrait = makeParserTrait(...baseActions);
      function _asExtending(baseQuasiParser) {
        const Parser = parserTrait(baseQuasiParser.Parser);
        return quasifyParser(Parser);
      }
      const quasiParser = _asExtending(defaultQuasiParser);
      quasiParser._asExtending = _asExtending;
      function _extends(baseQuasiParser) {
        return (template, ...subs) => 
          quasiParser(template, ...subs)._asExtending(baseQuasiParser);
      }
      quasiParser.extends = _extends;
      return quasiParser;
    };
  }


  function doBnf(bnfParam) {
    return bnfParam`
      bnf ::= rule+ EOF              ${metaCompile};
      rule ::= IDENT "::=" body ";"  ${(name,_,body,_2) => ['def', name, body]};
      body ::= choice ** "|"         ${list => simple('or', list)};
      choice ::=
        seq HOLE                     ${(list,hole) => ['act', list, hole]}
      | seq                          ${list => simple('seq', list)};
      seq ::= term*;
      term ::=
        prim ("**" | "++") prim      ${(patt,q,sep) => [q, patt, sep]}
      | prim ("?" | "*" | "+")       ${(patt,q) => [q, patt]}
      | prim;
      prim ::=
        "super" "." IDENT            ${(sup,_2,id) => [sup, id]}
      | IDENT | STRING
      | "(" body ")"                 ${(_,b,_2) => b};
    `;
  }

  const bnfRules = [
   ['def','bnf',['act',[['+','rule'],'EOF'], 0]],
   ['def','rule',['act',['IDENT','"::="','body','";"'], 1]],
   ['def','body',['act',[['**','choice','"|"']], 2]],
   ['def','choice',['or',['act',['seq','HOLE'], 3],
                    ['act',['seq'], 4]]],
   ['def','seq',['*','term']],
   ['def','term',['or',['act',['prim',['or','"**"','"++"'],'prim'], 5],
                  ['act',['prim',['or','"?"','"*"','"+"']], 6],
                  'prim']],
   ['def','prim',['or',['act',['"super"','"."','IDENT'], 7],
                  'IDENT','STRING',
                  ['act',['"("','body','")"'], 8]]]];

  const bnfActions = doBnf((_, ...actions) => actions);

  const bnf = metaCompile(bnfRules)(...bnfActions);
  bnf.doBnf = doBnf;
  bnf.quasifyParser = quasifyParser;

  return def(bnf);
}());
