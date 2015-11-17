var assert = require('assert');
var fs = require('fs');
var _ = require('lodash');
var storageLocation = require('./storageLocation');
var dehydrateSlowObject = require('./dehydrateSlowObject');
var rehydrateSlowObject = require('./rehydrateSlowObject');
var slowObjectFactories = require('./slowObjectFactories');
function created(obj) {
    // TODO: temp testing... try instance prop then static prop
    var log = obj.$slowLog;
    if (log) {
    }
    // TODO: temp testing...
    if (isLoadingState)
        return module.exports;
    assert(!allTrackedObjects.has(obj));
    ensureSlowObjectHasUniqueId(obj);
    allTrackedObjects.add(obj);
    updatedTrackedObjects.add(obj);
    return module.exports;
}
exports.created = created;
function updated(obj) {
    // TODO: temp testing...
    if (isLoadingState)
        return module.exports;
    assert(allTrackedObjects.has(obj));
    updatedTrackedObjects.add(obj);
    return module.exports;
}
exports.updated = updated;
function deleted(obj) {
    // TODO: temp testing...
    if (isLoadingState)
        return module.exports;
    assert(allTrackedObjects.has(obj));
    deletedTrackedObjects.add(obj);
    return module.exports;
}
exports.deleted = deleted;
var allTrackedObjects = new Set();
var updatedTrackedObjects = new Set();
var deletedTrackedObjects = new Set();
var nextId = 0;
var isLoadingState = false;
function saveChanges(callback) {
    // TODO: temp testing...
    if (isLoadingState)
        return module.exports;
    // TODO: ... why async here?
    setImmediate(function () {
        // TODO: temp testing for DEBUGGING only...
        //console.log(`======================================== SAVE CHANGES ========================================\n`);
        //var debug = {
        //    all: setToArray(allTrackedObjects),
        //    deleted: setToArray(deletedTrackedObjects),
        //    updated: setToArray(updatedTrackedObjects)
        //};
        // For each deleted object, mark it as deleted in the log, and remove it from the set of tracked objects.
        deletedTrackedObjects.forEach(function (obj) {
            log("[\"" + obj.$slow.id + "\", null],\n\n\n");
            allTrackedObjects.delete(obj);
        });
        // For each updated object, dehydrate it and write its serialized form to the log.
        updatedTrackedObjects.forEach(function (obj) {
            var jsonSafe = dehydrateSlowObject(obj, allTrackedObjects);
            log("[\"" + obj.$slow.id + "\", " + JSON.stringify(jsonSafe) + "],\n\n\n");
        });
        // Clear the deleted and updated sets.
        deletedTrackedObjects.clear();
        updatedTrackedObjects.clear();
        // TODO: Done. But catch errors!!!
        if (callback)
            callback();
    });
}
exports.saveChanges = saveChanges;
function loadState() {
    // TODO: why not just allow tracking always? At load time that will effectively get the next log into the proper state....
    isLoadingState = true;
    // Read and parse the whole log file into an object.
    // TODO: temp testing...
    //var json = `[${fs.readFileSync(path.join(__dirname, '../../slowlog.bak.txt'), 'utf8')} 0]`;
    //TODO: was restore...
    var json = exists() ? "[" + fs.readFileSync(storageLocation, 'utf8') + " 0]" : "[0]";
    var log = JSON.parse(json);
    log.pop();
    // TODO: at this point we can start the new log file.
    //       - but ensure the old one is safely reloaded before deleting it!!!
    // TODO: delete the old file for now, but this is NOT SAFE! See prev comment.
    if (exists())
        fs.unlinkSync(storageLocation);
    // Collect each (still dehydrated) slow object that appears in the log, in its most recent state.
    var dehydratedSlowObjects = log.reduce(function (map, keyVal) {
        if (keyVal[1])
            map[keyVal[0]] = keyVal[1];
        else
            delete map[keyVal[0]];
        return map;
    }, {});
    // Further filter the slow objects to those that are transitively reachable from roots.
    // There is only one root slow object: the slow event loop.
    var rootSlowObjectIds = _.values(dehydratedSlowObjects)
        .filter(function (so) { return so.$slow.kind === 1 /* EventLoop */; })
        .map(function (so) { return so.$slow.id; });
    var reachableSlowObjectIds = new Set(rootSlowObjectIds);
    var reachableObjects = rootSlowObjectIds.reduce(function (objs, id) { return objs.concat(_.values(dehydratedSlowObjects[id].$slow)); }, []);
    while (reachableObjects.length > 0) {
        var reachableObject = reachableObjects.pop();
        if (_.isArray(reachableObject)) {
            reachableObjects = reachableObjects.concat(reachableObject);
        }
        else if (_.isPlainObject(reachableObject)) {
            var $ref = reachableObject.$ref;
            if ($ref) {
                if (!reachableSlowObjectIds.has($ref)) {
                    reachableSlowObjectIds.add($ref);
                    reachableObjects = reachableObjects.concat(_.values(dehydratedSlowObjects[$ref].$slow));
                }
            }
            else {
                var $type = reachableObject.$type;
                assert($type);
                if ($type === 'object') {
                    reachableObjects = reachableObjects.concat(reachableObject.value);
                }
            }
        }
    }
    _.keys(dehydratedSlowObjects).forEach(function (id) {
        if (!reachableSlowObjectIds.has(id))
            delete dehydratedSlowObjects[id];
    });
    // Set nextId to the highest-used id#
    nextId = _.keys(dehydratedSlowObjects).reduce(function (max, id) { return Math.max(max, id[0] === '#' ? parseInt(id.slice(1)) : 0); }, 0);
    // Rehydrate all the slow objects. This also reconnects cross-references (including cycles).
    // TODO: doc/revise - (1) rehydrated objects may be null (eg weak refs). (2) If they have a $slow.id, it must be same as dehydrated one.
    var rehydratedSlowObjects = {};
    _.forEach(dehydratedSlowObjects, function (dehydrated) {
        var rehydrated = rehydrateSlowObject(dehydrated, rehydratedSlowObjects, slowObjectFactories);
        rehydratedSlowObjects[dehydrated.$slow.id] = rehydrated;
    });
    // TODO: temp testing
    isLoadingState = false;
    // TODO: Add all the slow objects preserved from the old log to the new log
    _.forEach(rehydratedSlowObjects, function (obj) {
        // TODO: for weakrefs - they may rehydrate to null - need cleaner code for this 'exception'?
        if (!obj)
            return;
        // TODO: temp hack for early-created singleton event loop. Fix this!
        if (obj.$slow.id === '<EventLoop>')
            return;
        created(obj);
    });
}
exports.loadState = loadState;
function ensureSlowObjectHasUniqueId(obj) {
    obj.$slow.id = obj.$slow.id || "#" + ++nextId;
}
function log(s) {
    //console.log(s);
    init();
    fs.writeSync(logFileDescriptor, s, null, 'utf8');
    fs.fsyncSync(logFileDescriptor);
}
// TODO: temp testing for DEBUGGING only...
function setToArray(s) {
    var result = [];
    s.forEach(function (el) { return result.push(el); });
    return result;
}
var init = function () {
    // Ensure init is only performed once.
    // TODO: this is a bit hacky... better way?
    init = function () { };
    //var fileExists = exists();
    // Resume the current epoch (if file exists) or start a new epoch (if no file).
    // TODO: fix ...
    logFileDescriptor = fs.openSync(storageLocation, 'a'); // TODO: ensure this file gets closed eventually!!!
    //TODO: NEEDED!:   fs.flockSync(logFileDescriptor, 'ex'); // TODO: ensure exclusion. HANDLE EXCEPTIONS HERE! ALSO: THIS LOCK MUST BE EXPLICITLY REMOVED AFTER FINISHED!
};
function exists() {
    // Check if the logFile already exists. Use fs.stat since fs.exists is deprecated.
    var result = true;
    try {
        fs.statSync(storageLocation);
    }
    catch (ex) {
        result = false;
    }
    return result;
}
// TODO: doc... single process/thread exclusive by design...
// TODO: errors are not caught... What to do?
// TODO: NB from linux manpage: Calling fsync() does not necessarily ensure that the entry in the directory containing the file has also reached disk. For that an explicit fsync() on a file descriptor for the directory is also needed.
// TODO: doc... this works due to exclusive process requirement.
// TODO: but how to ensure no clashes with client-supplied ids? doc client-supplied id restrictions in API...
var idCounter = 0;
// TODO: temp testing...
var logFileDescriptor;
var cache = {};
// TODO: temp testing...
//export function registerType(registration: SlowObject.Registration) {
//    typeRegistry.store(registration);
//}
// TODO: temp testing...
//export function lookup(slowObj: SlowObject): SlowObject {
//    return cache[slowObj.$slow.id];
//}
// TODO: doc...
//export function track(slowObj: SlowObject) {
//    init();
//    var slow = slowObj.$slow;
//    slow.id = slow.id || `#${++idCounter}`;
//    var key = slow.id;
//    var serializedValue = JSON.stringify(dehydrateDef(slowObj));
//    cache[`${key}`] = slowObj;
//    // TODO: testing... NB node.d.ts is missing a typing here...
//    try {
//        (<any>fs.writeSync)(logFileDescriptor, `,\n\n\n"${key}", ${serializedValue}`, null, 'utf8');
//        fs.fsyncSync(logFileDescriptor);
//    }
//    catch (ex) {
//        console.log('FILE DESCRIPTOR: ' + logFileDescriptor);
//        throw ex;
//    }
//}
// TODO: doc...
//export function clear(slowObj: SlowObject) {
//    init();
//    var slow = slowObj.$slow;
//    var key = slow.id;
//    delete cache[key];
//    // TODO: testing...
//    (<any>fs.writeSync)(logFileDescriptor, `,\n\n\n"${key}", null`, null, 'utf8');
//    fs.fsyncSync(logFileDescriptor);
//}
// TODO: temp testing...
//var registrations: SlowObject.Registration[];
//function dehydrateDef(value: any) {
//    registrations = registrations || typeRegistry.fetchAll();
//    var jsonSafeValue;
//    for (var i = 0; jsonSafeValue === void 0 && i < registrations.length; ++i) {
//        var reg = registrations[i];
//        jsonSafeValue = reg.dehydrate(value, dehydrate);
//    }
//    return jsonSafeValue;
//}
//function rehydrateDef(jsonSafeValue: any) {
//    var slow: { type; id; } = <any> {};
//    _.keys(jsonSafeValue).forEach(propName => {
//        var propValue = jsonSafeValue[propName];
//        //if (propValue && propValue.$ref) {
//        //    Object.defineProperty(slow, propName, {
//        //        get: () => cache[propValue.$ref]
//        //    });
//        //}
//        //else {
//            slow[propName] = rehydrate(propValue);
//        //}
//    });
//    var rehydrateSlowObject = typeRegistry.fetch(slow.type).rehydrate;
//    var result = rehydrateSlowObject(slow);
//    return result;
//}
//// TODO: must support circular refs between SlowObjects when rehydrating them!
//function replayLog() {
//    var json = '[' + fs.readFileSync(storageLocation, 'utf8') + ']';
//    var logEntries: any[] = JSON.parse(json);
//    var pos = 1;
//    var keyOrder = [];
//    while (pos < logEntries.length) {
//        var key: string = logEntries[pos++];
//        var jsonSafeValue: any = logEntries[pos++];
//        if (!(key in cache)) keyOrder.push(key);
//        cache[key] = jsonSafeValue;
//    }
//    //........
//    traverseJsonSafeObject(cache, (obj, key) => {
//        if (key === '$ref') {
//            console.log(`{ $ref: ${obj[key]}}`);
//            var val = obj[key];
//            delete obj[key];
//            Object.defineProperty(obj, key, {
//                get: () => cache[val]
//            });
//        }
//    });
//    keyOrder.forEach(key => {
//        if (cache[key] === null) {
//            delete cache[key];
//        }
//        else {
//            // TODO: important - relies on defs before refs!
//            var slowObj: SlowObject = rehydrateDef(cache[key]);
//            cache[key] = slowObj;
//        }
//    });
//}
//// TODO: temp testing...
//function traverseJsonSafeObject(value, action: (obj: any, key: string) => any) {
//    if (_.isPlainObject(value) || _.isArray(value)) {
//        //TODO:...
//        _.forEach(value, (val, key, obj) => {
//            var result = action(obj, key);
//            if (result === false) return;
//            traverseJsonSafeObject(result || val, action);
//        });
//    }
//}
//var init = () => {
//    // Ensure init is only performed once.
//    // TODO: this is a bit hacky... better way?
//    init = () => {};
//    // Check if the logFile already exists. Use fs.stat since fs.exists is deprecated.
//    var fileExists = true;
//    try { fs.statSync(storageLocation); } catch (ex) { fileExists = false; }
//    if (fileExists) {
//        // TODO: replay log file, then truncate it
//        replayLog();
//        fs.unlinkSync(storageLocation);
//    }
//    // Resume the current epoch (if file exists) or start a new epoch (if no file).
//    // TODO: fix ...
//    logFileDescriptor = fs.openSync(storageLocation, 'a'); // TODO: ensure this file gets closed eventually!!!
//    //TODO: NEEDED!:   fs.flockSync(logFileDescriptor, 'ex'); // TODO: ensure exclusion. HANDLE EXCEPTIONS HERE! ALSO: THIS LOCK MUST BE EXPLICITLY REMOVED AFTER FINISHED!
//    //if (fileExists) {
//    //    logFileDescriptor = fs.openSync(storageLocation, 'ax');
//    //}
//    //else {
//    //    logFileDescriptor = fs.openSync(storageLocation, 'ax');
//    //}
//    (<any>fs.writeSync)(logFileDescriptor, `"BEGIN"`, null, 'utf8');
//    fs.fsyncSync(logFileDescriptor);
//};
//# sourceMappingURL=storage.js.map