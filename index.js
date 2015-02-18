
require('./redzilla').start(function(app) {

    var config = require('./config');

    // from http://listofrandomwords.com/index.cfm?blist
    var words = ["nonselective","unmarkable","fossilizing","diathermy","nonenclosure","lechuguilla","reconditeness","hematoblast","aviated","kissableness","vojvodina","ejaculate","cannulation","leeuwarden","puberulous","anticlockwise","nonendorsement","collusively","preundertake","tracheitis","dependently","camelopard","uncircular","nondivergence","pyrotoxin","procivilian","inspiriter","cancerously","nonerratic","substantially","euryphagous","totipotent","rehoboam","bahamian","huntingdonshire","endophasia","dietician","marcantonio","nitrogenous","mendaciously","opportuneness","planography","nonbelieving","tyrannical","containerise","exoteric","conjurator","hammurapi","noneloquence","superintense","formulistic","phosphatising","dysentery","nazimova","subzonary","reharmonize","eluvium","nonreflective","undesiring","verticity","theoretics","telepathize","stipulated","dependency","masquerading","adultery","desquamating","essentialize","manageress","lumbosacral","bodhisattva","unmonogrammed","herbivorous","liquidity","preoutlining","postscutellum","elongating","jovianly","absinthism","ischiadic","brutality","overexpress","annotator","unwakening","dichogamous","nebulously","overcolor","spasmodical","deprecator","nutritiveness","precontemplate","uncheckmated","undemanding","federative","horoscopy","melaleuca","hypocorism","hydrocarbon","reassuming","bacterizing"]

    var len = 15, i = 0;
    var rndInstances = [];
    while(rndInstances.length < len) {
        var el;
        if(el = words[Math.floor(Math.random() * words.length)]) {
            rndInstances.push(el);
        }
    }

    app.get('/', function (req, res) {

        var content = [];

        content.push("<p>Gimme a red</p><ul>");

        rndInstances.forEach(function(word) {
            content.push("<li><a href='"+ config.get('adminPathPrefix', '/admin') +"/create/"+ word +"' target='_blank'>"+ word +"</a></li>");
        });

        content.push("</ul>");

        res.send(content.join(''));
    });


});