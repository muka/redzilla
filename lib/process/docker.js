
var Docker = require('dockerode'),
    _config = require('../config'),
    storage = require('../storage'),
    Promise = require('bluebird'),
    fs = require('fs-extra'),
    logger = require('../logger'),
    path = require('path'),
    _ = require('underscore')
    ;

var lib = module.exports;

var instances = {};
var options = {};
var processes = {};

var getConfig = function() {
    return _config.config.docker || {};
};

var red_path = function() {
    return path.resolve(__dirname + '/../../node_modules/node-red');
};

var instancesDir = function() {
    return config.localhost.instancesDir || path.resolve(__dirname + "/../../instances");
}

var instancesCacheFile = function() {
    return storage.read("cache");
};

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
            lib.setup(config.dir, config.settings);
        }
        catch (e) {
            
            logger.error("Setup error");
            logger.error(e);
            
            return ko(e);
        }

        logger.info("Process info", instances[ name ]);

        try {
            
            var docker = new Docker({
                socketPath: getConfig().socketPath
            });
            
            var volumes = _.extend({
                '/nodes': {},
                '/flows.json': {}
            }, getConfig().volumes || {});
            
            var flowFile = path.resolve(getConfig().flowsDir + "/flows.json");
            var nodesDir = path.resolve(red_path() + "/nodes");
            
            var processLogger = logger.instance(name);
            
            docker.createContainer({
                Image: getConfig().image,
                Cmd: ['node', 'red'],
                "Volumes": volumes
            }, function(err, container) {
                
                if(err) {
                    processLogger.error(err);
                    return ko(err);
                }                
                
                container.attach({
                  stream: true,
                  stdout: true,
                  stderr: true,
                  tty: true
                }, function(err, stream) {
                    
                    if(err) {
                        processLogger.error(err);
                        return ko(err);
                    }
                    
                    stream.pipe(process.stdout);

                    container.start({
                        Binds: [
                          flowFile + ":/flows.json",
                          nodesDir + ":/nodes",
                        ]
                    }, function(err, data) {
                        
                        if(err) {
                            processLogger.error(err);
                            return ko(err);
                        }                        
                        
                        processes[ name ] = container;
                        
                        processLogger.info(data);
                        
                        return lib.persist().finally(function () {
                            return ok(lib.config(name));
                        });

                    });
                });
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
    return lib.getPort().then(function (port) {

        if (typeof name === 'object') {
            config = name;
            name = config.name;
        }
        
        var basePath = "";
        
        config = config || {};

        var uid = md5(name);
        var dir = path.resolve(instancesDir() + '/' + uid);

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
    return require("../storage").write(instancesCacheFile(), JSON.stringify(lib.getInstances()));
};

/**
 * Reload previous instances based on stored configurations
 *
 * @return {Promise}
 */
lib.reload = function () {
    var storage = require('../storage');
    return storage.read(instancesCacheFile()).then(function (raw) {

        var cachedInstances = JSON.parse(raw);

        var _keys = Object.keys(cachedInstances) || [];

        if (!_keys || !_keys.length) {
            return Promise.resolve();
        }

        return Promise.all(_keys).each(function (uid) {
            
            logger.debug("Loading uid " + uid);
            
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
    process.exit(0);
});