
var lib = module.exports;

var config = require("../config"),
    Promise = require("bluebird")
;

var fallback = config.get('storage', 'file');
var current = null;

var storage = null;

lib.setup = function(type, config) {
    return new Promise(function(ok, ko) {

        type = type || current || fallback;
        config = config || {};

        if(!storage) {

            try {

                storage = require("./storages/" + type);
                if(storage.setup) {
                    return storage.setup(config).catch(ko).then(function() {

                        current = type;

                        return ok(storage);
                    });
                }
                else {
                    var msg = "Storage type "+type+" MUST implement a setup method";
                    console.error(msg);
                    return ko(new Error(msg));
                }

            }
            catch(e) {

                console.error("Error loading storage type %s", type);
                console.error(e);

                if(type !== fallback) {

                    console.warn("Using default fallback %s", fallback);
                    current = null;
                    return lib.setup(fallback);
                }

                console.error("Cannot load storage!");
                ko(e);
            }

        }
        else {
            ok(storage);
        }

    });
};

lib.write = function(key, content) {
    return lib.setup().then(function(storage) {

        if(!storage.write) {
            var msg = "Storage type "+current+" MUST implement a write method";
            console.error(msg);
            return Promise.reject(new Error(msg));
        }

        return storage.write(key, content);
    });
};

lib.read = function(key) {
    return lib.setup().then(function(storage) {

        if(!storage.read) {
            var msg = "Storage type "+current+" MUST implement a read method";
            console.error(msg);
            return Promise.reject(new Error(msg));
        }

        return storage.read(key);
    });
};