




// TODO: ...
export default class Global {

    Infinity = Infinity;

    NaN = NaN;

    print(msg) {
        console.log(msg);
    }


    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    sleepThenFail(ms, msg) {
        return new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms));
    }
}
