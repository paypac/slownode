'use strict';





// TODO: review how labels work...
/** TODO: doc... */
export default class Label {


    constructor() {
        this.name = `#${++Label._counter}`;
    }


    name: string;


    private static _counter = 0;
}