import assert = require('assert');
import _ = require('lodash');
import SlowKind = require('../slowKind');
import SlowLog = require('../slowLog');
import SlowPromiseResolve = require('./slowPromiseResolve');
import SlowPromiseReject = require('./slowPromiseReject');
import standardResolutionProcedure = require('./standardResolutionProcedure');
import slowEventLoop = require('../eventLoop/slowEventLoop');
import storage = require('../storage/storage');
export = SlowPromise;


// TODO: add all(), race()... (see https://github.com/borisyankov/DefinitelyTyped/blob/master/es6-promise/es6-promise.d.ts)


/**
 * Promises A+ compliant slow promise implementation.
 */
class SlowPromise {

    /**
     * Constructs a SlowPromise instance.
     */
    constructor(resolver: (resolve: SlowPromiseResolve, reject: SlowPromiseReject) => void) {

        // Validate arguments.
        assert(!resolver || _.isFunction(resolver));

        // Synchronise with the persistent object graph.
        storage.created(this);

        // If no resolver was given, just return now. This is an internal use of the constructor.
        if (!resolver) return this;

        // Construct resolve and reject functions to be passed to the resolver.
        var resolve = new SlowPromiseResolve(this);
        var reject = new SlowPromiseReject(this);

        // Call the given resolver. This kicks off the asynchronous operation whose outcome the Promise represents.
        try { resolver(resolve, reject); } catch (ex) { reject(ex); }
    }

    /**
     * Returns a new SlowPromise instance that is already resolved with the given value.
     */
    static resolved(value?: any) {
        var CtorFunc = <typeof SlowPromise> this;
        var promise = new CtorFunc(null);
        var resolve = new SlowPromiseResolve(promise);
        resolve(value);
        return promise;
    };

    /**
     * Returns a new SlowPromise instance that is already rejected with the given reason.
     */
    static rejected(reason: any) {
        var CtorFunc = <typeof SlowPromise> this;
        var promise = new CtorFunc(null);
        var reject = new SlowPromiseReject(promise);
        reject(reason);
        return promise;
    };

    /**
     * Returns an object containing a new SlowPromise instance, along with a resolve function and a reject function to control its fate.
     */
    static deferred() {
        var CtorFunc = <typeof SlowPromise> this;
        var promise = new CtorFunc(null);
        var resolve = new SlowPromiseResolve(promise);
        var reject = new SlowPromiseReject(promise);
        return { promise, resolve, reject };
    };

    /**
     * Returns a new SlowPromise instance that resolves after `ms` milliseconds.
     */
    static delay(ms: number) {
        var CtorFunc = <typeof SlowPromise> this;
        return new CtorFunc(resolve => {
            slowEventLoop.setTimeout(resolve => resolve(), ms, resolve); // TODO: need log-bound slowEventLoop
        });
    };


    /**
     * INTERNAL the SlowLog used by all instances created by this constructor.
     */
    static $slowLog = SlowLog.none;

	/**
     * onFulfilled is called when the promise resolves. onRejected is called when the promise rejects.
     * Both callbacks have a single parameter , the fulfillment value or rejection reason.
     * "then" returns a new promise equivalent to the value you return from onFulfilled/onRejected after being passed through Promise.resolve.
     * If an error is thrown in the callback, the returned promise rejects with that error.
     * @param onFulfilled called when/if "promise" resolves
     * @param onRejected called when/if "promise" rejects
     */
    then(onFulfilled?: (value) => any, onRejected?: (error) => any) {
        var ctorFunc: typeof SlowPromise = <any> this.constructor;

        // Create the new promise to be returned by this .then() call.
        var deferred2 = ctorFunc.deferred();
        this.$slow.handlers.push({ onFulfilled, onRejected, deferred2 });

        // Synchronise with the persistent object graph.
        storage.updated(this);

        // If the promise is already settled, invoke the given handlers now (asynchronously).
        if (this.$slow.state !== State.Pending) process.nextTick(() => processAllHandlers(this));

        // Return the chained promise.
        return deferred2.promise;
    }

    /**
     * Sugar for promise.then(undefined, onRejected)
     * @param onRejected called when/if "promise" rejects
     */
    catch(onRejected?: (error) => any) {
        return this.then(void 0, onRejected);
    }

    /**
     * INTERNAL holds the full state of the instance in serializable form. An equivalent instance may be 'rehydrated' from this data. 
     */
    $slow = {
        kind: SlowKind.Promise,
        isFateResolved: false,
        state: State.Pending,
        settledValue: void 0,
        handlers: <Array<{
            onFulfilled: (value) => any,
            onRejected: (reason) => any,
            deferred2: Deferred
        }>> []
    };

    /**
     * INTERNAL fulfils the promise.
     */
    fulfil(value: any) {

        // Update the promise state.
        if (this.$slow.state !== State.Pending) return;
        [this.$slow.state, this.$slow.settledValue] = [State.Fulfilled, value];

        // Synchronise with the persistent object graph.
        storage.updated(this);

        // Invoke any already-attached handlers now (asynchronously).
        process.nextTick(() => processAllHandlers(this));
    }

    /**
     * INTERNAL rejects the promise.
     */
    reject(reason: any) {

        // Update the promise state.
        if (this.$slow.state !== State.Pending) return;
        [this.$slow.state, this.$slow.settledValue] = [State.Rejected, reason];

        // Synchronise with the persistent object graph.
        storage.updated(this);

        // Invoke any already-attached handlers now (asynchronously).
        process.nextTick(() => processAllHandlers(this));
    }
}


/**
 * Dequeues and processes all enqueued onFulfilled/onRejected handlers.
 * The SlowPromise implementation calls this when `p` becomes settled,
 * and then on each `then` call made after `p` is settled.
 */
function processAllHandlers(p: SlowPromise) {

    // Dequeue each onResolved/onRejected handler in order.
    while (p.$slow.handlers.length > 0) {
        var handler = p.$slow.handlers.shift();

        // Synchronise with the persistent object graph.
        storage.updated(p);

        // Fulfilled case.
        if (p.$slow.state === State.Fulfilled) {
            if (_.isFunction(handler.onFulfilled)) {
                try {
                    var ret = handler.onFulfilled.apply(void 0, [p.$slow.settledValue]);
                    standardResolutionProcedure(handler.deferred2.promise, ret);
                }
                catch (ex) {
                    handler.deferred2.reject(ex);
                }
            }
            else {
                handler.deferred2.resolve(p.$slow.settledValue);
            }
        }

        // Rejected case.
        else if (p.$slow.state === State.Rejected) {
            if (_.isFunction(handler.onRejected)) {
                try {
                    var ret = handler.onRejected.apply(void 0, [p.$slow.settledValue]);
                    standardResolutionProcedure(handler.deferred2.promise, ret);
                }
                catch (ex) {
                    handler.deferred2.reject(ex);
                }
            }
            else {
                handler.deferred2.reject(p.$slow.settledValue);
            }
        }
    }
}


/**
 * The states that may be assumed by a SlowPromise instance.
 */
const enum State {
    Pending,
    Fulfilled,
    Rejected
}


/**
 * The type of object returned by the SlowPromise.deferred static method.
 */
interface Deferred {
    promise: SlowPromise;
    resolve: SlowPromiseResolve;
    reject: SlowPromiseReject;
}


// Tell storage how to create a SlowPromise instance.
storage.registerSlowObjectFactory(SlowKind.Promise, $slow => {
    var promise = new SlowPromise(null);
    promise.$slow = <any> $slow;
    return promise;
});
