
let redzilla = require('../index')
let logger = require('../lib/logger')

redzilla.start()
  .then(function() {
    return redzilla.instances.start('demo')
  })
  .catch((e)=> {
    logger.error('An error occured: %j', e)
    return redzilla.stop().finally(process.exit)
  })
