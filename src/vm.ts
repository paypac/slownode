'use strict';





export class Register {


    constructor(name?: string, value?: any) {
        this.name = name || 'Unnamed Register';
        this.value = value;
    }


    name: string;


    value: any;
}





export interface VM {

    // Load/store/move
    LOAD:   (tgt: Register, obj: Register, key: Register|string|number) => void;
    LOADC:  (tgt: Register, val: string|number|boolean|null) => void;
    STORE:  (obj: Register, key: Register|string|number, src: Register) => void;
    MOVE:   (tgt: Register, src: Register) => void;

    // Arithmetic/logic
    ADD:    (tgt: Register, lhs: Register, rhs: Register) => void;
    SUB:    (tgt: Register, lhs: Register, rhs: Register) => void;
    MUL:    (tgt: Register, lhs: Register, rhs: Register) => void;
    DIV:    (tgt: Register, lhs: Register, rhs: Register) => void;
    NEG:    (tgt: Register, arg: Register) => void;
    NOT:    (tgt: Register, arg: Register) => void;

    // Compare
    EQ:     (tgt: Register, lhs: Register, rhs: Register) => void;
    GE:     (tgt: Register, lhs: Register, rhs: Register) => void;
    GT:     (tgt: Register, lhs: Register, rhs: Register) => void;
    LE:     (tgt: Register, lhs: Register, rhs: Register) => void;
    LT:     (tgt: Register, lhs: Register, rhs: Register) => void;
    NE:     (tgt: Register, lhs: Register, rhs: Register) => void;

    // Control
    B:      (line: number) => void;
    BF:     (line: number, arg: Register) => void;
    BT:     (line: number, arg: Register) => void;
    CALL:   (tgt: Register, func: Register, thís: Register, args: Register) => void;

    // Misc
    NEWARR: (tgt: Register) => void; // TODO: really primitive? could use ctor
    NEWOBJ: (tgt: Register) => void; // TODO: really primitive? could use ctor
    NOOP:   () => void;

    // Registers
    PC:     Register;
    ENV:    Register;
    $0:     Register;
    $1:     Register;
    $2:     Register;
    $3:     Register;
    $4:     Register;
    $5:     Register;
    $6:     Register;
    $7:     Register;
}





export function makeVM() {

    let vm: VM = {
        LOAD:   (tgt, obj, key) => tgt.value = obj.value[key instanceof Register ? key.value : key],
        LOADC:  (tgt, val) => tgt.value = val,
        STORE:  (obj, key, src) => obj.value[key instanceof Register ? key.value : key] = src.value,
        MOVE:   (tgt, src) => tgt.value = src.value,

        ADD:    (tgt, lhs, rhs) => tgt.value = lhs.value + rhs.value,
        SUB:    (tgt, lhs, rhs) => tgt.value = lhs.value - rhs.value,
        MUL:    (tgt, lhs, rhs) => tgt.value = lhs.value * rhs.value,
        DIV:    (tgt, lhs, rhs) => tgt.value = lhs.value / rhs.value,
        NEG:    (tgt, arg) => tgt.value = -arg.value,
        NOT:    (tgt, arg) => tgt.value = !arg.value,

        EQ:     (tgt, lhs, rhs) => tgt.value = lhs.value === rhs.value,
        GE:     (tgt, lhs, rhs) => tgt.value = lhs.value >= rhs.value,
        GT:     (tgt, lhs, rhs) => tgt.value = lhs.value > rhs.value,
        LE:     (tgt, lhs, rhs) => tgt.value = lhs.value <= rhs.value,
        LT:     (tgt, lhs, rhs) => tgt.value = lhs.value < rhs.value,
        NE:     (tgt, lhs, rhs) => tgt.value = lhs.value !== rhs.value,

        B:      (line) => jump(line),
        BF:     (line, arg) => arg.value ? null : jump(line),
        BT:     (line, arg) => arg.value ? jump(line) : null,
        CALL:   (tgt, func, thís, args) => tgt.value = func.value.apply(thís.value, args.value),

        NEWARR: (tgt) => tgt.value = [],
        NEWOBJ: (tgt) => tgt.value = {},
        NOOP:   () => null,

        PC:     new Register('PC', 0),
        ENV:    new Register('ENV'),
        $0:     new Register('$0'),
        $1:     new Register('$1'),
        $2:     new Register('$2'),
        $3:     new Register('$3'),
        $4:     new Register('$4'),
        $5:     new Register('$5'),
        $6:     new Register('$6'),
        $7:     new Register('$7')
    };

    function jump(line: number) {
        // TODO: scope enter/exit, finally blacks
    }

    vm.ENV.value = {};
    return vm;
}
