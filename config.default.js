/**
 * redzilla default configuration
 */
module.exports = {


  /**
   * Process manager options
   *
   * Select the process manager which will handle the node-red instances.
   * The process value must match the name of the handler and its configuration key.
   */
  'process': 'docker',

  // matches docker process manager
  'docker': {
    // path to the docker socket, must be accessible by the running user
    'socketPath': '/var/run/docker.sock',
    // the image to use to spawn instances from.
    // Important: If a tag is not specified, latest is assumed
    'image': 'nodered/node-red-docker:latest',
    // Memory limit in MB
    'memoryLimit': 120,
    //Network mode to bind to
    // create a new one with `docker network create redzilla`
    'network': 'redzilla',
    //force the container to be recreated every time
    'alwaysRecreate': true,
    // volume matches
    'volumes': {
      'nodesDir': '/nodes',
      'userDir': '/user',
      'settingsFile': '/settings.js'
    }
  },

  // @deprecated
  // "localhost": {
  //     "node_src": "./node-red",
  //     "bindHost": "127.0.1.1"
  // }

  /**
   * Logging options
   *
   * Enable development mode
   */
  'debug': true,

  /**
   * Console logging settings
   */
  'consoleLog': true,
  'consoleLogLevel': 'silly',

  /**
   * File logging settings
   */
  'fileLog': true,
  'fileLogLevel': 'info',
  'fileLogPath': null,

  'baseUrl': null,
  'host': {
    'port': 3000,
    'ip': '127.0.0.1'
  },

  /**
   * Create new instances on request otherwise instances must be created
   * programmatically from the API
   */
  'createOnRequest': true,

  /**
   * Secret hash to use as seed for random generation, ensure to change to
   * something different and pretty long
   */
  'hash': 'change to a very secret hash',

  /**
   * Authentication options
   *
   * Set the type of authentication required to access an instance for an user
   * Currently available is just `none` and `basic`
   */
  'auth': 'none',

  /**
   * administration API access credentials
   */
  'admin': {
    'user': 'admin',
    'pass': 'admin'
  },

  /**
   * Each instance will be mapped to a port starting from the one specified
   * here as default and incremented
   */
  'basePort': 14002,

  /**
   * Storage options
   *
   * Define the type of storage backend. Currently only `file` based storage is available.
   */
  'storage': 'file',
  'file': {
    /**
     * Local directory where to store instances configurations (aka node-red userdir)
     */
    'instancesDir': './instances',
    /**
     * Custom-node directory
     */
    'nodesDir': './custom-nodes',
    /**
     * Index file to store instances informations
     */
    'cacheFileName': 'cache.json',
  },

  /**
   * Enable node-red GUI
   */
  'userEnableHttp': true,
  /**
   * Base url for node-red GUIto which attach the user instance id
   */
  'userPathPrefix': '/red',
  /**
   * Enable instances admin HTTP API
   */
  'adminEnableHttp': true,
  /**
   * Base path for the admin HTTP API
   */
  'adminPathPrefix': '/admin',

  /**
   * Customize the order and visibility of the node-red palette
   */
  'paletteCategories': ['subflows', 'input', 'output', 'function', 'social', 'storage', 'analysis', 'advanced'],


}
