var builder = require('xmlbuilder');
var redis = require('ioredis');
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




////////////////////////////////redis////////////////////////////////////////
var redisip = config.Redis.ip;
var redisport = config.Redis.port;
var redispass = config.Redis.password;
var redismode = config.Redis.mode;
var redisdb = config.Redis.db;

var redisClient = undefined;


//[redis:]//[user][:password@][host][:port][/db-number][?db=db-number[&password=bar[&option=value]]]
//redis://user:secret@localhost:6379
var redisSetting =  {
    port:redisport,
    host:redisip,
    family: 4,
    db: redisdb,
    password: redispass,
    retryStrategy: function (times) {
        var delay = Math.min(times * 50, 2000);
        return delay;
    },
    reconnectOnError: function (err) {

        return true;
    }
};

if(redismode == 'sentinel'){

    if(config.Redis.sentinels && config.Redis.sentinels.hosts && config.Redis.sentinels.port, config.Redis.sentinels.name){
        var sentinelHosts = config.Redis.sentinels.hosts.split(',');
        if(Array.isArray(sentinelHosts) && sentinelHosts.length > 2){
            var sentinelConnections = [];

            sentinelHosts.forEach(function(item){

                sentinelConnections.push({host: item, port:config.Redis.sentinels.port})

            })

            redisSetting = {
                sentinels:sentinelConnections,
                name: config.Redis.sentinels.name,
                password: redispass


            }

        }else{

            console.log("No enough sentinel servers found .........");
        }

    }
}

var redisClient = undefined;

if(redismode != "cluster") {
    redisClient = new redis(redisSetting);
}else{

    var redisHosts = redisip.split(",");
    if(Array.isArray(redisHosts)){


        redisSetting = [];
        redisHosts.forEach(function(item){
            redisSetting.push({
                host: item,
                port: redisport,
                family: 4,
                password: redispass});
        });

        var redisClient = new redis.Cluster([redisSetting]);

    }else{

        redisClient = new redis(redisSetting);
    }
}


//var redisClient = redis.createClient(config.Redis.port, config.Redis.ip);
redisClient.on('error', function (err) {
    console.log('Error '.red, err);
});

redisClient.on('connect', function () {
    console.log("Redis client connected ...");
});


server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());





server.post('/CallApp', function(req,res,next) {

    var data = undefined;
    try {
        data = convertUrlEncoded(req.body);
    }catch(ex){

    }

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
    // http://localhost/IVR/index.json
    //http://162.243.81.39/IVR/LassanaFloraIVR/start.php
    //http://162.243.81.39/IVR/demoIVR_2/index.php
    var uuid_data = { path: "http://localhost/DVP-HTTPProgrammingAPI/IVR/", app:'record.json',company: 3, tenant: 1, pbx: 'none', appid: '3', domain:'192.168.0.97', profile: 'default' };
    var redisData = JSON.stringify(uuid_data);
    redisClient.set(varUuid + "_data", redisData, function(err, value) {

        if(!err) {

            var doc = builder.create("document")
                .att("type", "freeswitch/xml")
                .ele("section").att("name", "dialplan").att("description", "RE Dial Plan For FreeSwitch")
                .ele("context").att("name", "default")
                .ele("extension").att("name", "test9")
                .ele("condition").att("field", "destination_number").att("expression", "[^\\s]*")
                .ele("action").att("application", "answer").up()
               // .ele("action").att("application", "multiset").att("data", "company=1 tenant=3 skill=123456").up()
                //.ele("action").att("application", "play_and_get_digits").att("data", "1 5 1 7000 # $${base_dir}/sounds/en/us/callie/conference/8000/conf-pin.wav /invalid.wav foobar \\S+").up()
               // .ele("action").att("application", "log").att("data", "CRIT ${foobar}").up()
               // .ele("action").att("application", "log").att("data", "CRIT ${read_result}").up()
               // .ele("action").att("application", "log").att("data", "CRIT ${read_terminator_used}").up()
                //.ele("action").att("application", "lua").att("data", "lua/AutoAttendant.lua 1 3 1111 Internal Internal").up()

                //.ele("action").att("application", "lua").att("data", "lua/VoicePortal.lua 1111 1 2 AVAILABLE 4 5 6 7").up()


/*
                <condition field="destination_number" expression="3">
            <action application="playback" data="foo.wav" />
            </condition>*/

                //.ele("action").att("application", "playback").att("data", "http://www.wavsource.com/snds_2016-03-13_7646817315637486/animals/bird_chirping2.wav").up()



             .ele("action").att("application", "httapi").att("data", "{url=http://127.0.0.1:8086}").up()
                //.ele("action").att("application", "socket").att("data", "127.0.0.1:8084 async full")
                //<action application="socket" data="127.0.0.1:8084 async full"/>
              .end({pretty: true});


        //<action application="multiset" data="effective_caller_id_name=FreeSwitch effective_caller_id_number=12345678"/>


            res.end(doc.toString());

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



server.listen(9093, '192.168.0.15', function () {
    console.log('%s listening at %s', server.name, server.url);
});