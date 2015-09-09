var storage = require('../storage/storage');
/**
 * Returns a new SlowPromiseRejectFunction instance.
 * This function may be used to reject the given promise with a reason.
 */
function create(promise, persist) {
    // Create a function that rejects the given promise with the given reason.
    var reject = (function (reason) {
        // As per spec, do nothing if promise's fate is already resolved.
        if (promise._slow.isFateResolved)
            return;
        // Indicate the promise's fate is now resolved.
        promise._slow.isFateResolved = true;
        // Synchronise with the persistent object graph.
        storage.updated(promise);
        // Finally, reject the promise using its own private _reject method.
        promise._reject(reason);
    });
    // Add slow metadata to the reject function.
    reject._slow = { type: 12 /* SlowPromiseRejectFunction */, promise: promise };
    // Synchronise with the persistent object graph.
    // TODO: refactor this getting rid of conditional 'persist'
    if (persist)
        storage.created(reject);
    // Return the reject function.
    return reject;
}
exports.create = create;
//// TODO: register slow object type with storage (for rehydration logic)
//storage.registerType({
//    type: SlowType.SlowPromiseRejectFunction,
//    dehydrate: (p: types.SlowPromise.RejectFunction, recurse: (obj) => any) => {
//        if (!p || !p._slow || p._slow.type !== SlowType.SlowPromiseRejectFunction) return;
//        var jsonSafeObject = _.mapValues(p._slow, propValue => recurse(propValue));
//        return jsonSafeObject;
//    },
//    rehydrate: jsonSafeObject => {
//        return create(jsonSafeObject.promise, false);
//    }
//});
//# sourceMappingURL=rejectFunction.js.map