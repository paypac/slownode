// TODO: support Iterator#return method? Would need JASM support...
import JasmProcesor, {Register} from './jasm-processor';
import {Program} from './serialization/jasm';





// TODO: ...
export default class Script implements IterableIterator<Promise<void>> {


    // TODO: doc...
    constructor(source: string, options?: ScriptOptions) {
        options = options || {language: 'typescript'};


        if (options.language === 'typescript') {
            // TODO: ...
        }
        else if (options.language === 'jasm+kvon') {
            // TODO: ...
        }
        else {
            // TODO: throw unsupported language...
        }

        //this.next = makeNextFunction();
        //this.throw = makeThrowFunction();
    }


    // TODO: ...
    static fromSnapshot(snapshot: string) {
        // TODO: ...
        return new Script(snapshot, {language: 'jasm+kvon'});
    }


    // TODO: ...
    instructions: Program;


    // TODO: ...
    registers: Map<Register, any>;


    // TODO: ...
    snapshot(): string {
        // TODO: ...
        throw new Error(`Not implemented`);
    }


    // TODO: ...
    next: () => IteratorResult<Promise<void>>;


    // TODO: ...
    throw: (err: any) => IteratorResult<Promise<void>>;


    // TODO: ...
    [Symbol.iterator]() {
        return this;
    }
}





// TODO: ...
export interface ScriptOptions {
    language: 'typescript'|'jasm+kvon'
}





// TODO: ...
function makeNextFunction(program: Program, processor: JasmProcesor): () => IteratorResult<Promise<void>> {

    // TODO: Associate each label with it's zero-based line number...
    let labelLines = program.lines.reduce((labels, line, i) => {
        if (line.type === 'label') labels[line.name] = i;
        return labels;
    }, {});

    // TODO: ...
    let switchCases = program.lines.map((line, i) => {
        switch (line.type) {
            case 'blank':
            case 'label':
                return '';
            case 'instruction':
                let opcode = line.opcode.toUpperCase();
                if (opcode === 'STOP') {
                    return `done = true; _.registers.set('PC', ${i}); `;
                }
                else {
                    return `p = _.${opcode}(${line.arguments.map(arg => {
                        switch (arg.type) {
                            case 'register':    return `'${arg.name}'`;
                            case 'label':       return labelLines[arg.name];
                            case 'const':       return JSON.stringify(arg.value);
                            default:            let unreachable: never = arg; /* ensure all discriminants covered */
                        }
                    }).join(', ')}); `;
                }
            default:
                let unreachable: never = line; /* ensure all discriminants covered */
        }
    }).map((line, i) => `case ${`${i}:    `.slice(0, 6)} ${line}break;`);

    // TODO: retain program comments to aid debugging... NB: An inline sourcemap to JASM (or to the original script) would be the best thing here
    switchCases = switchCases.map((line, i) => {
        if (!program.lines[i].comment) return line;
        return `${line}${' '.repeat(Math.max(0, 72 - line.length))}//${program.lines[i].comment}`;
    });

    // TODO: Eval up the next() function...
    // TODO: what if an THROW/AWAIT op rejects? It's not handled properly in the following source code...
    let _ = processor;
    let source = `
        function next() {
            var done = false, pc = _.registers.get('PC'), p;
            _.registers.set('PC', pc + 1);
            switch (pc) {
                ${switchCases.join(`\n                `)}
            }
            return { done, value: done ? void 0 : Promise.resolve(p) };
        }
    `.split(/(?:\r\n)|\r|\n/).map(line => line.slice(8)).join('\n');
    let result: () => IteratorResult<Promise<void>> = eval(`(${source})`);

    // TODO: ...
    return result;
}





// TODO: ...
function makeThrowFunction(program: Program, processor: JasmProcesor): () => IteratorResult<Promise<void>> {
    // TODO: ...
    throw new Error(`Not implemented`);
}
