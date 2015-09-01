import assert = require('assert');
import _ = require('lodash');
import types = require('types');
import SlowType = types.SlowObject.Type;
import storage = require('../storage/storage');


/**
 * Returns a new SlowPromiseRejectFunction instance.
 * This function may be used to reject the given promise with a reason.
 */
export function create(promise: types.SlowPromise, persist = true) {

    // Create a function that rejects the given promise with the given reason.
    var reject: types.SlowPromise.RejectFunction = <any> ((reason?: any) => {

        // As per spec, do nothing if promise's fate is already resolved.
        if (promise._slow.isFateResolved) return;

        // Indicate the promise's fate is now resolved, and persist this change to the promise's state
        promise._slow.isFateResolved = true;
        storage.track(promise);

        // Finally, reject the promise using its own private _reject method.
        promise._reject(reason);
    });

    // Add slow metadata to the reject function, and persist it.
    reject._slow = { type: SlowType.SlowPromiseRejectFunction, promise };
    if (persist) storage.track(reject);

    // Return the reject function.
    return reject;
}


// TODO: register slow object type with storage (for rehydration logic)
storage.registerType({
    type: SlowType.SlowPromiseRejectFunction,
    dehydrate: (p: types.SlowPromise.RejectFunction, recurse: (obj) => any) => {
        if (!p || !p._slow || p._slow.type !== SlowType.SlowPromiseRejectFunction) return;
        var jsonSafeObject = _.mapValues(p._slow, propValue => recurse(propValue));
        return jsonSafeObject;
    },
    rehydrate: jsonSafeObject => {
        return create(jsonSafeObject.promise, false);
    }
});