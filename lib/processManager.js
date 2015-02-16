
var md5 = require('MD5'),
    config = require('../config').config,
    Promise = require('bluebird'),
    fs = require('fs'),
    child_process = require('child_process'),
    ncp = require('ncp').ncp

;

var lib = module.exports;

var instances = {};
var processes = {};

var red_path = __dirname + '/../node_modules/node-red';
var red_linkables = [ 'lib', 'node_modules', 'nodes', 'public', 'red' ];

var lastPort = config.basePort;

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

            return ok(lib.config(name));

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
                    usedPorts[ res[2] ] = 1;
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

lib.create = function(name) {

    return lib.getPort().then(function(port) {

        var uid = md5(name);
        var dir = __dirname + "/../instances/" + uid;
        var path = "red/" + uid;

        var settings = {

            uiPort: port,
            flowFile: "flow.json",

    //        userDir: dir,
            httpAdminRoot: path,
        };

        var instanceConfig = {
            name: name,
            uid: uid,
            port: port,
            path: path,
            dir: dir,
            settings: settings
        };

        return lib.start(instanceConfig);
    });
};

lib.load = function(name) {

    return new Promise(function(ok, ko) {

        try {

            if (!instances[name]) {
                console.log("New instance for " + name);
                return lib.create(name).then(ok).catch(ko);
            }

            console.log(name + " already exists!");
            ok(lib.config(name));
        }
        catch (e) {
            ko(e);
        }

    });
};