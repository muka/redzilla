
require('../init')

var redzilla = require('../../index')
var util = require('../lib/util')
var rp = require('request-promise')

describe('process.localhost', function () {
    describe('create', function () {
        it('should create a new instance', function (done) {

            redzilla.instances.create("test").then(function(instance) {
                done()
            })
            .catch(done)

        })
        it('should start a new instance', function (done) {

            var instance = redzilla.instances.get("test")
            return instance.start()
                .then(function() {
                    done()
                })
                .catch(done)

        })
        it('should stop an instance', function (done) {

            var instance = redzilla.instances.get("test")
            return instance.stop()
                .then(function() {
                    done()
                })
                .catch(done)

        })
        it('should restart an instance', function (done) {

            var instance = redzilla.instances.get("test")
            return instance.stop()
                .then(function() {
                    done()
                })
                .catch(done)

        })
        // it('should remove an instance', function (done) {
        //
        //     var instance = redzilla.instances.get("test")
        //     return instance.remove()
        //         .then(function() {
        //             done()
        //         })
        //         .catch(done)
        //
        // })
    })
})
