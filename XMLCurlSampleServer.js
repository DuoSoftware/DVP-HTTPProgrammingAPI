var builder = require('xmlbuilder');
var redis = require('redis');
var config = require('config');

/*
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<document type="freeswitch/xml">
<section name="dialplan" description="RE Dial Plan For FreeSwitch">
<context name="default">
<extension name="test9">
<condition field="destination_number" expression="^83789$">
 <action application="httapi" data="{url=http://some.host.com/app.cgi}"/>
</condition>
</extension>
</context>
</section>
</document>
*/



var restify = require('restify');
var format = require("stringformat");

var server = restify.createServer({
    name: 'localhost',
    version: '1.0.0',
    formatters : {
        'application/x-www-form-urlencoded' : function(req, res, body)
        {
            return body;
        }
    }
});


var redisClient = redis.createClient(config.Redis.port, config.Redis.ip);
redisClient.on('error', function (err) {
    console.log('Error '.red, err);
});




server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());





server.post('/CallApp', function(req,res,next) {

    var data = convertUrlEncoded(req.body);

    var hostname = data["hostname"];
    var cdnum = data["Caller-Destination-Number"];
    var callerContext = data["Caller-Context"];
    var huntDestNum = data["Hunt-Destination-Number"];
    var huntContext = data["Hunt-Context"];
    var varDomain = data["variable_domain"];
    var varUserId = data["variable_user_id"];
    var profile = data["variable_sofia_profile_name"];
    var varUuid = data["variable_uuid"];
    var varSipFromUri = data["variable_sip_from_uri"];
    var varSipToUri = data["variable_sip_to_uri"];
    var varUsrContext = data["variable_user_context"];
    var varFromNumber = data["variable_FromNumber"];


    //app: 'call'
    // "http://45.55.179.9/DVP-Demo/done/start.php
    // "http://localhost/ivr/index.json"
    var uuid_data = { path: "http://localhost/ivr/index.json", company: 1, tenent: 3, pbx: 'none', appid: '6', domain:'192.168.8.100', profile: 'default' };
    var redisData = JSON.stringify(uuid_data);
    redisClient.set(varUuid + "_data", redisData, function(err, value) {

        if(!err) {

            var doc = builder.create("document")
                .att("type", "freeswitch/xml")
                .ele("section").att("name", "dialplan").att("description", "RE Dial Plan For FreeSwitch")
                .ele("context").att("name", "public")
                .ele("extension").att("name", "test9")
                .ele("condition").att("field", "destination_number").att("expression", "[^\\s]*")
                .ele("action").att("application", "answer").up()
               // .ele("action").att("application", "multiset").att("data", "company=1 tenant=3 skill=123456").up()
                //.ele("action").att("application", "play_and_get_digits").att("data", "1 5 1 7000 # $${base_dir}/sounds/en/us/callie/conference/8000/conf-pin.wav /invalid.wav foobar \\S+").up()
               // .ele("action").att("application", "log").att("data", "CRIT ${foobar}").up()
               // .ele("action").att("application", "log").att("data", "CRIT ${read_result}").up()
               // .ele("action").att("application", "log").att("data", "CRIT ${read_terminator_used}").up()
                //.ele("action").att("application", "lua").att("data", "lua/AutoAttendant.lua 1 3 1111 Internal Internal").up()


/*
                <condition field="destination_number" expression="3">
            <action application="playback" data="foo.wav" />
            </condition>*/




             .ele("action").att("application", "httapi").att("data", "{url=http://127.0.0.1:8086}").up()
                //.ele("action").att("application", "socket").att("data", "127.0.0.1:8084 async full")
                //<action application="socket" data="127.0.0.1:8084 async full"/>
                .end({pretty: true});


        //<action application="multiset" data="effective_caller_id_name=FreeSwitch effective_caller_id_number=12345678"/>


            res.end(doc);

            console.log(doc)
        }
    });


    return next();
});


var convertUrlEncoded = function(payload){
    var keyValArr = payload.split('&');
    var obj = {};
    for(var i = 0; i < keyValArr.length; i++)
    {
        var bits = keyValArr[i].split('=');
        obj[bits[0]] = bits[1];
    }

    return obj;
};



server.listen(9093, '127.0.0.1', function () {
    console.log('%s listening at %s', server.name, server.url);
});