
var md5 = require('MD5'),
        config = require('./config').config,
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
var red_linkables = ['lib', 'node_modules', 'nodes', 'public', 'red'];

var lastPort = config.basePort;

var instancesDir = config.instancesDir || __dirname + "/../instances";

var instancesCacheFile = instancesDir + "/cache.json";

lib.getInstances = function () {
    return instances;
};

/**
 * Setup filesystem directory and related files
 *
 * @param {string} dir container directory
 * @param {object} settings configuration object
 *
 */
lib.setup = function (dir, settings) {

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, 0777);
    }

    red_linkables.forEach(function (filename) {

        var src = red_path + "/" + filename;
        var dest = dir + "/" + filename;

        if (!fs.existsSync(dest)) {
            fs.symlinkSync(src, dest);
        }
    });

    // copy module only
    ncp(red_path + "/red.js", dir + "/red.js");

    require('./settings').saveSettingsFile(dir, settings);
};

/**
 * Return instance configuration by name
 *
 * @param {string} name instance name
 */
lib.config = function (name) {
    return instances[name];
};

/**
 * Return instance runtime options by name
 *
 * @param {string} name instance name
 */
lib.options = function (name) {
    if (options[name] === undefined || options[name] === null) {
        options[name] = {};
    }
    return options[name];
};

/**
 * Return instance sub-process by name
 *
 * @param {string} name instance name
 */
lib.process = function (name) {
    return processes[name];
};

/**
 * Starts a new instance based on provided configurations
 *
 * @param {object} config instance configurations
 * @return {Promise}
 */
lib.start = function (config) {
    return new Promise(function (ok, ko) {

        var name = config.name;
        instances[ name ] = config;

        try {
            // setup fs
            lib.setup(config.dir, config.settings);
        }
        catch (e) {
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
                data.toString().split("\n").forEach(function (line) {
                    if (line.replace(" ", "").length)
                        processLogger.info(line);
                });
            });

            child.stderr.on('data', function (data) {
                data.toString().split("\n").forEach(function (line) {
                    if (line.replace(" ", "").length)
                        processLogger.error(line);
                        logger.warn("[" + name + "] " + line);
                });
            });

            child.on('exit', function () {

                var _m = "%s: process died, respawning";
                logger.error(_m, name);
                processLogger.error(_m, name);

                var config = instances[ name ];

                if (lib.options(name).timeout) {
                    return;
                }

                if (lib.options(name).respawn === false) {
                    processLogger.info("Not respawing as requested.");
                }

                lib.options(name).timeout = setTimeout(function () {

                    lib.options(name).timeout = null;
                    lib.options(name).respawn = lib.options(name).respawn || new Date;

                    lib.options(name).counter = lib.options(name).counter ? lib.options(name).counter : 0;
                    lib.options(name).counter++;

                    var _reset = function () {
                        instances[ name ] = processes[name] = null;
                    };

                    // if counter > 10 && last respawn was < 5 sec, abort
                    var lastRespawn = (new Date().getTime() - lib.options(name).respawn.getTime());
                    if (lib.options(name).counter > 10 && lastRespawn < 5000) {
                        processLogger.warn("Respawaning failed too many times, aborted. See logs for details");
                        _reset();
                        options[name] = null;
                        return;
                    }

                    // more than 5 min, reset counter
                    var fiveMin = 5 * 60 * 1000;
                    if (lastRespawn > fiveMin) {
                        lib.options(name).counter = 0;
                    }

                    lib.options(name).respawn = new Date;

                    _reset();
                    lib.create(name, config);

                    logger.info("Restarted");
                    processLogger.info("Restarted");

                }, 1500);

            });

            return lib.persist().finally(function () {
                return ok(lib.config(name));
            });

        }
        catch (e) {
            return ko(e);
        }

    });
};

/**
 * List ports already listening in the system
 *
 * @todo filter by localhost
 *
 * @return {Promise}
 */
lib.getUsedPort = function () {
    return new Promise(function (ok, ko) {
        child_process.exec("netstat", ['-nat'], function (error, stdout, stderr) {

            if (error || stderr) {
                return ko(error || stderr);
            }

            var usedPorts = [];
            stdout.split("\n").forEach(function (line) {
                var res = line.match(/tcp *[0-9]* *[0-9]* *([^\:]+)\:([0-9]+) *.*\:[^ ]+ *([A-Z]*)/);
                if (res) {
//                    console.log(res);
                    usedPorts.push({
                        address: res[1],
                        port: res[2],
                        status: res[3],
                    });
                }
            });


            var lo = lib.getLocalhost();
            usedPorts = usedPorts.filter(function(element, index, array) {
                return element.address === lo ||
                        element.address === 'localhost' ||
                        element.address === '0.0.0.0';
            });

//            logger.error(usedPorts);

            ok(usedPorts);

        });
    });
};

lib.getLocalhost = function () {

    return (function () {

        var os = require('os');
        var ifaces = os.networkInterfaces();
        var loopback = null;

        Object.keys(ifaces).forEach(function (ifname) {
            ifaces[ifname].forEach(function (iface) {

                if(loopback) return;

                if ('IPv4' !== iface.family || iface.internal !== false) {
                    loopback = iface;
                }
            });

        });

        return loopback.address;
    })();
};

/**
 * Get first free port
 *
 * @return {Promise}
 */
lib.getPort = function () {

    return lib.getUsedPort().then(function (ports) {

        lastPort++;
        while (ports[ lastPort ]) {
            lastPort++;
            if (lastPort > 65000) {
                return Promise.reject(new Error("Cannot allocate port " + lastPort));
            }
        }

        logger.debug("Selected port " + lastPort);
        return Promise.resolve(lastPort);
    });
};

/**
 * Check if an instance configuration exists
 *
 * @param {string} name instance name
 * @return {boolean}
 */
lib.exists = function (name) {
    return lib.config(name) !== null;
};


/**
 * Setup and start a new instance
 *
 * @param {string} name instance name
 * @param {object} config instance configurations
 *
 * @return {Promise}
 */
lib.create = function (name, config) {
    return lib.getPort().then(function (port) {

        if (typeof name === 'object') {
            config = name;
            name = config.name;
        }

        config = config || {};

        var uid = md5(name);
        var dir = instancesDir + '/' + uid;
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

        if (Object.keys(config).length) {
            for (var i in config) {
                instanceConfig[ i ] = config[i];
            }
        }

        // update ports
        instanceConfig.port = port;
        instanceConfig.settings.uiPort = port;

        return lib.start(instanceConfig);
    });
};

/**
 * Load an instance, creating it if not already available
 *
 * @param {string} name instance name
 * @param {object} config instance configurations
 *
 * @return {Promise}
 */
lib.load = function (name, config) {

    return new Promise(function (ok, ko) {

        if (typeof name === 'object') {
            config = name;
            name = config.name;
        }

        config = config || {};
        name = name || [(new Date).getTime(), Math.random((new Date).getTime())].join('');

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

/**
 * Store instances configurations
 *
 * @return {Promise}
 */
lib.persist = function () {
    return require("./storage").write(instancesCacheFile, JSON.stringify(lib.getInstances()));
};

/**
 * Reload previous instances based on stored configurations
 *
 * @return {Promise}
 */
lib.reload = function () {
    var storage = require('./storage');
    return storage.read(instancesCacheFile).then(function (raw) {

        var cachedInstances = JSON.parse(raw);

        var _keys = Object.keys(cachedInstances) || [];

        if (!_keys || !_keys.length) {
            return Promise.resolve();
        }

        return Promise.all(_keys).each(function (uid) {

            var instance = cachedInstances[ uid ];

            logger.info("Reloading previous instace %s", instance.name);
            return lib.load(instance.name, instance);
        });

    }).catch(function (e) {

        if(!(e instanceof storage.FileNotFoundError)) {
            logger.warn("Cannot reload previous state", e);
        }

        return Promise.resolve();
    });
};

/**
 * Kill an instance process
 *
 * @param {string} name instance name
 * @return {boolean} operation result
 */
lib.kill = function (name) {

    logger.info("Send kill sig to %s", name);

    try {

        if (processes[name]) {
            lib.options(name).respawn = false;
            processes[name].kill();
            delete processes[name];
        }

        return true;
    }
    catch (e) {
        logger.error(e);
        return false;
    }

};

/**
 * Remove an instance and kill its process
 *
 * @param {string} name instance name
 * @return {Promise}
 */
lib.remove = function (name) {
    return new Promise(function (ok, ko) {

        logger.info("Removing instance for %s", name);

        try {

            lib.kill(name);

            if (instances[ name ]) {

                logger.info("Removing %s", instances[ name ].dir);
                fs.remove(instances[ name ].dir, function () {

                    logger.info("Ok");
                    delete instances[ name ];

                    lib.persist().then(ok).catch(ko);
                });

            }
            else {
                ok();
            }

        }
        catch (e) {

            logger.error(e);
            ko(e);
        }

    });
};

lib.stop = function() {
    var _k = Object.keys(processes);
    _k && _k.forEach(lib.kill);
};

process.on('SIGINT', function () {
    lib.stop();
    process.exit();
});