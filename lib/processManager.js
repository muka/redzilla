
var md5 = require('MD5'),
    config = require('../config').config,
    Promise = require('bluebird'),
    fs = require('fs-extra'),
    child_process = require('child_process'),
    ncp = require('ncp').ncp

;

var lib = module.exports;

var instances = {};
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

        console.log("Process info", instances[ name ]);

        try {

            var process = child_process.spawn('node', ["red"], {
                'cwd': config.dir
            });
            processes[ name ] = process;

            process.stdout.on('data', function (data) {
                console.log("\t%s (stdout): \n%s", name, data);
            });

            process.stderr.on('data', function (data) {
                console.warn("\t%s (stderr): \n%s", name, data);
            });

            process.on('exit', function() {

                console.error("\t%s (EXIT): \n%s", name, "Process died, respawning");

                var config = instances[ name ];

                if(config.timeout) {
                    return;
                }

                config.timeout = setTimeout(function() {

                    config.timeout = null;
                    config.respawn = config.respawn === undefined ? new Date : config.respawn;

                    instances[ name ] = processes[name] = null;

                    lib.start(config);

                    console.log("Restarted");

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
                console.log("New instance for " + name);
                return lib.create(name, config).then(ok).catch(ko);
            }

            console.log(name + " already exists!");
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

            console.log("Reloading previous instace %s", instance.name);
            return lib.load(instance.name, instance);
        });

    }).catch(function(e) {
        console.error("Cannot reload due to error", e);
        return Promise.resolve();
    });
};

lib.kill = function(name) {

    console.log("Send kill sig to %s", name);

    try {

        if(processes[name]) {
            processes[name].kill();
            delete processes[name];
        }

    }
    catch(e) {

        console.error(e);
    }

};

lib.remove = function(name) {
    return new Promise(function(ok, ko) {

        console.log("Removing instance for %s", name);

        try {

            lib.kill(name);

            if(instances[ name ]) {

                console.log("Removing %s", instances[ name ].dir);
                fs.remove(instances[ name ].dir, function() {

                    console.log("Ok");
                    delete instances[ name ];

                    lib.persist().then(ok).catch(ko);
                });

            }
            else {
                ok();
            }

        }
        catch(e) {

            console.error(e);
            ko(e);
        }

    });
};