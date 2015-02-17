
var serverManager = require('./lib/serverManager');

serverManager.app().then(function(app) {

    app.get('/', function (req, res) {

        var content = [];

        content.push("<p>Gimme a red</p><ul>");
        content.push("<li><a href='/Topolino' target='_blank'>Topolino</a></li>");
        content.push("<li><a href='/Pluto' target='_blank'>Pluto</a></li>");
        content.push("</ul>");

        res.send(content.join(''));
    });

});
