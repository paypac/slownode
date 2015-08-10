import fs = require("fs");
import async = require('asyncawait/async');
import await = require('asyncawait/await');
import Promise = require("bluebird")
import db = require('./store/db');
import dbpath = require('./dbpath');
var stat = Promise.promisify(fs.stat);
var unlink = Promise.promisify(fs.unlink);
export = stop;


var stop = async(() => {

    // If the file does not exist, there is nothing to do so just return normally.
    try {
        await(stat(dbpath));
    }
    catch (ex) {
        return;
    }

    // The file does exist. Attempt to delete it.
    await(db.destroy());
    await(unlink(dbpath));
});
