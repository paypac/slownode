var assert = require('assert');
var _ = require('lodash');
var esprima = require('esprima');
var escodegen = require('escodegen');
var replacePseudoYieldCallsWithYieldExpressions = require('./astOperations/funcExpr/replacePseudoYieldCallsWithYieldExpressions');
var replacePseudoConstCallsWithConstDeclarations = require('./astOperations/funcExpr/replacePseudoConstCallsWithConstDeclarations');
var ensureNodesAreLegalForSteppableBody = require('./astOperations/funcExpr/ensureNodesAreLegalForSteppableBody');
var ensureIdentifiersAreLegalForSteppableBody = require('./astOperations/funcExpr/ensureIdentifiersAreLegalForSteppableBody');
var ensureAmbientIdentifiersAreNotMutated = require('./astOperations/funcExpr/ensureAmbientIdentifiersAreNotMutated');
var transformToStateMachine = require('./astOperations/funcExpr/transformToStateMachine');
var Steppable = require('./steppable');
// TODO: another valid 'local' identifier is the function's own name
// TODO: disallow id refs to: '__dirname', '__filename', 'module'
// TODO: require() and its argument need special handling...
// TODO: support yield*?
//---------------------------------------------
// TODO: doc all this in README...
// Rules for Steppable bodies:
// - ensure the assumption of a *single* scope for identifiers within the function body is strictly met:
//   - ensure function contains no closures (ie inner functions or lambdas)
//   - ensure exception identifier names in catch blocks are disjoint with all other identifier names in the function
//     - note: these ids are scoped only to the catch block. This check allows them to be treated like all other local vars
//   - ensure all variable declarations are 'var' (ie not 'let' or 'const' except as per below rules)
//
// - ensure the function is a pure function of it inputs:
//   - all identifiers referenced are either:
//     - parameters of the function
//     - locally declared variables or labels
//     - whitelisted globals and 'ambients' ('arguments', 'require', 'Infinity', 'parseInt', what else...?)
//     - locally declared 'const' identifiers whose rhs is considered 'safe and idempotent' (as in the HTTP-method sense)
//       - TODO: rules for 'safe and idempotent'...
// NB: no need to check for syntactic validity, since the function must be syntactically valid to have been passed in here.
// NB: either a normal function or generator function can be passed in - it makes no difference (doc why to do this (hint: yield keyword available in gens))
//---------------------------------------------
/** Constructs a SteppableFunction instance. May be called with or without 'new'. */
function SteppableFunction(steppableBody, options) {
    // Validate arguments.
    assert(typeof steppableBody === 'function');
    options = _.defaults({}, options, { yieldIdentifier: null, constIdentifier: null });
    // Transform original function --> source code --> AST.
    var originalFunction = steppableBody;
    var originalSource = '(' + originalFunction.toString() + ')';
    var originalAST = esprima.parse(originalSource);
    var exprStmt = originalAST.body[0];
    var funcExpr = exprStmt.expression;
    // Convert direct calls to options.yieldIdentifier to equivalent yield expressions.
    if (options.yieldIdentifier)
        replacePseudoYieldCallsWithYieldExpressions(funcExpr, options.yieldIdentifier);
    // Convert variable declarations whose 'init' is a direct call to options.constIdentifier to equivalent const declarations.
    if (options.constIdentifier)
        replacePseudoConstCallsWithConstDeclarations(funcExpr, options.constIdentifier);
    // Validate the AST.
    ensureNodesAreLegalForSteppableBody(funcExpr);
    ensureIdentifiersAreLegalForSteppableBody(funcExpr);
    ensureAmbientIdentifiersAreNotMutated(funcExpr);
    // Rewrite the AST in a form suitable for serialization/deserialization.
    var stateMachineAST = transformToStateMachine(funcExpr);
    // Transform modified AST --> source code --> function.
    var stateMachineSource = '(' + escodegen.generate(stateMachineAST) + ')';
    var stateMachine = eval(stateMachineSource);
    // Generate and return a SteppableFunction instance (ie a callable that returns a Steppable).
    assert(funcExpr.params.every(function (p) { return p.type === 'Identifier'; }));
    var paramNames = funcExpr.params.map(function (p) { return p['name']; });
    var result = makeSteppableFunction(stateMachine, paramNames);
    return result;
}
/** Constructs a SteppableFunction instance tailored to the given StateMachine function and parameter names. */
function makeSteppableFunction(stateMachine, paramNames) {
    // This is the generic constructor function. It closes over stateMachine.
    function SteppableFunction() {
        var steppable = new Steppable(stateMachine);
        steppable.state = { local: { arguments: Array.prototype.slice.call(arguments) } };
        return steppable;
    }
    // Customise the generic constructor function with the specified parameter names and a `stateMachine` property.
    var originalSource = SteppableFunction.toString();
    var sourceWithParamNames = originalSource.replace('SteppableFunction()', "SteppableFunction(" + paramNames.join(', ') + ")");
    var constructorFunction = eval('(' + sourceWithParamNames + ')');
    // Add the `stateMachine` property to the constructor function.
    constructorFunction.stateMachine = stateMachine;
    // Return the customised constructor function.
    return constructorFunction;
}
module.exports = SteppableFunction;
//# sourceMappingURL=steppableFunction.js.map