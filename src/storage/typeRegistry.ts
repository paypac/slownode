﻿import assert = require('assert');
import types = require('types');


// TODO: ...
export function store(registration: types.SlowObject.Registration) {
    assert(!registry[registration.type], `type already registered: '${registration.type}'`);
    registry[registration.type] = registration;
}


// TODO: ...
export function fetch(type: types.SlowObject.Type): types.SlowObject.Registration {
    assert(registry[type], `type not registered: '${type}'`);
    return registry[type];
}


// TODO: ...
export function fetchAll(): types.SlowObject.Registration[] {
    return Object.keys(_cache).map(key => _cache[key]);
}


// TODO: ...
var registry: { [slowObjectType: number]: types.SlowObject.Registration; } = {};


// TODO: temp testing... remove this...
export var _cache = registry;

