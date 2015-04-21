
var Docker = require('dockerode'),
    md5 = require('MD5'),
    _config = require('../config'),
    storage = require('../storage'),
    Promise = require('bluebird'),
    fs = require('fs-extra'),
    logger = require('../logger'),
    path = require('path'),
    _ = require('lodash'),
    child_process = require('child_process'),
    util = require('../util')
;

var lib = module.exports;

var instances = {};
var options = {};
var processes = {};

var getConfig = function() {
    return _config.config.docker || {};
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

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, 0777);
    }

    var flowFile = dir + "/flow.json";
    if (!fs.existsSync(flowFile)) {
        fs.writeFileSync(flowFile, "[]");
    }

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

            logger.debug("Connecting to docker socket " + getConfig().socketPath);
            var docker = new Docker({
                socketPath: getConfig().socketPath
            });


            var volumes = {};

            var userDir = path.resolve(_config.getInstancesDir() + "/" + config.uid);
            var nodesDir = path.resolve(_config.getNodesDir());

            var mountPoints = {
                userDir: userDir,
                nodesDir: nodesDir, // @TODO review this!
//                flowFile: path.resolve(userDir + "/flow.json"),
                settingsFile: path.resolve(userDir + "/settings.js")
            };

            var _binds = [];

            Object.keys(getConfig().volumes).forEach(function(_key) {

                volumes[ getConfig().volumes[_key] ] = {};

                _binds.push(
                    [ mountPoints[_key], getConfig().volumes[_key] ].join(':')
                );

            });

            var processLogger = logger.instance(name);

            logger.debug("Starting `" + name + "`");
            processLogger.debug("Creating container, image " + getConfig().image);

            docker.createContainer({
                Image: getConfig().image,
                Cmd: ['node', 'red'],
                Volumes: volumes,
                ExposedPorts: {
                    "1880/tcp": {},
                    "1880/udp": {}
                }
            }, function(err, container) {

                if(err) {
                    logger.error("Error creating container!");
                    logger.error(err);
                    return ko(err);
                }

                processLogger.debug("Attaching container");

                container.attach({
                  stream: true,
                  stdout: true,
                  stderr: true,
                  tty: true
                }, function(err, stream) {

                    if(err) {
                        logger.error("Error attaching to container!");
                        logger.error(err);
                        return ko(err);
                    }

//                    stream.pipe(process.stdout);
                    stream.on('data', function(raw) {
                        processLogger.debug(raw.toString().replace("\n", ""));
                    });

                    processLogger.debug("Volume binding:");
                    processLogger.debug(_binds);

                    container.start({
                        Binds: _binds,
                        PortBindings: {
                            "1880/tcp": [
                                { "HostPort": config.port.toString() }
                            ],
                            "1880/udp": [
                                { "HostPort": config.port.toString() }
                            ]
                        },
                    }, function(err, data) {

                        if(err) {
                            logger.error("Error starting container!");
                            logger.error(err);
                            return ko(err);
                        }

                        processes[ name ] = container;

                        processLogger.debug("Done!");
                        processLogger.debug(data.toString());

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
 * Setup and start a new instance
 *
 * @param {string} name instance name
 * @param {object} config instance configurations
 *
 * @return {Promise}
 */
lib.create = function (name, config) {
    return util.getPort().then(function(port) {

        if (typeof name === 'object') {
            config = name;
            name = config.name;
        }

        var basePath = "";
        var uid = md5(name);
        var dir = path.resolve(_config.getInstancesDir() + '/' + uid);

        config = config || {};

        var settings = {

//            uiPort: port,

            flowFile: "flow.json",
            flowFilePretty: true,

    //            adminRoot: basePath,

            httpRoot: basePath,

            userDir: getConfig().volumes.userDir,
//            nodesDir: getConfig().volumes.nodesDir,

            // no ui
            // httpAdminRoot: false
        };

        var instanceConfig = {
            name: name,
            uid: uid,
            port: port,
            path: basePath,
            dir: dir,
            settings: settings
        };


        _.merge(instanceConfig, config);


        logger.debug("Instance config");
        logger.debug(instanceConfig);

//        if (Object.keys(config).length) {
//            for (var i in config) {
//                instanceConfig[ i ] = config[i];
//            }
//        }

        // update ports
        instanceConfig.port = port;
//        instanceConfig.settings.uiPort = port;

        return lib.start(instanceConfig);
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
 * Get instance status
 *
 * @param {string} name instance name
 * @return {Promise}
 */
lib.status = function (name) {
    return new Promise(function(ok, ko) {

        if(!lib.exists(name)) {
            return ko(new Error("Instance does not exists"));
        }

        lib.process(name).inspect(function(err, res) {
            if(err) return ko(err);
            return ok(res);
        });

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
            logger.warn("load error", e);
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
    return new Promise(function(ok, ko) {

        logger.info("Stopping container %s", name);

        if (processes[name]) {

            lib.options(name).respawn = false;

            processes[name].stop(function(err, res) {

                if(err) {
                    logger.warn("Error killing " + name);
                    return ko(err);
                }

                delete processes[name];
                ok(res);
            });

        }
        else return ok();

    });
};

/**
 * Destroy a container
 *
 * @param {string} name instance name
 * @return {Promise}
 */
lib.destroy = function (name) {
    return new Promise(function (ok, ko) {

        logger.info("Destroy instance %s", name);

        try {

            var container = instances[ name ];
            if (container) {

                logger.info("Removing %s", name);
                container.remove(function (err, res) {

                    if(err) {
                        logger.error(err);
                        return ko(err);
                    }

                    logger.info("Ok");
                    ok();
                });

            }
            else return ok();

        }
        catch (e) {

            logger.error(e);
            ko(e);
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

        try {

            lib.stop(name).then(function() {

                if (instances[ name ]) {

                    logger.info("Removing %s", instances[ name ].dir);
                    fs.remove(instances[ name ].dir, function () {

                        logger.info("Ok");
                        delete instances[ name ];

                        lib.persist().then(ok).catch(ko);
                    });

                }
                else return ok();

            }).catch(ko);
        }
        catch (e) {

            logger.error(e);
            ko(e);
        }

    });
};



lib.stop = function(name, opts) {

    opts = opts || { destroy: true };

    var _complete = function(container) {

        if(container && opts.destroy) {
            logger.debug("Destroying container for " + name);
            return lib.destroy(container);
        }

        return Promise.resolve();
    };

    var stopInstance = function(_name) {
        logger.debug("Stopping " + _name);
        var _container = processes[_name];
        return lib.kill(_name).then(function() {
            return _complete(_container);
        });
    };

    if(name) {
        return stopInstance(name);
    }

    var _k = Object.keys(processes);
    logger.debug("Stopping %s instances", _k.length);
    return Promise.all(_k).each(stopInstance);
};
