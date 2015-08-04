var EventLoop = require("./index");
var funcStore = require("../store/slowFunction");
var deserialise = require("../slowFunction/deserialise");
var SlowNode = require("../index");
var funcCache = [];
function callFunc(funcCall) {
    var startTime = Date.now();
    if (!funcCall) {
        SlowNode.flushCallback = setTimeout(function () { return EventLoop.flush(); }, SlowNode.configuration.pollIntervalMs);
        return Promise.resolve(true);
    }
    // TODO: Fail/retry logic
    return getSlowFunc(funcCall.funcId)
        .then(function (func) { return createCall(func, funcCall); })
        .then(function () { return EventLoop.remove(funcCall.id); })
        .then(function () { return EventLoop.flush(); });
}
function getSlowFunc(funcId) {
    var cachedFunc = funcCache[funcId];
    if (cachedFunc)
        return Promise.resolve(cachedFunc);
    return funcStore.get(funcId)
        .then(cacheFunc);
}
function cacheFunc(rawFunc) {
    var deserialisedFunc = deserialise(rawFunc);
    funcCache[rawFunc.id] = deserialisedFunc;
    return Promise.resolve(deserialisedFunc);
}
function createCall(slowFunc, call) {
    var args = JSON.parse(call.arguments);
    var result = storedFuncWrapper.call({}, slowFunc, args);
    return Promise.resolve(result);
}
function storedFuncWrapper(func, args) {
    var deps = func.options.dependencies
        .map(function (dep) { return "this." + dep.as + " = require(\'" + dep.reference + "\')"; })
        .join("; ");
    eval(deps);
    return func.body.call(this, args);
}
module.exports = callFunc;
//# sourceMappingURL=exec.js.map