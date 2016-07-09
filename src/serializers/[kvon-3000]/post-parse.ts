import encodePathSegment from './encode-path-segment';
import Reviver from './reviver';
import {Serializable, Escaped, isPrimitive, isPlainObject, isEscaped} from './serializable-types';
import WtfMap from './wtf-map';





// TODO: ...
export default function postParse(value: Serializable[], reviver: Reviver): {} {

    // TODO: ...
//    let visited = new Set<Serializable>();
    let revivedTo = new WtfMap<Serializable, {}>();
    const PENDING = {toString: () => 'PENDING'};

    // TODO: ...
    let unflattened = unflatten(value);
    let revived = {'':unflattened};
    revive(revived, '', revived['']);
//    backpatch(revived, '', revived['']);
    return revived[''];



    // function backpatch(obj: {}, key: string, val: {}, visited = new Set<{}>()): void {

    //     if (visited.has(val)) return;
    //     visited.add(val);

    //     if (revivedTo.has(val)) {
    //         obj[key] = revivedTo.get(val);
    //         return;
    //     }

    //     if (!val || typeof val !== 'object') return;
    //     Object.keys(val).forEach(subkey => {
    //         backpatch(val, subkey, val[subkey]);
    //     });
    // }





    // TODO: ...
    // TODO: put in own file replace.ts
    function revive(obj: Serializable, key: string, val: Serializable): void {

        // TODO: revise comment...
        // Check if we have already encountered this value elsewhere in the object graph. If so, return the
        // revived value previously computed for it. This ensures the output object graph retains object
        // identities and supports circular references.
        if (revivedTo.has(val)) {
            //return; // TODO: replace with a getter that throws to prevent corner-case error (explain...)
            // TODO: temp testing...
            Object.defineProperty(obj, key, {
                enumerable: true,
                configurable: true,
                get: () => { let v = revivedTo.get(val); if (v !== PENDING) return v; throw new Error(`PENDING!!!`);}
            });
            return;
        }


        // TODO: ...
        revivedTo.set(val, PENDING);
        //TODO: was... visited.add(val);

        // TODO: ...
        let shouldReviveVal = true;

        // TODO: recursively replace children first...
        if (isPlainObject(val)) {

            // TODO: ...
            if (isEscaped(val)) {
                val = val.raw;
                shouldReviveVal = false;
            }

            // TODO: ...
            let subkeys = Object.keys(val);
            for (let i = 0; i < subkeys.length; ++i) {
                let subkey = subkeys[i];
                revive(val, subkey, val[subkey]);
            }
            // TODO: was.. restore after testing...
            // Object.keys(val).forEach(subkey => {
            //     revive(val, subkey, val[subkey]);
            // });

            // TODO: ...
            if (shouldReviveVal) {
                // TODO: add sanity check to assert that the reviver didn't mutate `obj` or `val`?
                val = reviver.call(obj, key, val);
            }
        }

        else {
            // TODO: ...
        }

        // TODO: ...
        revivedTo.set(obj[key], val);
        obj[key] = val;
    }





    // TODO: put in own file flatten.ts
    function unflatten(flat: Serializable[]): Serializable {

        // TODO: ...
        let visited = new WtfMap<number, Serializable>();
        return self(0);

        function self(index: number): Serializable {
            let result: Serializable;
            if (visited.has(index)) {
                result = visited.get(index);
            }
            else if (isPrimitive(flat[index])) {
                result = flat[index];
                visited.set(index, result);
            }
            else {
                result = {};
                visited.set(index, result);
                Object.keys(flat[index]).forEach(key => {
                    result[key] = self(flat[index][key]);
                });
            }
            return result;
        }

    }



    // // TODO: ...
    // function traverse(obj: Serializable, key: string, val: Serializable, path: string[]): void {

    //     // Check if `val` represents a reference to a canonical decoding elsewhere in the object graph. If so,
    //     // just record the details for backpatching after the full traversal has completed. Since there are no
    //     // guarantees with property enumeration order, it would be unsafe to resolve the reference now, because
    //     // the canonical path it refers to may not have been decoded yet.
    //     if (isReference(val)) {
    //         pathRefs.set(path.join('.'), val.path);
    //         return;
    //     }

    //     // If `val` is an object or array, then its properties are traversed (recursively) *before* `val` itself is
    //     // put through the reviver. This ensures revivers are called in the reverse order of replacers.
    //     if (isPlainObject(val)) {

    //         // Check for the special case of an 'escaped' plain object. The serializer only produces these encodings for
    //         // plain objects that were untouched by all replacers, and which contain a '$type' property. Escaped objects
    //         // decode to their unescaped value, without revival. However, the object's properties are still traversed.
    //         if (isEscaped(val)) {
    //             obj[key] = val = val.raw;
    //             var noRevive = true;
    //         }

    //         // Traverse the properties of the object/array, so that they are recursively revived. If the value
    //         // represents an encoded array, restore it back to a plain array before traversing its properties.
    //         if (isEncodedArray(val)) {
    //             let props = val.props;
    //             obj[key] = val = Object.keys(props).reduce((ar, subkey) => (ar[subkey] = props[subkey], ar), []);
    //         }
    //         Object.keys(val).forEach(subkey => {
    //             traverse(val, subkey, val[subkey], path.concat(encodePathSegment(subkey)));
    //         });
    //     }

    //     // Finally, run the reviver function on `val` itself (unless it was an escaped form). The revived value is
    //     // the canonical value corresponding to the current path, so we also record that mapping here. These
    //     // canonical mappings are used to resolve all the 'ref' references after traversal has completed.
    //     if (!noRevive) obj[key] = val = reviver.call(obj, key, val);
    //     pathDefs.set(path.join('.'), val);
    // }
}