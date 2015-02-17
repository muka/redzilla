
var md5 = require('MD5'),
    config = require('../config').config,
    Promise = require('bluebird'),
    fs = require('fs-extra'),
    child_process = require('child_process'),
    ncp = require('ncp').ncp,
    logger = require('./logger')

;

var lib = module.exports;

var instances = {};
var options = {};
var processes = {};

var red_path = __dirname + '/../node_modules/node-red';
var red_linkables = [ 'lib', 'node_modules', 'nodes', 'public', 'red' ];

var lastPort = config.basePort;

var instancesDir = __dirname + "/../instances/";
var instancesCacheFile = instancesDir + "/cache.json";


lib.getInstances = function() {
    return instances;
};

lib.setup = function(dir, settings) {

    if(!fs.existsSync(dir)) {
        fs.mkdirSync(dir, 0777);
    }


    red_linkables.forEach(function(filename) {

        var src = red_path + "/" + filename;
        var dest = dir + "/" + filename;

        if(!fs.existsSync(dest)) {
            fs.symlinkSync(src, dest);
        }
    });

    // copy module only
    ncp(red_path + "/red.js", dir + "/red.js");

    require('./settings').saveSettingsFile(dir, settings);
};

lib.config = function(name) {
    return instances[name];
};

lib.options = function(name) {
    if(options[name] === undefined || options[name] === null) {
        options[name] = {};
    }
    return options[name];
};

lib.process = function(name) {
    return processes[name];
};

lib.start = function(config) {
    return new Promise(function(ok, ko) {

        var name = config.name;
        instances[ name ] = config;

        try {
            // setup fs
            lib.setup(config.dir, config.settings);
        }
        catch(e) {
            return ko(e);
        }

        logger.info("Process info", instances[ name ]);

        try {

            var child = child_process.spawn('node', ["red"], {
                'cwd': config.dir
            });
            processes[ name ] = child;

            var processLogger = logger.instance(name);

            child.stdout.on('data', function (data) {
                data.toString().split("\n").forEach(function(line) {
                    if(line.replace(" ", "").length)
                        processLogger.info(line);
                });
            });

            child.stderr.on('data', function (data) {
                data.toString().split("\n").forEach(function(line) {
                    if(line.replace(" ", "").length)
                        processLogger.error(line);
                });
            });

            child.on('exit', function() {

                var _m = "%s: process died, respawning";
                logger.error(_m, name);
                processLogger.error(_m, name);

                var config = instances[ name ];

                if(config.timeout) {
                    return;
                }

                if(lib.options(name).respawn === false) {
                    processLogger.info("Not respawing as requested.");
                }

                config.timeout = setTimeout(function() {

                    lib.options(name).timeout = null;
                    lib.options(name).respawn = lib.options(name).respawn || new Date;

                    lib.options(name).counter = lib.options(name).counter ? lib.options(name).counter : 0;
                    lib.options(name).counter++;

                    var _reset = function() {
                        instances[ name ] = processes[name] = null;
                    };

                    // if counter > 10 && last respawn was < 5 sec, abort
                    var lastRespawn = (new Date().getTime() - lib.options(name).respawn.getTime());
                    if(lib.options(name).counter > 10 && lastRespawn < 5000) {
                        processLogger.info("Respawaning failed too many times, aborted. See logs for details");
                        _reset();
                        options[name] = null;
                        return;
                    }

                    // more than 5 min, reset counter
                    var fiveMin = 5 * 60 * 1000;
                    if(lastRespawn > fiveMin) {
                        lib.options(name).counter = 0;
                    }

                    lib.options(name).respawn = new Date;

                    _reset();
                    lib.start(config);

                    logger.info("Restarted");
                    processLogger.info("Restarted");

                }, 1500);

            });

            return lib.persist().finally(function() {
                return ok(lib.config(name));
            });

        }
        catch (e) {
            return ko(e);
        }

    });
};

lib.getUsedPort = function() {
    return new Promise(function(ok, ko) {
        child_process.exec("netstat", [ '-at' ], function(error, stdout, stderr) {

            if(error || stderr) {
                return ko(error || stderr);
            }

            var usedPorts = {};
            stdout.split("\n").forEach(function(line) {
                var res = line.match(/tcp +[0-9]* +[0-9]* *(.*)\:([0-9]+)/i);
                if(res) {
                    usedPorts[ res[2] ] = {
                        host: res[1],
                        port: res[2]
                    };
                }
            });

            ok(usedPorts);

        });
    });
};

lib.getPort = function() {

    return lib.getUsedPort().then(function(ports) {

        while(ports[ lastPort ]) {

            lastPort++;
            if(lastPort > 65000) {
                return Promise.reject(new Error("Cannot allocate port " + lastPort));
            }

        }

        return Promise.resolve(lastPort);

    });
};

lib.exists = function(name) {
    return lib.config(name) !== null;
};

lib.create = function(name, config) {

    return lib.getPort().then(function(port) {

        if(typeof name === 'object') {
            config = name;
            name = config.name;
        }

        config = config || {};

        var uid = md5(name);
        var dir = instancesDir + uid;
//        var path = "red/" + uid;
        var path = "";

        var settings = {

            uiPort: port,
            flowFile: "flow.json",

    //        userDir: dir,
            httpAdminRoot: path
        };

        var instanceConfig = {
            name: name,
            uid: uid,
            port: port,
            path: path,
            dir: dir,
            settings: settings
        };

        if(Object.keys(config).length) {
            for(var i in config) {
                instanceConfig[ i ] = config[i];
            }
        }

        return lib.start(instanceConfig);
    });
};

lib.load = function(name, config) {

    return new Promise(function(ok, ko) {

        if(typeof name === 'object') {
            config = name;
            name = config.name;
        }

        config = config || {};
        name = name || [(new Date).getTime(), Math.random((new Date).getTime()) ].join('');

        try {

            if (!instances[name]) {
                logger.info("New instance for " + name);
                return lib.create(name, config).then(ok).catch(ko);
            }

            logger.info(name + " already exists!");
            ok(lib.config(name));
        }
        catch (e) {
            ko(e);
        }

    });
};

lib.persist = function() {
    return require("./storage").write(instancesCacheFile, JSON.stringify(lib.getInstances()));
};

lib.reload = function() {
    return require('./storage').read(instancesCacheFile).then(function(raw) {

        var cachedInstances = JSON.parse(raw);

        var _keys = Object.keys(cachedInstances) || [];

        if(!_keys || !_keys.length) {
            return Promise.resolve();
        }

        return Promise.all(_keys).each(function(uid) {

            var instance = cachedInstances[ uid ];

            logger.info("Reloading previous instace %s", instance.name);
            return lib.load(instance.name, instance);
        });

    }).catch(function(e) {
        logger.error("Cannot reload due to error", e);
        return Promise.resolve();
    });
};

lib.kill = function(name) {

    logger.info("Send kill sig to %s", name);

    try {

        if(processes[name]) {
            lib.options(name).respawn = false;
            processes[name].kill();
            delete processes[name];
        }

    }
    catch(e) {

        logger.error(e);
    }

};

lib.remove = function(name) {
    return new Promise(function(ok, ko) {

        logger.info("Removing instance for %s", name);

        try {

            lib.kill(name);

            if(instances[ name ]) {

                logger.info("Removing %s", instances[ name ].dir);
                fs.remove(instances[ name ].dir, function() {

                    logger.info("Ok");
                    delete instances[ name ];

                    lib.persist().then(ok).catch(ko);
                });

            }
            else {
                ok();
            }

        }
        catch(e) {

            logger.error(e);
            ko(e);
        }

    });
};

process.on('SIGINT',function() {

    var _k = Object.keys(processes);
    _k && _k.forEach(lib.kill);

    process.exit();
});