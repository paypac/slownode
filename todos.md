

## New New Scheme

1. tsc --noEmit
  - optional! (just supports extra safety and editor intellisense)
  - catch gross syntax errors and typechecking errors
  - nothing emitted
2. babel transforms
  - catch unsupported syntax (use whitelist)
  - transform async/await/generator functions
  - resolve imports/exports into single AST / single file
3. generate single file output
4. wrap in prolog + epilog 'runner' code --> FINAL JS FILE
  - output file is now runnable
  - exports promise of result/outcome


## New Scheme (Old)

1. tsc --noEmit
  - catch gross syntax errors and typechecking errors
  - nothing emitted
2. esprima --> AST --> whitelist nodes
  - catch unsupported syntax
  - nothing emitted
3. tsc --outFile --amd --es6 --noHelpers
  - emit single output file --> TEMP
4. esprima --> AST --> xform genfuncs --> escodegen
  - transformed output file --> TEMP
5. wrap in prolog + epilog 'runner' code --> FINAL JS FILE
  - output file is now runnable
  - exports promise of result/outcome



## async operations
- [ ] internal
  - [ ] own async function
  - [ ] own generator function (co-like, yields promises, has async runner)
  - [ ] own promise-returning function
  - [ ] own callback-accepting function (no / limited sypport?)
- [ ] external
  - [ ] sleep for specific duration
  - [ ] sleep until specific time
  - [ ] database access
  - [ ] filesystem access
  - [ ] network access

## slow primitives
- [ ] pseudo-globals (module vars)
  - [ ] require
  - [ ] module
  - [ ] exports
- [ ] node globals
  - [ ] TODO: global process control: onUnhandledException, onUnhandledRejection, process.exit, etc
  - [ ] global.Promise (ES6)
  - [ ] global.setTimeout
  - [ ] global.clearTimeout
  - [ ] global.setInterval
  - [ ] global.clearInterval
  - [ ] global.process.nextTick
- [ ] syntax
  - [ ] generator functions (ES6)
  - [ ] async functions (can add these later - use generators for now)

  
## marshalling between slow/ordinary functions
- [ ] slow function calling into ordinary function
- [ ] ordinary function calling into slow function


## What if...
- [ ] we provide our own 'require' implementation:
  - [ ] it parses the module text and interprets it 'slowly'
    - [ ] ordinary functions
    - [ ] generator functions
    - [ ] values
  - [ ] 'require' augmentation is transitive
  - [ ] interop...?


## When do we update our state-of-the-world snapshots?
- [ ] when the stack empties and we return to the event loop?
  - [ ] this fits neatly with DB updates being necessarily asynchronous
- [ ] at every single state change, including synchronous (eg var assignments)
  - [ ] how to update state in DB asynchronously, during a sync operation
  - [ ] *every* operation updates the DB? that's heavy...
- [ ] if the process stops or crashes, we should at least know whether it was sleeping (empty stack) or in the middle of processing an event loop entry (non-empty stack)


## Sample Workflows

```ts
// file: approve-leave-request-workflow.ts
// NB: Call this as soon as a new leave request is created
async function approveLR(lrid: number) {

    // while not approved/rejected
        // if 14+ days passed since application
            // escalate to sysadmin via email...
        // notify/remind approver via email
        // sleep 2 days
    // notify applicant of outcome via email
}
```




```js
function ordinary() {
    var p = new Promise((resolve, reject) => {
        setTimeout(() => resolve(42), 500);
    });
    p = p.then(res => res);
    return p;
}

function* generator() {
    var one = yield Promise.resolve(1);
    var two = yield Promise.resolve(2);
    return one + two;
}

```
