
var redzilla = require('../index')

before(function(done) {
    redzilla.start()
        .then(function () {
            done()
        })
        .catch(done)
})

after(function (done) {
    redzilla.stop()
        // .then(function() {
        //     return require('./lib/util').cleanup()
        // })
        .then(done)
        .catch(done)
})
