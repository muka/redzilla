
var redzilla = require('../index')

redzilla.start()
  .then(function() {
    return redzilla.getServerManager().app()
  })
  .then(function(app) {
    return redzilla.instances.start("demo")
  })
  .catch((e)=> {
    console.warn("Error", e);
  })
