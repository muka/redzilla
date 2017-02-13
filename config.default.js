module.exports = {

    "baseUrl": null,
    "host": {
        "port": 3000,
        "ip": "127.0.0.1"
    },

    "debug": true,

    "consoleLog": true,
    "consoleLogLevel": "silly",

    "fileLog": true,
    "fileLogLevel": "info",
    "fileLogPath": null,

    "createOnRequest": true,
    "hash": "change to a very secret hash",

    "auth": "none",
    "admin": {
        "user": "admin",
        "pass": "admin"
    },

    "basePort": 3002,

    "storage": "file",
    "instancesDir": "./instances",
    "nodesDir": "./custom-nodes",

    "cacheFileName": "cache.json",

    "userPathPrefix": "/red",
    "adminPathPrefix": "/admin",
    "adminEnableHttp": true,
    "userEnableHttp": true,

    "paletteCategories": [ "subflows", "input", "output", "function", "social", "storage", "analysis", "advanced" ],

    /**
     * Select the process manager which will handle the node-red instances.
     * The process value must match the name of the handler and its configuration key.
     */
    "process": "docker",

    // matches docker process manager
    "docker": {
        // path to the docker socket, must be accessible by the running user
        "socketPath": "/var/run/docker.sock",
        // the image to use to spawn instances from
        "image": "nodered/node-red-docker",
        // volume matches
        "volumes": {
            "nodesDir": "/nodes",
            "userDir": "/user",
            "settingsFile": "/node-red/settings.js"
        }
    },

    // @deprecated
    // "localhost": {
    //     "node_src": "./node-red",
    //     "bindHost": "127.0.1.1"
    // }



}
