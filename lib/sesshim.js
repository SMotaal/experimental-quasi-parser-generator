// Options: --free-variable-checker --require --validate

/**
 * By requiring sesshim.js, if you are not already in a SES
 * environment, you obtain a trivial polyfil of a small bit of SES's
 * API with none of its security. At the moment, you get only
 * <tt>def</tt> and <tt>confine</tt>, but with little of their
 * functionality. More API and more functionality will be provided on
 * an as-needed basis by my current uses, though I will try not to
 * break old clients that were compatible with both SES and
 * sesshim.js.
 *
 * <p>Currently, even if you are already in a SES environment,
 * sesshim.js will ignore that and do the same thing. Once actual SES
 * works on node/iojs/ES6, sesshim.js should test if it is in such an
 * environment, and re-export SES's versions of the APIs that
 * sesshim.js does provide, or wrappings that adapt them to ES6.
 */
export const {def, confine} = (function () {
  /**
   * The faux version of SES's <tt>def</tt> is currently just a
   * synonym for Object.freeze.
   */
  const def = Object.freeze;

  /**
   * The faux version of SES's <tt>confine</tt> evals an
   * expression in an environment consisting of the global environment
   * as enhanced and shadowed by the own properties of the
   * <tt>env</tt> object. Unlike real <tt>confine</tt>, <ul>
   * <li>The faux <tt>confine</tt> does not have a third
   *     <tt>opt_options</tt> parameter. An options argument can of
   *     course be provided by the caller, but it will be ignored.
   * <li>The expression can be in the subset of ES6 supported by
   *     Babel.
   * <li>All dangerous globals that are not shadowed, such as "window"
   *     or "document", are still accessible by the evaled expression.
   * <li>The current binding of these properties at the time that
   *     <tt>confine</tt> is called are used as the initial
   *     bindings. Further changes to either the properties or the
   *     bindings are not tracked by the other.
   * <li>In the evaled expression, <tt>this</tt> is bound to
   *     <tt>undefined</tt>.
   * </ul>
   * When sesshim.js is enhanced to use SES if present, this confine
   * should wrap SES's confine rather than export it directly, in
   * order to continue to support ES6 expressions.
   */
  function confine(exprSrc, env) {
    exprSrc = '' + exprSrc;
    const names = Object.getOwnPropertyNames(env);
    // Note: no newline prior to ${exprSrc}, so that line numbers for
    // errors within exprSrc are accurate. Column numbers on the first
    // line won't be, but will on following lines.
    let closedFuncSrc = `(function(${names.join(',')}) { "use strict"; return (${exprSrc});
})
//# sourceURL=data:${encodeURIComponent(exprSrc)}
`;
    const closedFunc = (1, eval)(closedFuncSrc);
    return closedFunc(...names.map(n => env[n]));
  }

  return def({
    def,
    confine,
  });
})();
