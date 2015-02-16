
require('./lib/server').app().then(function(app) {

    app.get('/', function (req, res) {

        var content = [];

        content.push("<p>Gimme a red</p><ul>");
        content.push("<li><a href='/Topolino' target='_blank'>Topolino</a></li>");
        content.push("<li><a href='/Pluto' target='_blank'>Pluto</a></li>");
        content.push("</ul>");

        res.send(content.join(''));
    });

    app.get('/:name', function (req, res) {

        var name = req.params.name;

        console.log("Requested " + name);

        var process = require('./lib/processManager');
        process.load(name).then(function(instance) {

            setTimeout(function() {

                var dest = "http://" + app.server.address().address + ":" + instance.port + "/" + instance.path;
                console.log("Redirecting to ", dest);

                res.setHeader('Location', dest);
                res.sendStatus(301);

            }, 1500);

        });

    });

});

