﻿import assert = require('assert');
import API = require('../index.d.ts'); // NB: elided ref (for types only)
import SlowKind = require('../slowKind');
import persistence = require('../persistence');
import slowEventLoop = require('../eventLoop/slowEventLoop');
import slowTimers = require('../eventLoop/slowTimers');
import SlowPromise = require('../promises/slowPromise');
import SlowClosure = require('../functions/slowClosure');
import SlowAsyncFunction = require('../functions/slowAsyncFunction');


// TODO: ...
export function run(epochId: string, slowMain: Function, ...args: any[]): Epoch {

    // TODO: fully review!!!

    var epoch = createEpoch(epochId);
    epoch.setTimeout(slowMain, 0, ...args);


    // TODO: temp testing...
    //var epochId = 'DEFAULT';
    return epoch;
}


// TODO: ...
export function weakRef(obj: any) {
    persistence.weakRef(obj);
}


// TODO: ...
export function on(eventId: string, handler: Function) {
    assert(eventId === 'end');
    slowEventLoop.addExitHandler(handler);
}





export interface Epoch extends API.Epoch {

    // TODO: doc... INTERNAL
    id: string; // TODO: get rid of this
}


// TODO: temp testing...
function createEpoch(epochId: string): Epoch {


    var epoch = <Epoch> {
        setTimeout: null,
        clearTimeout: slowTimers.clearTimeout,
        Promise: SlowPromise.forEpoch(epochId),
        closure: SlowClosure.forEpoch(epochId),
        async: null,
        id: epochId
    };
    epoch.setTimeout = slowTimers.setTimeout.forEpoch(epochId, epoch);
    epoch.async = createAsyncFunctionForEpoch(epoch);
    return epoch;
}


// TODO: temp testing...
function createAsyncFunctionForEpoch(epoch: Epoch) {
    var async = SlowAsyncFunction.forEpoch(epoch.id);
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
