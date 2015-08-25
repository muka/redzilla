
var md5 = require('md5'),
        _config = require('../config'),
        Promise = require('bluebird'),
        fs = require('fs-extra'),
        child_process = require('child_process'),
        ncp = require('ncp').ncp,
        logger = require('../logger'),
        path = require('path'),
        util = require('../util')
        ;

var lib = module.exports;

var instances = {};
var options = {};
var processes = {};

var red_linkables = [
    'node_modules', 
    'nodes', 
    'public', 
    'red'
];

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

        var src = path.resolve(_config.getRedPath() + "/" + filename + "/");
        var dest = path.resolve(dir + "/" + filename + "/");
        
        var srcExists = fs.existsSync(src);
        if(!srcExists) {
            logger.warn("Cannot link "+ src +":does not exists");
            return;
        }

        try {
            fs.readlinkSync(dest);
            return true;
        }
        catch(e) {}
        
        logger.debug("Symlink " + src + " -> " + dest);
        fs.symlinkSync(src, dest);
        
    });

    // copy module only
    ncp(path.resolve(_config.getRedPath() + "/red.js"), path.resolve(dir + "/red.js"));

    require('../settings').saveSettingsFile(dir, settings);
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
            
            logger.error("Setup error");
            logger.error(e);
            
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
    return util.getPort().then(function (port) {

        if (typeof name === 'object') {
            config = name;
            name = config.name;
        }
        
        var basePath = "";
        
        config = config || {};

        var uid = md5(name);
        var dir = path.resolve(_config.getInstancesDir() + '/' + uid);

        var settings = {
            uiPort: port,
            flowFile: "flow.json",
            flowFilePretty: true,
//            adminRoot: basePath,
            httpRoot: basePath,
            userDir: dir,            
//            httpAdminRoot: false
        };

        var instanceConfig = {
            name: name,
            uid: uid,
            port: port,
            path: basePath,
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
    return require("../storage").write(_config.getInstancesCacheFile(), JSON.stringify(lib.getInstances()));
};

/**
 * Reload previous instances based on stored configurations
 *
 * @return {Promise}
 */
lib.reload = function () {
    var storage = require('../storage');
    return storage.read(_config.getInstancesCacheFile()).then(function (raw) {

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
            logger.error(e);            
            logger.warn("Cannot reload previous state");
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
    
    return new Promise(function(ok, ko) {
        
        logger.info("Send kill sig to %s", name);

        try {

            if (processes[name]) {
                lib.options(name).respawn = false;
                processes[name].kill();
                delete processes[name];
            }

            return ok();
        }
        catch (e) {
            logger.error(e);
            return ko(e);
        }
        
    });
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

        lib .kill(name)
            .then(function() {

            try {

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
            
        })
        .catch(ko);

    });
};


lib.stop = function(name, opts) {
    
    opts = opts || { destroy: true };
    
    var _complete = function(_name) {
        if(opts.destroy) {
            return lib.destroy(_name);
        }
        return Promise.resolve();
    };
    
    if(name) {
        return lib.kill(name).then(_complete);
    }
    
    var _k = Object.keys(processes);
    return Promise.all(_k).each(lib.kill).then(function() {

        if(!opts.destroy) {
            return Promise.resolve();
        }        

        return Promise.all(_k).each(lib.destroy);
    });
};

lib.status = function(name) {
    return Promise.reject(new Error("localhost.status is not implemented!"));
};
