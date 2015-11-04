﻿import assert = require('assert');
import EpochLog = require('./epochLog');
import slowEventLoop = require('./eventLoop/slowEventLoop');
import slowTimers = require('./eventLoop/slowTimers');
import SlowPromise = require('./promises/slowPromise');
import SlowClosure = require('./closures/slowClosure');
import SlowAsyncFunction = require('./asyncFunctions/slowAsyncFunction');
export = Epoch;


class Epoch {

    // TODO: take a filename
    constructor() {


        // TODO: need orderly attach/detach in pairs. This will never be detached!! And will keep ref to epoch/log alive!
        slowEventLoop.beforeNextTick.attach(() => {
            this.log.flush();
            return Promise.resolve<void>();
        });
    }

    // TODO: explicit disposal...

    // TODO: temp testing...
    log = new EpochLog();

    // TODO: temp testing...
    setTimeout = slowTimers.setTimeout.forEpoch(this.log);

    // TODO: temp testing...
    clearTimeout = slowTimers.clearTimeout;

    // TODO: temp testing...
    Promise = SlowPromise.forEpoch(this.log);

    // TODO: temp testing...
    closure = SlowClosure.forEpoch(this.log);

    // TODO: temp testing...
    async = makeAsyncFunctionForEpoch(this);
}


// TODO: temp testing...
function makeAsyncFunctionForEpoch(epoch: Epoch) {
    var async = SlowAsyncFunction.forEpoch(epoch.log);
    var options = { require };
    var result = (bodyFunc: Function) => async(bodyFunc, options);
    return result;

    function require(moduleId: string) {
        if (moduleId === 'epoch') return epoch;
        return mainRequire(moduleId);
    }
}


// TODO: temp testing...
var mainRequire = require.main.require;
