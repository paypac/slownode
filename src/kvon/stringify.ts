import compose from './compose';
import escapeString from './util/escape-string';
import isPlainArray from './util/is-plain-array';
import isPlainObject from './util/is-plain-object';
import makeReference from './make-reference';
import Map from './util/same-value-map';
import Replacer from './replacer';





/**
  * Converts a JavaScript value to a Key/Value Object Notation (KVON) string.
  * @param value A JavaScript value, usually an object graph, to be converted.
  * @param replacer A function that transforms the results, or an array of such functions.
  * @param space Adds indentation, white space, and line break characters to the returned KVON text for readability.
  */
export default function stringify(value: any, replacer?: Replacer | Replacer[], space?: string | number): string {

    // Validate and normalize arguments.
    replacer = normalizeReplacer(replacer);
    space = normalizeSpace(space);

    // Recursively replace and stringify the entire object graph.
    let visited = new Map<{}, string>();
    let kvonText = recurse({'':value}, '', value, []);
    return kvonText;

    /** Performs a single step of the recursive stringification process. */
    function recurse(obj: {}, key: string, val: {}, path: string[]): string {

        // Force variable narrowing inside closure. These are definitely narrowed after the normalizeX() calls above.
        replacer = <Replacer> replacer;
        space = <string> space;

        // We must preserve the identities of values that are encountered multiple times in the object graph being
        // stringified. This is trivial for primitive values, since two primitives with the same value have the same
        // identity. But for objects and arrays, we must keep track of multiple occurences in the object graph. The
        // `visited` map associates each value encountered with the special 'reference' string that indicates the path
        // into the object graph where it's singleton definition can be found. If `visited` maps a value to the
        // 'INCOMPLETE' sentinel, then the value has been visited before but has not been fully stringified yet, and
        // therefore must cyclically reference itself. This is not permitted in KVON, and we throw an error in that
        // case. Otherwise if the `visited` map holds a 'reference' string for the given value, then we return early
        // with that string.
        if (visited.has(val)) {
            let result = visited.get(val);
            if (result !== INCOMPLETE) return result;
            throw new Error(`(KVON) cyclic object graphs are not supported`);
        }

        // Run `value` through the `replacer`. Detect whether the original value was replaced or left unchanged.
        let replacement: {} = replacer.call(obj, key, val);
        let isReplaced = !Object.is(val, replacement);

        // If the value *was* replaced, then the replacement *must* be a discriminated plain object (DPO). Verify this.
        if (isReplaced && !(isPlainObject(replacement) && replacement.hasOwnProperty('$'))) {
            throw new Error(`(KVON) replacement value must be a discriminated plain object`);
        }

        // Stringify a null literal.
        if (replacement === null) {
            return 'null';
        }

        // Stringify a boolean literal.
        if (typeof replacement === 'boolean') {
            return replacement ? 'true' : 'false';
        }

        // Stringify a numeric literal. Be careful to exclude exotic numerics, which must be handled by replacers.
        if (typeof replacement === 'number' && Number.isFinite(replacement) && !Object.is(replacement, -0)) {
            return replacement.toString();
        }

        // Stringify a string literal.
        if (typeof replacement === 'string') {

            // Escape the string literal. Also, escape '^' if it appears as the first character in the string, since
            // that marks a string as a special `reference` value. By escaping '^'-prefixed ordinary strings during
            // stringification, KVON#parse will be able to distinguish 'reference' strings from ordinary strings.
            return escapeString(replacement).replace(/^"\^/, '"\\u005e');
        }

        // Stringify a plain object or array. They are handled together here since many steps are the same.
        if (isPlainObject(replacement) || isPlainArray(replacement)) {
            let isArray = Array.isArray(replacement);

            // Map this value to the special 'INCOMPLETE' marker in the `visited` map for now. This will be updated to
            // the appropriate 'reference' string when the value has been completely stringified. This way, if we come
            // across the 'INCOMPLETE' value again while recursing, we know the value must cyclically reference itself.
            visited.set(val, INCOMPLETE);

            // Stringify the entire object/array.
            let result = isArray ? '[' : '{';
            for (let keys = Object.keys(replacement), len = keys.length, i = 0; i < len; ++i) {

                // Get stringified forms for the element/pair. This step is recursive. When we come across a '$' key,
                // then we must stringify it such that the KVON#parse step can distinguish between (A) an ordinary plain
                // object that wasn't replaced and just happens to have a '$' key, and (B) a replacement DPO where the
                // '$' key represents the discriminant needed later by KVON#parse revival. We distinguish the two cases
                // by escaping '$' keys in POJOs that weren't replaced, and leaving them intact in DPOs.
                let subkey = keys[i];
                let keyText = escapeString(subkey);
                if (!isReplaced && keyText === '"$"') keyText = '"\\u0024"';
                let valText = recurse(replacement, subkey, replacement[subkey], path.concat(subkey));

                // Stringify the element/pair as a whole, including punctuation and whitespace as necessary.
                if (i > 0) result += ',';
                if (space) result += '\n' + space.repeat(path.length + 1);
                result += isArray ? valText : `${keyText}:${space ? ' ' : ''}${valText}`;
                if (space && i === len - 1) result += '\n' + space.repeat(path.length);
            }
            result += isArray ? ']' : '}';

            // The value has been completely stringified, so we can update `visited` now.
            visited.set(val, makeReference(path));
            return result;
        }

        // We ensured earlier that the replacer either returned a DPO or left the value unchanged. Therefore if we reach
        // here, the replacer must have left the value unchanged, and the value itself is not serializable.
        throw new Error(`(KVON) no known serialization available for value: ${val}`);
    }
}





/** Returns a `Replacer` function that is equivalent to the passed in `replacer`, which may have several formats. */
function normalizeReplacer(replacer: Replacer | Replacer[] | null): Replacer {
    if (!Array.isArray(replacer)) return replacer || NO_REPLACE;
    if (replacer.every(el => typeof el === 'function')) return compose(...replacer);
    throw new Error(`(KVON) replacer must be a function or array of functions. Property whitelists are not supported`);
}





/** Returns a space string that is equivalent to the passed in `space`, which may have several formats. */
function normalizeSpace(space: string | number | null): string {
    space = space || '';
    if (typeof space === 'number') space = ' '.repeat(Math.max(0, Math.min(10, space)));
    if (space && typeof space !== 'string') throw new Error("(KVON) expected `space` to be a string or number");
    if (!/^[\s\t\n\r]*$/g.test(space)) throw new Error("(KVON) `space` string must contain only whitespace characters");
    if (!space || typeof space === 'string') return (space || '').slice(0, 10);
}





/** A no-op replacer function. */
const NO_REPLACE = (key, val) => val;





/** The sentinel value used in the `visited` map to detect cyclic references. See comments elsewhere in this file. */
const INCOMPLETE = <any> {};
