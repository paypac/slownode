﻿import assert = require('assert');
import crypto = require('crypto');
import async = require('asyncawait/async');
import await = require('asyncawait/await');
import Promise = require('bluebird');
import Types = require('slownode');
import db = require('../knexConnection');
import SlowRoutineFunction = require('../slowRoutine/slowRoutineFunction');
import runToCompletion = require('./runToCompletion');
import serialize = require('../serialization/serialize');
export = slowAsyncFunction;


// TODO: doc...
var slowAsyncFunction: Types.SlowAsyncFunction = <any> ((bodyFunc: Function) => {

    // Create a SlowRoutineFunction instance for the given body function.
    var sloroFunc = SlowRoutineFunction(bodyFunc, { yieldIdentifier: 'await', constIdentifier: '__const' });

    // Initiate retreival of the function's id from the database.
    // This will persist the function to the database if it is not already present there.
    var promiseOfFunctionId = getPersistentFunctionId(sloroFunc, bodyFunc);

    // Create a Promise-returning async function that runs an instance of the given SlowRoutineFunction to completion.
    var result = async((...args) => {

        // Create a new SlowRoutine object using the given arguments.
        var sloro: Types.SlowRoutine = sloroFunc.apply(sloroFunc, args);

        // Persist the SlowRoutine's initial state to the database, and link it to its database id.
        var functionId = await(promiseOfFunctionId); // TODO: what if this throws?
        sloro._srid = await(db.table('AsyncFunctionActivation').insert({ functionId, state: serialize(sloro._state), awaiting: null }))[0];

        // Run the SlowRoutine instance to completion. If it throws, we throw. If it returns, we return.
        await(runToCompletion(sloro));
    });

    // Return the async function.
    // TODO: should it also have some persistent ID or ...?
    return result;
});


// TODO: doc...
// TODO: error handling needed?? What happens on failure here?
// TODO: minify source before storing?
var getPersistentFunctionId = async((sloroFunc: Types.SlowRoutineFunction, originalFunc: Function) => {

    // Compute the hash of the SlowRoutineFunction's _body function source code.
    var hash: string = crypto.createHash('sha256').update(sloroFunc._body.toString()).digest('base64').slice(0, 64);

    // Check if the function is already persisted. If so, return its id.
    var functionIds: {id: number}[] = await (db.table('Function').select('id').where('hash', hash));
    if (functionIds.length > 0) return functionIds[0].id;

    // Add the function information to the database and return the INSERTed id.
    var source = sloroFunc._body.toString();
    var originalSource = originalFunc.toString();
    var insertedIds: number[] = await(db.table('Function').insert({ hash, source, originalSource }));
    return insertedIds[0];
});