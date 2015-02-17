
var Promise = require('bluebird'),
    fs = require('fs')
;

var lib = module.exports;

lib.setup = function() {
    return Promise.resolve();
};

lib.write = function(key, content) {
    return new Promise(function(ok, ko) {
        fs.writeFile(key, content, function(err) {
            if(err) return ko(err);
            return ok();
        });
    });
};

lib.read = function(key) {
    return new Promise(function(ok, ko) {
        fs.exists(key, function(exists) {

            if(!exists) {
                return ko(new Error("File "+key+" doesn't exists"));
            }

            fs.readFile(key, 'utf8', function (err, data) {
                (err) ?  ko(err) : ok(data);
            });

        });
    });
};
