var restify = require('restify');
var fs = require('fs');
var url = require('url');
var messageGenerator = require('./MessageGenerator.js');
var config = require('config');
var colors = require('colors');
var http = require('http');
var redis = require('ioredis');
var request = require('request');
var FormData = require('form-data');
var util = require('util');
var Regex = require("regex");
var format = require("stringformat");
var uuid = require('node-uuid');
var validator = require('validator');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var PublishDVPEventsMessage = require("./DVPEventPublisher").PublishDVPEventsMessage;
var healthcheck = require('dvp-healthcheck/DBHealthChecker');
var convert = require('xml-js');


//console.log(messageGenerator.ARDS("XXXX","XXXXX","123","1","3"));


var mainServer = format("http://{0}", config.LBServer.ip);

if(validator.isIP(config.LBServer.ip))
    mainServer = format("http://{0}:{1}", config.LBServer.ip, config.LBServer.port);

//var mainServer = config.LBServer.path;

var _appToken = config.Host.apptoken || config.Host.token;
var appToken = format("Bearer {0}",_appToken);
var token = format("Bearer {0}",config.Host.token);


////////////////////////////////redis////////////////////////////////////////
var redisip = config.Redis.ip;
var redisport = config.Redis.port;
var redispass = config.Redis.password;
var redismode = config.Redis.mode;
var redisdb = config.Redis.db;


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

    if(config.Redis.sentinels && config.Redis.sentinels.hosts && config.Redis.sentinels.port && config.Redis.sentinels.name){
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

redisClient.on('error', function (err) {
    console.log('Error '.red, err);
});


redisClient.on('connect', function () {
    console.log("Redis client connected ...");
});

redisClient.on('reconnecting', function () {
    console.log("Redis client reconnecting ...");
});


//redisClient.auth(redispass, function (error) {
//    console.log("Error Redis : " + error);
//});
////////////////////////////////////////////////////////////////////////////////


////////////////////////////////rest server///////////////////////////////////////////////////////////////////////////
var server = restify.createServer();
server.use(restify.fullResponse()).use(restify.bodyParser());
server.listen(config.HTTPServer.port);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var hc = new healthcheck(server, {redis: redisClient});
hc.Initiate();

var httpPOST = function (custumerData, section, data) {
    
    //http://192.168.0.60/CSRequestWebApi/api/
    var post_domain = custumerData.domain;
    var post_port = custumerData.port;
    var post_path = custumerData.path;
    
    //var post_data = querystring.stringify({  
    //  'your' : 'post',  
    //  'data': JSON.stringify( data )
    //});  
    
    var post_data = JSON.stringify(data);
    var post_options = {
        host: post_domain,  
        port: post_port,  
        path: post_path,  
        method: 'POST',  
        headers: {
            'Content-Type': 'application/json',  
            'Content-Length': post_data.length
        }
    };
    
    var post_req = http.request(post_options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('Response: ' + chunk);
        });
    });
    
    // write parameters to post body  
    post_req.write(post_data);
    post_req.end();


};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function postData(req, res) {
    //fs.createReadStream('file.json').pipe(request.put('http://mysite.com/obj.json'))


    logger.debug("Post voicemail recived");

    
    redisClient.get(req.body["session_id"] + "_dev", function (err, sessiondata) {
        
        var uuid_data;
        if (err) {

            logger.Error("Error on get session ",err);

        }
        else {
            
            
            uuid_data = JSON.parse(sessiondata);
            //var body = { session: req.body["session_id"], direction: req.body["Caller-Direction"], ani: req.body["Caller-Caller-ID-Number"], dnis: req.body["Caller-Destination-Number"], name: req.body["Caller-Caller-ID-Name"], result: "uploaded" };


            /////////////upload to system location///////////////////////////////////////////

            try {

                if(config.Services && config.Services.uploadurl  && config.Services.uploadport) {


                     var urloadurl = format("http://{0}/DVP/API/{1}/FileService/File/Upload", config.Services.uploadurl,config.Services.uploadurlVersion);


                     if(validator.isIP(config.Services.uploadurl))
                     urloadurl = format("http://{0}:{1}/DVP/API/{2}/FileService/File/Upload", config.Services.uploadurl,config.Services.uploadport,config.Services.uploadurlVersion);


                    logger.debug("File Upload to " + urloadurl);

                    //console.log(req.files);
                    console.log(req.files.result["path"]);

                     var FormData = {
                     sessionid: req.body["session_id"],
                     file: fs.createReadStream(req.files.result["path"]),
                     filename: req.body["session_id"]+".mp3",
                     display: req.files.result["name"],
                     class: "CALLSERVER",
                     type:"CALL",
                     category:"VOICEMAIL",
                     referenceid:req.body["session_id"],
                     mediatype:"audio",
                     filetype:"mp3"}

                    var fileID = format("http://{0}/DVP/API/{1}/InternalFileService/File/DownloadLatest/{2}/{3}/{4}", config.Services.downloadurl, config.Services.downloaddurlVersion, uuid_data["tenant"], uuid_data["company"], FormData.filename);



                    if(req.body){
                        logger.debug(req.body);
                    }

                    if(req.body && req.body["Caller-Caller-ID-Number"] && req.body["Caller-Destination-Number"]){

                        FormData["display"] = req.body["Caller-Caller-ID-Number"] + " - " +req.body["Caller-Destination-Number"];
                    }

                     var r = request.post({url:urloadurl,formData: FormData, headers: {'authorization': token, 'companyinfo': format("{0}:{1}",uuid_data["tenant"],uuid_data["company"])}}, function(error, response, body){
                         if(err){
                            logger.error("File upload error", err);
                         }else {

                             //logger.debug(response);
                             if (response) {

                                 logger.debug("Response recived", response.body);
                                 response.body = JSON.parse(response.body);
                                 logger.debug("Response recived", response.body["IsSuccess"]);
                                 if (response.body["IsSuccess"]) {


                                     if (req.body && req.body["Caller-Caller-ID-Number"] && req.body["Caller-Destination-Number"] && req.body["Caller-Direction"] && req.body["session_id"]) {

                                         //FormData["display"] = req.body["Caller-Caller-ID-Number"] + " - " +req.body["Caller-Destination-Number"];

                                         try {


                                             var voicemailData = {
                                                 type: "question",
                                                 subject: "Voice mail from " + req.body["Caller-Caller-ID-Number"],
                                                 description: "Voicemail " + fileID,
                                                 priority: "high"

                                             };

                                             CreateTicket("voicemail", req.body["session_id"], uuid_data["company"], uuid_data["tenant"], voicemailData["type"], voicemailData["subject"], voicemailData["description"], voicemailData["priority"], voicemailData["tags"],undefined, function (success, result) {

                                                 if (success) {

                                                     logger.debug("Create ticket success", result);
                                                 } else {
                                                     logger.debug("Create ticket failed");
                                                 }
                                             });


                                         } catch (ex) {
                                             logger.error(ex);
                                         }
                                     } else {

                                         logger.error("Create engagement no necessary data found ....");
                                     }
                                 } else {

                                     logger.error("Upload failed .....");
                                 }
                             }
                         }

                     });
                    PublishDVPEventsMessage("FILEUPLOADED",{Type: 'FILE', DisplayName: req.files.result["name"], SessionID: req.body["session_id"], APPID: uuid_data["appid"], Description: '', SessionID: req.body["session_id"]  });

                }else{

                    logger.debug("Upload url is not configured");
                }

            }catch(ex){

                logger.error("Error occured ",ex);
            }
        }
    });

};


function Operation(callData, fileID, mainServer, queryData, res, domain, profile, ip, port){

    res.writeHead(200, {"Content-Type": "text/xml"});


    switch (callData["action"]) {

        case "play":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];

            res.write(messageGenerator.Playback(fileID, mainServer, mainServer, callData["result"], callData["errorfile"], callData["digittimeout"],
                callData["inputtimeout"], callData["loops"], callData["terminator"], callData["strip"],
                callData["digits"], maxdigits,
                callData["asrEngine"], callData["asrGrammar"]));



            break;


        case "playandgetdigits":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];

            var error = './invalid.wav';
            if (callData["errorfile"])
                error = callData["errorfile"];


            res.write(messageGenerator.PlayAndGetDigits(fileID, mainServer, mainServer, callData["result"], error,
                callData["digittimeout"], callData["inputtimeout"], callData["loops"], callData["terminator"],
                callData["strip"], callData["digits"], maxdigits));

            break;


        case "playanddetectspeech":

            res.write(messageGenerator.PlayAndDetectSpeech(callData["text"], mainServer, mainServer, callData["inputtimeout"],
                callData["timeout"], callData["asrGrammar"], callData["asrEngine"], callData["language"],callData["ttsEngine"],callData["ttsVoice"]));

            break;

        case "record":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];
            //file, actionURL,tempURL, paramName, errorFile, digitTimeout, limit, terminators, strip
            res.write(messageGenerator.Record(callData["file"], mainServer, mainServer, callData["result"],
                callData["errorfile"], callData["digittimeout"], callData["inputtimeout"], callData["limit"],
                callData["terminator"], callData["strip"], callData["digits"], maxdigits));

            break;

        case "pause":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];
            //var pause = function( actionURL,tempURL, paramName, errorFile, digitTimeout,inputTimeout, milliseconds, terminators, strip)
            res.write(messageGenerator.Pause(mainServer, mainServer, callData["result"], callData["errorfile"],
                callData["digittimeout"], callData["inputtimeout"], callData["milliseconds"], callData["terminator"],
                callData["strip"], callData["digits"], maxdigits));

            break;
            break;

        case "speak":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];
            //var speak = function(file,actionURL, tempURL, paramName, errorFile, digitTimeout, inputTimeout, loops,engine,voice, terminators, strip)
            res.write(messageGenerator.Speak(callData["file"], mainServer, mainServer, callData["result"],
                callData["errorfile"], callData["digittimeout"], callData["inputtimeout"], callData["loops"],
                callData["engine"], callData["voice"], callData["terminator"], callData["strip"], callData["digits"], maxdigits));

            break;

        case "say":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];

            //var say = function(file,actionURL, tempURL, paramName, errorFile, digitTimeout, inputTimeout, loops,language,type,method,gender, terminators, strip)
            res.write(messageGenerator.Say(callData["file"], mainServer, mainServer, callData["result"],
                callData["errorfile"], callData["digittimeout"], callData["inputtimeout"], callData["loops"],
                callData["language"], callData["type"], callData["method"], callData["gender"], callData["terminator"],
                callData["strip"], callData["digits"], maxdigits));

            break;

        case "sms":
            //var sms = function(actionURL, tempURL,to,message)
            res.write(messageGenerator.Sms(mainServer, mainServer, callData["to"], callData["message"]));

            break;

        case "setdtmf":

            ////////////////////////new//////////////////////////////////


            //var str = "a=rtpmap:97 telephone-event/8000";

            var regex = new RegExp(/a=rtpmap:(\d+)\stelephone-event\/8000/);


            //var ismatch = str.match(regex);

            //var regex = new Regex("a=rtpmap:(\d+)\stelephone-event//8000");

            if (queryData["variable_switch_r_sdp"]) {

                console.log("variable_switch_r_sdp ok");
                var query = queryData["variable_switch_r_sdp"];

                var ismatch = query.match(regex);

                console.log(query);

                if (ismatch && ismatch.length > 0) {

                    var dtmfPayload = format("rtp_payload_number={0}",ismatch[0]);



                    console.log("------------------------------------------------------> outband");
                    var msg = messageGenerator.DTMFType(mainServer, mainServer, dtmfPayload);
                    console.log("------------------------------------------------------>" + msg);
                    res.write(msg);

                    console.log("------------------------------------------------------>" + "Done");


                }
                else {

                    console.log("------------------------------------------------------> INBAND");
                    //var msg = messageGenerator.DTMFType(mainServer, mainServer, dtmfPayload);
                    var msg = messageGenerator.StartDTMF(mainServer,mainServer);
                    console.log("------------------------------------------------------>" + msg);
                    res.write(msg);

                    console.log("------------------------------------------------------>" + "Done");


                }
            }
            else {

                ////////////////////////////////////////////////////////////////

                console.log("------------------------------------------------------>" + callData["dtmftype"]);
                //var msg = messageGenerator.DTMFType(mainServer, mainServer, callData["dtmftype"]);
                var msg = messageGenerator.Continue(mainServer);
                console.log("------------------------------------------------------>" + msg);
                //var sms = function(actionURL, tempURL,to,message)
                res.write(msg);

                console.log("------------------------------------------------------>" + "Done");
            }

            break;


        case "execute":
            //var execute = function(actionURL, tempURL,application,data)
            res.write(messageGenerator.Execute(mainServer, mainServer, callData["application"], callData["data"]));

            break;

        case "dial":

            var record_session = true;
            if(callData.hasOwnProperty("record_session"))
            {
                record_session = callData["record_session"];
            }
            //var dial = function(actionURL, tempURL,context,dialplan,callername,callernumber,number)
            res.write(messageGenerator.Dial(mainServer, mainServer, callData["context"], callData["dialplan"], callData["callername"], callData["callernumber"], callData["number"], record_session));

            break;


        case "dialuser":

            var record_session = true;
            if(callData.hasOwnProperty("record_session"))
            {
                record_session = callData["record_session"];
            }

            var number = format("user/{0}@{1}", callData["number"], uuid_data['domain']);
            res.write(messageGenerator.Dial(mainServer, mainServer, callData["context"], callData["dialplan"], callData["callername"], callData["callernumber"], number, record_session));

            break;

        case "dialdirect":

            var record_session = true;
            if(callData.hasOwnProperty("record_session"))
            {
                record_session = callData["record_session"];
            }

            var number = format("sip:{0}@{1}", callData["number"], uuid_data['domain']);
            var context = "developer";
            if (uuid_data['pbxcontext'])
                var context = uuid_data['pbxcontext'];
            res.write(messageGenerator.Dial(mainServer, mainServer, context, callData["dialplan"], callData["callername"], callData["callernumber"], number, record_session));

            break;

        /*
        case "dialgateway":

            if(uuid_data['gateway'])
                var number = format("sofia/{0}/{1}", uuid_data['gateway'], callData["number"]);
            var context = "developer";
            if (uuid_data['pbxcontext'])
                var context = uuid_data['pbxcontext'];
            res.write(messageGenerator.Dial(mainServer, mainServer, context, callData["dialplan"], callData["callername"], callData["callernumber"], number));

            break;
            */




        case "recordcall":
            //var recordCall = function(actionURL, tempURL,limit,name)
            res.write(messageGenerator.RecordCall(mainServer, mainServer, callData["limit"], callData["name"]));

            break;

        case "conference":
            //var conference = function(actionURL, tempURL,profile,data)
            res.write(messageGenerator.Conference(mainServer, mainServer, profile, callData["data"]));

            break;

        case "break":
            //var breakx = function(actionURL, tempURL,cause)
            res.write(messageGenerator.Break(mainServer, mainServer, callData["cause"]));

            break;

        case "waitforanswer":

            res.write(messageGenerator.WaitForAnswer(mainServer, mainServer));

            break;

        case "queue":

            res.write(messageGenerator.Queue(mainServer, mainServer,callData["skill"],ip, port));

            break;

        case "ards":

            /*
             callData["MOH"] =  "";
             callData["Announcement"] = "";
             callData["FirstAnnounement"] = "";
             callData["AnnouncementTime"] = "";
             */

            if(!callData["skilldisplay"]){
                callData["skilldisplay"] = 'n/a';
            }
            res.write(messageGenerator.ARDS(mainServer, mainServer,callData["skill"],callData["skilldisplay"],callData["company"],callData["tenant"],callData["MOH"],callData["FirstAnnounement"],callData["Announcement"],callData["AnnouncementTime"], callData["PositionAnnouncement"], callData["Language"], callData["priority"], callData["MaxQueueTime"], callData["DialTime"], callData["BusinessUnit"]));

            break;


        case "log":
            //var log = function(actionURL, tempURL,level,clean,message)
            res.write(messageGenerator.Log(mainServer, mainServer, callData["level"], callData["clean"], callData["message"]));

            break;

        case "getvar":
            //var getVar = function(actionURL, tempURL, permenent, name)
            var doc = {};
            try{
                var permenant = "true";
                if(callData["permanent"])
                    permenant = callData["permanent"];
                doc = messageGenerator.GetVar(mainServer, mainServer, permenant, callData["name"])
            }
            catch(ex){
                console.log(ex);
            }
            console.log(doc);
            res.write(doc);

            break;


        case "voicemail":
            //var voicemail = function(actionURL, tempURL, check, authonly, profile,domain,id)
            res.write(messageGenerator.VoiceMail(mainServer, mainServer, callData["check"], callData["authonly"], profile, domain, callData["id"]));

            break;

        case "hangup":
            res.write(messageGenerator.Hangup(mainServer, mainServer, callData["cause"]));

            break;

        case "continue":

                res.write(messageGenerator.Continue(mainServer, callData["key"], callData["attribute"]));


            break;


        default:
            res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));

            break;
    }

    console.log("----------------------------------------------------> end response");

    res.end();


}


function OperationDebug(debugdata, callData, fileID, mainServer, queryData, res, domain, profile, ip, port){


    switch (callData["action"]) {

        case "play":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];

            debugdata.push({type:"action",action: "play", info: "Play file started wait for terminator or timeout", data: callData});

            //res.write(messageGenerator.Playback(fileID, mainServer, mainServer, callData["result"], callData["errorfile"], callData["digittimeout"], callData["inputtimeout"], callData["loops"], callData["terminator"], callData["strip"], callData["digits"], maxdigits));
            break;


        case "playandgetdigits":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];

            var error = './invalid.wav';
            if (callData["errorfile"])
                error = callData["errorfile"];


            debugdata.push({type:"action",action: "playandgetdigits", info: "Play and get digit file started wait for terminator or timeout", data: callData});

            break;

        case "record":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];
            //file, actionURL,tempURL, paramName, errorFile, digitTimeout, limit, terminators, strip
            debugdata.push({type:"action",action: "record", info: "record file started wait for terminator or timeout", data: callData});

            break;

        case "pause":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];
            //var pause = function( actionURL,tempURL, paramName, errorFile, digitTimeout,inputTimeout, milliseconds, terminators, strip)
            debugdata.push({type:"action",action: "pause", info: "record file started wait for terminator or timeout", data: callData});

            break;

        case "speak":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];
            //var speak = function(file,actionURL, tempURL, paramName, errorFile, digitTimeout, inputTimeout, loops,engine,voice, terminators, strip)
            debugdata.push({type:"action",action: "speak", info: "speak started wait for terminator or timeout", data: callData});
            break;

        case "say":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];

            //var say = function(file,actionURL, tempURL, paramName, errorFile, digitTimeout, inputTimeout, loops,language,type,method,gender, terminators, strip)
            debugdata.push({type:"action",action: "say", info: "say started wait for terminator or timeout", data: callData});
            break;

        case "sms":
            //var sms = function(actionURL, tempURL,to,message)
            debugdata.push({type:"action",action: "sms", info: "sendsms", data: callData});

            break;

        case "setdtmf":

            ////////////////////////new//////////////////////////////////


            debugdata.push({type:"action",action: "setdtmf", info: "setdtmf", data: callData});

            break;


        case "execute":
            //var execute = function(actionURL, tempURL,application,data)
            debugdata.push({type:"action",action: "execute", info: "execute", data: callData});

            break;

        case "dial":
            //var dial = function(actionURL, tempURL,context,dialplan,callername,callernumber,number)
            debugdata.push({type:"action",action: "dial", info: "dial", data: callData});
            break;


        case "dialuser":

            debugdata.push({type:"action",action: "dialuser", info: "dialuser", data: callData});
            break;

        case "dialdirect":

            debugdata.push({type:"action",action: "dialdirect", info: "dialdirect", data: callData});
            break;

        /*
         case "dialgateway":

         if(uuid_data['gateway'])
         var number = format("sofia/{0}/{1}", uuid_data['gateway'], callData["number"]);
         var context = "developer";
         if (uuid_data['pbxcontext'])
         var context = uuid_data['pbxcontext'];
         res.write(messageGenerator.Dial(mainServer, mainServer, context, callData["dialplan"], callData["callername"], callData["callernumber"], number));

         break;
         */




        case "recordcall":
            //var recordCall = function(actionURL, tempURL,limit,name)
            debugdata.push({type:"action",action: "recordcall", info: "recordcall", data: callData});

            break;

        case "conference":
            //var conference = function(actionURL, tempURL,profile,data)
            debugdata.push({type:"action",action: "conference", info: "conference", data: callData});

            break;

        case "break":
            //var breakx = function(actionURL, tempURL,cause)
            debugdata.push({type:"action",action: "break", info: "break", data: callData});

            break;

        case "waitforanswer":

            debugdata.push({type:"action",action: "waitforanswer", info: "waitforanswer", data: callData});

            break;

        case "queue":

            debugdata.push({type:"action",action: "queue", info: "queue", data: callData});

            break;


        case "log":
            //var log = function(actionURL, tempURL,level,clean,message)
            debugdata.push({type:"action",action: "log", info: "log", data: callData});
            break;


        case "getvar":
            //var getVar = function(actionURL, tempURL, permenent, name)
            debugdata.push({type:"action",action: "getvar", info: "getvar", data: callData});

            break;


        case "voicemail":
            //var voicemail = function(actionURL, tempURL, check, authonly, profile,domain,id)
            debugdata.push({type:"action",action: "voicemail", info: "voicemail", data: callData});
            break;

        case "hangup":
            debugdata.push({type:"action",action: "hangup", info: "hangup", data: callData});

            break;

        case "continue":
            debugdata.push({type:"action",action: "continue", info: "continue", data: callData});

            break;


        default:
            debugdata.push({ type:"action",action: "hangup",info: "Unknown command found from client application so drop call", data: callData});

            break;
    }

    console.log("----------------------------------------------------> end response");

    res.write(JSON.stringify(debugdata));

    res.end();


}


///DVP/API/:version/ExternalUser/:id/attribute/:attribute

function GetUserAttributes(company, tenant, id, attribute, cb){

    if((config.Services && config.Services.userserviceurl && config.Services.userserviceport && config.Services.userserviceversion)) {


        var userserviceURL = format("http://{0}/DVP/API/{1}/ExternalUser/"+id+"/attribute/"+attribute, config.Services.userserviceurl, config.Services.userserviceversion);
        if (validator.isIP(config.Services.userserviceurl))
            userserviceURL = format("http://{0}:{1}/DVP/API/{2}/ExternalUser/"+id+"/attribute/"+attribute, config.Services.userserviceurl, config.Services.userserviceport, config.Services.userserviceversion);

        //var engagementData =  {};

        logger.debug("Calling Engagement service URL %s", userserviceURL);
        request({
            method: "GET",
            url: userserviceURL,
            headers: {
                authorization: token,
                companyinfo: format("{0}:{1}", tenant, company)
            },
            json: {}
        }, function (_error, _response, datax) {

            try {

                if (!_error && _response && _response.statusCode == 200, _response.body && _response.body.IsSuccess) {

                    cb(true,_response.body.Result);

                }else{

                    logger.error("There is an error in  getting user attributes for this id "+ id);
                    cb(false,{});

                }
            }
            catch (excep) {

                cb(false,{});

            }
        });
    }
}

function UpdateUserAttributes(company, tenant, id, attribute, value, cb){

    if((config.Services && config.Services.userserviceurl && config.Services.userserviceport && config.Services.userserviceversion)) {


        var userserviceURL = format("http://{0}/DVP/API/{1}/ExternalUser/"+id+"/attribute/"+attribute+"/value/"+value, config.Services.userserviceurl, config.Services.userserviceversion);
        if (validator.isIP(config.Services.userserviceurl))
            userserviceURL = format("http://{0}:{1}/DVP/API/{2}/ExternalUser/"+id+"/attribute/"+attribute+"/value/"+value, config.Services.userserviceurl, config.Services.userserviceport, config.Services.userserviceversion);

        //var engagementData =  {};

        logger.debug("Update User attribute service URL %s", userserviceURL);
        request({
            method: "PUT",
            url: userserviceURL,
            headers: {
                authorization: token,
                companyinfo: format("{0}:{1}", tenant, company)
            },
            json: {}
        }, function (_error, _response, datax) {

            try {

                if (!_error && _response && _response.statusCode == 200, _response.body && _response.body.IsSuccess) {

                    cb(true,_response.body.Result);

                }else{

                    logger.error("There is an error in  getting user attributes for this id "+ id);
                    cb(false,{});

                }
            }
            catch (excep) {

                cb(false,{});

            }
        });
    }
}


function CreateEngagement(dummy, channel, company, tenant, from, to, direction, session, body, cb){

    if(dummy){

        return cb(false, undefined);
    }


    if((config.Services && config.Services.interactionurl && config.Services.interactionport && config.Services.interactionversion)) {


        var engagementURL = format("http://{0}/DVP/API/{1}/EngagementSessionForProfile", config.Services.interactionurl, config.Services.interactionversion);
        if (validator.isIP(config.Services.interactionurl))
            engagementURL = format("http://{0}:{1}/DVP/API/{2}/EngagementSessionForProfile", config.Services.interactionurl, config.Services.interactionport, config.Services.interactionversion);

        var engagementData =  {
            "engagement_id": session,
            "channel": channel,
            "direction": direction,
            "channel_from":from,
            "channel_to": to,
            "body":body
        };

        logger.debug("Calling Engagement service URL %s", engagementURL);
        request({
            method: "POST",
            url: engagementURL,
            headers: {
                authorization: token,
                companyinfo: format("{0}:{1}", tenant, company)
            },
            json: engagementData
        }, function (_error, _response, datax) {

            try {

                if (!_error && _response && _response.statusCode == 200, _response.body && _response.body.IsSuccess) {

                    return cb(true,_response.body.Result);

                }else{

                    logger.error("There is an error in  create engagements for this session "+ session);
                    return cb(false,{});


                }
            }
            catch (excep) {

                return cb(false,{});

            }
        });
    }
}


function CreateTicket(channel,session, company, tenant, type, subjecct, description, priority, tags, requester, cb){

    if((config.Services && config.Services.ticketurl && config.Services.ticketport && config.Services.ticketversion)) {


        var ticketURL = format("http://{0}/DVP/API/{1}/Ticket", config.Services.ticketurl, config.Services.ticketversion);
        if (validator.isIP(config.Services.ticketurl))
            ticketURL = format("http://{0}:{1}/DVP/API/{2}/Ticket", config.Services.ticketurl, config.Services.ticketport, config.Services.ticketversion);

        var ticketData =  {

            "type": type,
            "subject": subjecct,
            "reference": session,
            "description": description,
            "priority": priority,
            "status": "new",
            "engagement_session": session,
            "channel": channel,
            "requester": requester,
            "tags": tags,
        };



        logger.debug("Calling Ticket service URL %s", ticketURL);
        request({
            method: "POST",
            url: ticketURL,
            headers: {
                authorization: token,
                companyinfo: format("{0}:{1}", tenant, company)
            },
            json: ticketData
        }, function (_error, _response, datax) {

            try {

                if (!_error && _response && _response.statusCode == 200 && _response.body && _response.body.IsSuccess) {

                    cb(true, _response.body.tid);

                }else{

                    logger.error("There is an error in  create ticket for this session "+ session);

                    cb(false, "");


                }
            }
            catch (excep) {

                cb(false, "");

            }
        });
    }
}


function CreateSubmission(company, tenant, session, requester, submitter, satisfaction, contact,cb){


    //console.log("CreateSubmission calling");
    if((config.Services && config.Services.csaturl && config.Services.csatport && config.Services.csatversion)) {


        //console.log("CreateSubmission start");
        var ticketURL = format("http://{0}/DVP/API/{1}/CustomerSatisfaction/Submission/ByEngagement", config.Services.csaturl, config.Services.csatversion);
        if (validator.isIP(config.Services.csaturl))
            ticketURL = format("http://{0}:{1}/DVP/API/{2}/CustomerSatisfaction/Submission/ByEngagement", config.Services.csaturl, config.Services.csatport, config.Services.csatversion);

        var csatData =  {

            requester: requester,
            submitter: submitter,
            engagement: session,
            method:'ivr',
            satisfaction: satisfaction,
            contact: contact
        };

        logger.debug("Calling CSAT service URL %s", ticketURL);
        logger.debug(csatData);

        request({
            method: "POST",
            url: ticketURL,
            headers: {
                authorization: token,
                companyinfo: format("{0}:{1}", tenant, company)
            },
            json: csatData
        }, function (_error, _response, datax) {


            //console.log(_response);

            try {

                if (!_error && _response && _response.statusCode == 200 && _response.body && _response.body.IsSuccess) {

                    cb(true, _response.body.Result);

                }else{

                    logger.error("There is an error in  create csat for this session "+ session);

                    cb(false, undefined);


                }
            }
            catch (excep) {

                logger.error("There is an error in  create csat for this session "+ session, excep);
                cb(false, undefined);

            }
        });
    }
}


function CreateComment(channel, channeltype,company, tenant, engid, engagement, cb){

    //http://localhost:3636/DVP/API/1.0.0.0/TicketByEngagement/754236638146859008/Comment

    if (config.Services && config.Services.ticketurl && config.Services.ticketport && config.Services.ticketversion) {

        var url = format("http://{0}/DVP/API/{1}/TicketByEngagement/{2}/Comment", config.Services.ticketurl, config.Services.ticketversion,engagement._id);
        if (validator.isIP(config.Services.ticketurl))
            url = format("http://{0}:{1}/DVP/API/{2}/TicketByEngagement/{3}/Comment", config.Services.ticketurl, config.Services.ticketport,config.Services.ticketversion, engid);


        var data = {

            body: engagement.body,
            body_type: "text",
            type: channeltype,
            public: true,
            channel: channel,
            channel_from: engagement.channel_from,
            engagement_session: engagement.engagement_id,
            author_external: engagement.profile_id
        };

        request({
            method: "PUT",
            url: url,
            headers: {
                authorization: "Bearer " + config.Services.accessToken,
                companyinfo: format("{0}:{1}", tenant, company)
            },
            json: data
        }, function (_error, _response, datax) {

            try {

                if (!_error && _response && _response.statusCode == 200) {

                    logger.debug("Successfully registered");
                    return cb(true);
                } else {

                    logger.error("Registration Failed "+_error);
                    return cb(false);

                }
            }
            catch (excep) {

                logger.error("Registration Failed "+excep);
                return cb(false);
            }

        });

    }

};

///http://ardsliteservice.app.veery.cloud/DVP/API/1.0.0.0/ARDS/request

function AddNoteToEngagement(company, tenant, session,body){

    if((config.Services && config.Services.interactionurl && config.Services.interactionport && config.Services.interactionversion)) {

        ///DVP/API/:version/EngagementSession/:session/Note

        var engagementURL = format("http://{0}/DVP/API/{1}/EngagementSession/{2}/Note", config.Services.interactionurl, config.Services.interactionversion, session);
        if (validator.isIP(config.Services.interactionurl))
            engagementURL = format("http://{0}:{1}/DVP/API/{2}/EngagementSession/{3}/Note", config.Services.interactionurl, config.Services.interactionport, config.Services.interactionversion, session);

        var engagementData =  {
            "body": body,
            "created_at": Date.now()
        };

        logger.debug("Calling Engagement service URL %s", engagementURL);
        request({
            method: "POST",
            url: engagementURL,
            headers: {
                authorization: token,
                companyinfo: format("{0}:{1}", tenant, company)
            },
            json: engagementData
        }, function (_error, _response, datax) {

            try {

                if (!_error && _response && _response.statusCode == 200) {

                }else{

                    logger.error("There is an error in  add note to engagement "+ session);

                }
            }
            catch (excep) {

                logger.error("There is an error in  add note to engagement "+ excep);


            }
        });
    }
}


function GetAgentForRequest(company, tenant, sessionID, Attributes, cb){

    if((config.Services && config.Services.ardsServiceHost && config.Services.ardsServicePort && config.Services.ardsServiceVersion)) {

        ///http://ardsliteservice.app.veery.cloud/DVP/API/1.0.0.0/ARDS/request

        var ardsURL = format("http://{0}/DVP/API/{1}/ARDS/request", config.Services.ardsServiceHost, config.Services.ardsServiceVersion);
        if (validator.isIP(config.Services.ardsServiceHost))
            ardsURL = format("http://{0}:{1}/DVP/API/{2}/ARDS/request", config.Services.ardsServiceHost, config.Services.ardsServicePort, config.Services.ardsServiceVersion);

        var ardsData =  {

            ServerType:"TICKETSERVER",
            RequestType:"TICKET",
            SessionId:sessionID,
            Attributes:Attributes,
            RequestServerId:"1",
            Priority:"0",
            ResourceCount:1,
            OtherInfo:""

        };

        logger.debug("Calling ARDS service URL %s", ardsURL);
        request({
            method: "POST",
            url: ardsURL,
            headers: {
                authorization: token,
                companyinfo: format("{0}:{1}", tenant, company)
            },
            json: ardsData
        }, function (_error, _response, datax) {

            try {

                if (!_error && _response && _response.statusCode == 200) {

                    if(_response.body && _response.ResourceInfo&&_response.ResourceInfo.ResourceId){
                        cb(true, _response.ResourceInfo.ResourceId)
                    }else{
                        cb(false, undefined)
                    }

                }else{

                    logger.error("There is an error in  get agent "+ sessionID);
                    cb(false, undefined)
                }
            }
            catch (excep) {

                logger.error("There is an error in  get agent "+ excep);
                cb(false, undefined)
            }
        });
    }


}


function AddToInbox(company, tenant, sessionid, from, type, msg, profile, heading){

    if((config.Services && config.Services.interactionurl && config.Services.interactionport && config.Services.interactionversion)) {


        var engagementURL = format("http://{0}/DVP/API/{1}/Inbox/Message", config.Services.interactionurl, config.Services.interactionversion);
        if (validator.isIP(config.Services.interactionurl))
            engagementURL = format("http://{0}:{1}/DVP/API/{2}/Inbox/Message", config.Services.interactionurl, config.Services.interactionport, config.Services.interactionversion);

        var engagementData =  {
            message: msg,
            msgType: type,
            profile: profile,
            heading: heading,
            from: from,
            engagementSession: sessionid
        };

        logger.debug("Calling Engagement service URL %s", engagementURL);
        request({
            method: "POST",
            url: engagementURL,
            headers: {
                authorization: token,
                companyinfo: format("{0}:{1}", tenant, company)
            },
            json: engagementData
        }, function (_error, _response, datax) {

            try {

                if (!_error && _response && _response.statusCode == 200, _response.body && _response.body.IsSuccess) {

                    logger.debug("Add to inbox is success "+ sessionid);

                }else{

                    logger.error("There is an error in  create engagements for this session "+ sessionid);
                }
            }
            catch (excep) {

                logger.error("There is an error in  create engagements for this session "+ sessionid, excep);
            }
        });
    }
}


function HandleSMS(req, res, next){

    var queryData = req.params;
    var from = queryData["from"];
    var content = queryData["content"];
    var sessionid = queryData["to"];
    var systemid = queryData["id"];
    var profile = undefined;

    redisClient.get("SMS:"+sessionid, function (err, sessiondata) {

        sessiondata = JSON.parse(sessiondata);

        if(err){

            logger.error("error in searching data", err);
            var date = new Date();
            var callreciveEvent = {EventClass:'APP',EventType:'ERROR', EventCategory:'SYSTEM', EventTime:date, EventName:'NOSESSION',EventData:'',EventParams:'',CompanyId:company, TenantId: tenant, SessionId: sessionid  };
            PublishDVPEventsMessage("DVPEVENTS", callreciveEvent);

        }else {

            try {

                redisClient.del("SMS:" + sessionid, redis.print);

                if (sessiondata) {

                    logger.debug("session data found %j", sessiondata);

                    var url = sessiondata["Url"];
                    var destination = sessiondata["DestinationNumber"];
                    var from = sessiondata["FromNumber"];
                    var direction = sessiondata["Direction"];
                    var company = sessiondata["CompanyId"];
                    var tenant = sessiondata["TenantId"];
                    var message = sessiondata["Message"];

                    var body = {
                        session: sessionid,
                        direction: direction,
                        ani: from,
                        dnis: destination,
                        name: from,
                        result: message,
                        systemid: systemid,
                        company: company,
                        tenant: tenant
                    };
                    var options = {
                        url: url,
                        method: "POST",
                        json: body,
                        headers: {'authorization': token, 'companyinfo': format("{0}:{1}", tenant, company)}
                    };

                    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                    CreateEngagement(undefined,"sms",company,tenant,from,destination,"inbound",sessionid,message, function(isSuccess,result){

                        if(isSuccess && result){

                            logger.debug("SMS Engagement Created Successfully  "+ result);

                            if(result && result.profile_id){

                                profile = result.profile_id;
                            }


                        }else{

                            logger.debug("SMS Engagement Creation Failed  "+ result);
                        }

                        var date = new Date();
                        var callreciveEvent = {EventClass:'APP',EventType:'DATA', EventCategory:'SYSTEM', EventTime:date, EventName:'SYSTEMDATA',EventData:body,EventParams:'',CompanyId:company, TenantId: tenant, SessionId: sessionid  };
                        PublishDVPEventsMessage("DVPEVENTS", callreciveEvent);

                        //console.log("body", body);
                        //console.log("options", options);
                        if (url) {
                            logger.debug("SMS out url found "+ url);
                            request(options, function (error, response, data) {

                                if (!error && response && response.statusCode == 200) {

                                    logger.debug("successfuly called external application");


                                    var date = new Date();
                                    var callreciveEvent = {EventClass:'APP',EventType:'DATA', EventCategory:'DEVELOPER', EventTime:date, EventName:'REMOTEEXECUTED',EventData:response.body,EventParams:url,CompanyId:company, TenantId: tenant, SessionId: sessionid  };
                                    PublishDVPEventsMessage("DVPEVENTS", callreciveEvent);



                                    //////////////////////////////////////////////////////////////////////sms actions///////////////////////////////

                                    var smsData = response.body;

                                    switch (smsData["action"]) {

                                        case "reply":

                                            break;

                                        case "comment":

                                            CreateComment('sms','ITR',sessiondata["CompanyId"],sessiondata["TenantId"],smsData["engagement"],result,function(success, result){});

                                            break;

                                        case "ticket":

                                            var description = message;
                                            if( smsData["description"]){
                                                description =smsData["description"];
                                            }
                                            CreateTicket("sms",sessionid,sessiondata["CompanyId"],sessiondata["TenantId"],smsData["type"], smsData["subject"], description,smsData["priority"],smsData["tags"],profile,function(success, result){});

                                            break;
                                        case "note":

                                            AddNoteToEngagement(sessiondata["CompanyId"],sessiondata["TenantId"],sessionid,smsData["note"]);

                                            break;
                                        case "agent":

                                            GetAgentForRequest(sessiondata["CompanyId"],sessiondata["TenantId"],sessionid,smsData["attributes"],function(isSuccess, data){

                                                if(isSuccess){

                                                    AddToInbox(sessiondata["CompanyId"],sessiondata["TenantId"],sessionid,from,"SMS",message,data,smsData["subject"]);

                                                }

                                            });

                                            break;
                                    }

                                    //AddNoteToEngagement
                                    //rote to agent inbox
                                    //reply
                                    //create ticket
                                    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                                } else {

                                    logger.debug("Error calling external url.....");
                                    if (error) {

                                        logger.error("there is an error calling external", error);
                                    } else {

                                        logger.debug("response is");
                                    }


                                    var date = new Date();
                                    var callreciveEvent = {EventClass:'APP',EventType:'ERROR', EventCategory:'DEVELOPER', EventTime:date, EventName:'REMOTEERROR',EventData:err,EventParams:response,CompanyId:company, TenantId: tenant, SessionId: sessionid  };
                                    PublishDVPEventsMessage("DVPEVENTS", callreciveEvent);

                                }

                            });
                        } else {

                            logger.error("No url found ..... ");
                        }




                    });
                    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



                } else {


                    logger.error("No session data found %s", sessionid)

                }
            }catch(ex){

                console.error("Exception in HandleSMS ",ex);

            }
        }


    });


    res.write("ACK/Jasmin");
    res.end();
    next();

}


function HandleFunction(queryData, req, res, next) {


    //console.log(req.url);
    //var queryData = url.parse(req.url, true).query;

    var isdebug = false;
    var debugdata = {};
    var fileID = "";
    var company = '';
    var tenant = '';

    logger.debug("HTTPProgrammingAPI.Handler FS Request Recived");


    //console.log(queryData);
    // if (queryData["exiting"] == "true") {
    //
    //     logger.debug("HTTPProgrammingAPI.Handler Session Leave %s", queryData["session_id"]);
    //
    //     redisClient.del(queryData["session_id"] + "_dev", redis.print);
    //     redisClient.del(queryData["session_id"] + "_command", redis.print);
    //     redisClient.del(queryData["session_id"] + "_data", redis.print);
    //
    //     var date = new Date();
    //     var callreciveEvent = {
    //         EventClass: 'APP',
    //         EventType: 'EVENT',
    //         EventCategory: 'SYSTEM',
    //         EventTime: date,
    //         EventName: 'APPLICATIONEND',
    //         EventData: '',
    //         EventParams: '',
    //         CompanyId: company,
    //         TenantId: tenant,
    //         SessionId: queryData["session_id"]
    //     };
    //     redisClient.publish("SYS:MONITORING:DVPEVENTS", JSON.stringify(callreciveEvent), redis.print);
    //
    //     logger.debug("HTTPProgrammingAPI.Handler REDIS Publish data to event flow %s", queryData["session_id"], callreciveEvent);
    //
    //
    //     res.writeHead(200, {"Content-Type": "text/xml"});
    //     res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
    //     res.end();
    //
    //     return next();
    //
    // }


    redisClient.get(queryData["session_id"] + "_data", function (err, sessiondata) {

        var uuid_dev;
        if (err) {

            logger.error("HTTPProgrammingAPI.Handler REDIS Error in sessiondata retrieve %s", queryData["session_id"], err);
            console.error("error");
            res.writeHead(200, {"Content-Type": "text/xml"});
            res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
            res.end();
        }
        else {
            console.log("Worked: " + sessiondata);
            var uuid_data = JSON.parse(sessiondata);

            if (!sessiondata) {

                uuid_data = {
                    path: "http://localhost:8081",
                    company: 1,
                    tenant: 3,
                    pbx: 'none',
                    appid: 'none',
                    domain: 'none',
                    profile: 'default',
                    env: 'production'
                };

                logger.debug("HTTPProgrammingAPI.Handler no sessiondata found create new");

            }

            var reset = false;
            if(uuid_data && !uuid_data.taken){

                logger.info("Session is going to reset ----------------------------------------------------------------------------------->");
                reset = true;
                uuid_data.taken = true;
                redisClient.set(queryData["session_id"] + "_data", JSON.stringify(uuid_data) , redis.print);
                logger.info("Session is going to reset -----------------------------------------------------------------------------------> done");

            }


            //logger.debug("Session Data included ----------------------> %j", sessiondata);

            if (uuid_data["env"] == "debug") {

                isdebug = true;
            }

            company = uuid_data['company'];
            tenant = uuid_data['tenant'];


            if (!uuid_data) {
                res.writeHead(200, {"Content-Type": "text/xml"});
                res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
                res.end();

            }
            else {
                redisClient.get(queryData["session_id"] + "_dev", function (err, value) {

                    var uuid_dev;
                    if (err) {
                        logger.error("HTTPProgrammingAPI.Handler REDIS Error in sessiondev retrieve %s", queryData["session_id"], err);
                        res.writeHead(200, {"Content-Type": "text/xml"});
                        res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
                        res.end(404);
                        return;
                    }
                    else {


                        var engagementType = 'call';

                        var callerID = queryData["Caller-Caller-ID-Number"]
                        if(queryData["variable_effective_caller_id_number"]){
                            callerID = queryData["variable_effective_caller_id_number"];
                        }

                        if(queryData["effective_caller_id_number"]){
                            callerID = queryData["effective_caller_id_number"];
                        }

                        if(queryData["Caller-Channel-Name"] && queryData["Caller-Channel-Name"].indexOf("@sip.skype.com") !== -1){
                            engagementType = 'skype';
                            logger.debug("channel type set to skype .........");
                            if(queryData["Caller-Caller-ID-Name"]){
                                callerID = queryData["Caller-Caller-ID-Name"];
                                logger.debug("caller-id set to " + callerID);
                            }

                        }

                        //console.log("Worked: " + value);
                        var dummyEngagement = true;
                        uuid_dev = {};
                        if (!value) {

                            var basurl = "none";
                            var nxurl = uuid_data["path"];
                            if (uuid_data["app"]) {
                                nxurl = format("{0}/{1}", uuid_data["path"], uuid_data["app"]);
                                basurl = uuid_data["path"];
                            }

                            uuid_dev = {
                                serverdata: queryData,
                                nexturl: nxurl,
                                currenturl: "none",
                                result: "result",
                                lastcommand: "none",
                                lastresult: "none",
                                company: uuid_data["company"],
                                tenant: uuid_data["tenant"],
                                posturl: "none",
                                baseurl: basurl,
                                appid: uuid_data["appid"]
                            }



                            logger.info("User number ------------------------------------------------------------->"+callerID);

                            //redisClient.lpush(queryData["Caller-Destination-Number"] + "_live", queryData["session_id"], redis.print);
                            //redisClient.lpush("APPID_" + uuid_data["appid"], queryData["session_id"], redis.print);
                            logger.debug("HTTPProgrammingAPI.Handler Session Create %s", queryData["session_id"]);
                            //////////////////////////////////////ceate engagement session/////////////////////////////////////////////////////////
                            dummyEngagement = false;
                            ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                        }else{


                            uuid_dev = JSON.parse(value);
                            logger.info("Session is going to reset -----------------------------------------------------------------------------------> inside");
                            if(reset == true){


                                uuid_dev.nexturl = format("{0}/{1}", uuid_data["path"], uuid_data["app"]);
                                uuid_dev.baseurl = uuid_data["path"];
                                uuid_dev.appid = uuid_data["appid"]

                                logger.info("DEV data reset due to session reset____________________  " + uuid_dev.nexturl + " "+uuid_dev.baseurl+" "+ uuid_dev.appid);
                            }
                            logger.info("Session is going to reset -----------------------------------------------------------------------------------> outside");
                            dummyEngagement = true;

                        }

                        CreateEngagement(dummyEngagement, engagementType, uuid_data["company"], uuid_data["tenant"], callerID, queryData["Caller-Destination-Number"], queryData["Caller-Direction"], queryData["session_id"], undefined, function (isSuccess, result) {

                            if (isSuccess && result) {

                                logger.debug(result);

                                if (result && result.profile_id) {

                                    if (!uuid_dev["dev_params"]) {
                                        uuid_dev["dev_params"] = {};
                                    }
                                    uuid_dev["dev_params"]["profile"] = result.profile_id;
                                }

                            } else {

                                logger.error("Call Engagement Creation Failed  " + result);
                            }


                            {

                                if (queryData['ARDS-Resource-Profile-Name']) {

                                    uuid_dev["resource"] = queryData['ARDS-Resource-Profile-Name'];
                                }

                                if(queryData['detect_speech_result']){
                                    try {

                                        var detected_result = {};
                                        if(queryData['detect_speech_result']) {
                                            try {
                                                detected_result = JSON.parse(convert.xml2json(queryData['detect_speech_result'], {
                                                    compact: true,
                                                    spaces: 4
                                                }));
                                            }catch(ex){
                                                logger.error(ex);
                                            }
                                        }

                                        queryData['detect_speech_result'] = detected_result;

                                        if(detected_result && detected_result.result && detected_result.result.interpretation
                                            && detected_result.result.interpretation.input  && detected_result.result.interpretation.input._text){
                                            queryData['detect_speech_result_string'] = detected_result.result.interpretation.input._text;
                                            logger.info('Detected voice : ' + detected_result.result.interpretation.input._text);
                                        }
                                        //resultValue = uuid_dev['detect_speech_result'];

                                    }catch(ex){
                                        logger.error("xml conversion failed", ex);
                                    }
                                }


                                var resultValue = "none";
                                if (queryData[uuid_dev["result"]]) {
                                    resultValue = queryData[uuid_dev["result"]];
                                    uuid_dev["lastresult"] = resultValue;
                                    if (!uuid_dev["dev_params"]) {

                                        uuid_dev["dev_params"] = {};
                                    }
                                    uuid_dev["dev_params"][uuid_dev["result"]] = resultValue;

                                }




                                //queryData["variable_ARDS-Resource-Profile-Name"]
                                //redisClient.lpush(queryData["session_id"] + "_result", resultValue, redis.print);

                                var body = {
                                    session: queryData["session_id"],
                                    direction: queryData["Caller-Direction"],
                                    ani: queryData["Caller-Caller-ID-Number"],
                                    dnis: queryData["Caller-Destination-Number"],
                                    name: queryData["Caller-Caller-ID-Name"],
                                    result: resultValue
                                };

                                if (uuid_dev["dev_params"]) {

                                    body["dev_params"] = uuid_dev["dev_params"];
                                }

                                logger.debug("HTTPProgrammingAPI.Handler RequestOut DeveloperAPP Data %s %j", queryData["session_id"], body);

                                // var data = JSON.stringify(body);

                                var options = {
                                    url: uuid_dev["nexturl"],
                                    method: "POST",
                                    json: body,
                                    headers: {
                                        'authorization': appToken,
                                        'companyinfo': format("{0}:{1}", uuid_data["tenant"], uuid_data["company"])
                                    }
                                };

                                if (queryData["exiting"] == "true") {

                                    body.exit = true;
                                }

                                ////////////////////////////////////////

                                var date = new Date();
                                var callreciveEvent = {
                                    EventClass: 'APP',
                                    EventType: 'EVENT',
                                    EventCategory: 'SYSTEM',
                                    EventTime: date,
                                    EventName: 'APPLICATIONFOUND',
                                    EventData: uuid_data["appid"],
                                    EventParams: '',
                                    CompanyId: uuid_data["company"],
                                    TenantId: uuid_data["tenant"],
                                    SessionId: queryData["session_id"]
                                };
                                //redisClient.publish("SYS:MONITORING:DVPEVENTS", JSON.stringify(callreciveEvent), redis.print);

                                logger.debug("HTTPProgrammingAPI.Handler REDIS Publish data to event flow %s %j", queryData["session_id"], callreciveEvent);


                                ////////////////////////////////////////
                                logger.debug("HTTPProgrammingAPI.Handler RequestOut DeveloperAPP URL %s", uuid_dev["nexturl"]);


                                request(options, function (error, response, data) {


                                    if (queryData["exiting"] == "true") {

                                        logger.debug("HTTPProgrammingAPI.Handler Session Leave %s", queryData["session_id"]);

                                        redisClient.del(queryData["session_id"] + "_dev", redis.print);
                                        redisClient.del(queryData["session_id"] + "_command", redis.print);
                                        //redisClient.del(queryData["session_id"] + "_result", redis.print);
                                        redisClient.del(queryData["session_id"] + "_data", redis.print);
                                        // redisClient.lrem(queryData["Caller-Destination-Number"] + "_live" , 0 , queryData["session_id"], redis.print);


                                        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                                        var date = new Date();
                                        var callreciveEvent = {
                                            EventClass: 'APP',
                                            EventType: 'EVENT',
                                            EventCategory: 'SYSTEM',
                                            EventTime: date,
                                            EventName: 'APPLICATIONEND',
                                            EventData: '',
                                            EventParams: '',
                                            CompanyId: company,
                                            TenantId: tenant,
                                            SessionId: queryData["session_id"]
                                        };
                                        PublishDVPEventsMessage("DVPEVENTS", callreciveEvent);


                                        logger.debug("HTTPProgrammingAPI.Handler REDIS Publish data to event flow %s", queryData["session_id"], callreciveEvent);
                                        //////////////////////////////////////////////////////////////////////////////// %s///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


                                        res.writeHead(200, {"Content-Type": "text/xml"});
                                        res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
                                        res.end();

                                        return next();

                                    }else {


                                        if (!error && response.statusCode == 200) {


                                            logger.debug("HTTPProgrammingAPI.Handler RequestOut DeveloperAPP Success %s %j", queryData["session_id"], response.body);

                                            //console.log(response.body)
                                            //console.log(data);
                                            redisClient.lpush(queryData["session_id"] + "_command", JSON.stringify(response.body), redis.print);

                                            logger.debug("HTTPProgrammingAPI.Handler REDIS lpush data for command %s", queryData["session_id"]);


                                            var callData;
                                            try {
                                                //callData = response.body;

                                                callData = response.body;

                                                uuid_dev["lastcommand"] = callData["action"];

                                                if (callData["posturl"]) {
                                                    uuid_dev["posturl"] = callData["posturl"];
                                                }

                                                if (callData["baseurl"]) {
                                                    uuid_dev["baseurl"] = callData["baseurl"];
                                                }

                                                if (callData.params) {

                                                    if (!uuid_dev["dev_params"]) {
                                                        uuid_dev["dev_params"] = {};
                                                    }

                                                    Object.keys(callData.params).forEach(function (key) {
                                                        var val = callData.params[key];


                                                        uuid_dev["dev_params"][key] = val;
                                                    });

                                                }

                                            }
                                            catch (e) {


                                                var eventFlowData = JSON.stringify({
                                                    Type: 'DATA',
                                                    Code: '',
                                                    URL: '',
                                                    APPID: uuid_dev["appid"],
                                                    Description: JSON.stringify(response.body),
                                                    SessionID: queryData["session_id"]
                                                });

                                                PublishDVPEventsMessage("DATAERROR", eventFlowData);
                                                logger.debug("HTTPProgrammingAPI.Handler REDIS Publish data for monitoring api %s %j", queryData["session_id"], eventFlowData);
                                                var date = new Date();
                                                var callreciveEvent = {
                                                    EventClass: 'APP',
                                                    EventType: 'ERROR',
                                                    EventCategory: 'DEVELOPER',
                                                    EventTime: date,
                                                    EventName: 'DEVELOPERDATAERROR',
                                                    EventData: uuid_data["appid"],
                                                    EventParams: '',
                                                    CompanyId: uuid_data["company"],
                                                    TenantId: uuid_data["tenant"],
                                                    SessionId: queryData["session_id"]
                                                };
                                                PublishDVPEventsMessage("DVPEVENTS", callreciveEvent);
                                                logger.debug("HTTPProgrammingAPI.Handler REDIS Publish data to event flow %s %j", queryData["session_id"], callreciveEvent);
                                                res.writeHead(200, {"Content-Type": "text/xml"});
                                                res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
                                                res.end();
                                                logger.error("HTTPProgrammingAPI.Handler RequestOut DeveloperAPP DataError %s %j", queryData["session_id"], callData);

                                                return next();
                                            }


                                            ////////////////////////////////////////


                                            var date = new Date();
                                            var callreciveEvent = {
                                                EventClass: 'APP',
                                                EventType: 'COMMAND',
                                                EventCategory: 'DEVELOPER',
                                                EventTime: date,
                                                EventName: callData["action"],
                                                EventData: uuid_data["appid"],
                                                EventParams: callData["display"],
                                                CompanyId: uuid_data["company"],
                                                TenantId: uuid_data["tenant"],
                                                SessionId: queryData["session_id"]
                                            };
                                            if (callData['eventlog'] == true) {
                                                PublishDVPEventsMessage("DVPEVENTS",callreciveEvent);
                                                logger.debug("HTTPProgrammingAPI.Handler REDIS Publish data to event flow %s %j", queryData["session_id"], callreciveEvent);

                                            }


                                            ////////////////////////////////////////

                                            //console.log(callData);
                                            //console.log("before note ............");


                                            if (callData["note"]) {
                                                AddNoteToEngagement(uuid_data["company"], uuid_data["tenant"], queryData["session_id"], callData["note"]);
                                            }

                                            //console.log(callData["action"]);


                                            if ((callData["action"] == "play" || callData["action"] == "playandgetdigits" )) {


                                                //console.log("inplay.....");


                                                var filenamex = callData["file"];
                                                var urlx;

                                                //console.log(filenamex);

                                                //console.log(config.Services);
                                                //console.log(uuid_data);

                                                if ((config.Services && config.Services.fileserviceurl && config.Services.fileserviceport && uuid_data['appid'])) {

                                                    ///DVP/API/'+version+'/FIleService/FileHandler/:filename/FileInfoForApplicationId/:appId

                                                    urlx = format("http://{0}/DVP/API/{1}/FileService/File/{2}/ofApplication/{3}", config.Services.fileserviceurl, config.Services.fileserviceVersion, filenamex, uuid_data['appid']);
                                                    if (validator.isIP(config.Services.fileserviceurl))
                                                        urlx = format("http://{0}:{1}/DVP/API/{2}/FileService/File/{3}/ofApplication/{4}", config.Services.fileserviceurl, config.Services.fileserviceport, config.Services.fileserviceVersion, filenamex, uuid_data['appid']);


                                                    logger.debug("Calling FILE service URL %s", urlx);
                                                    request.get({
                                                        url: urlx,
                                                        headers: {
                                                            authorization: token,
                                                            companyinfo: format("{0}:{1}", uuid_data["tenant"], uuid_data["company"])
                                                        }
                                                    }, function (_error, _response, datax) {

                                                        var fileID = filenamex;

                                                        try {

                                                            var filedata
                                                            if (_response)
                                                                filedata = JSON.parse(_response.body);

                                                            if (!_error && _response && _response.statusCode == 200 && filedata && filedata.Result && filedata.Result["UniqueId"]) {


                                                                logger.debug("HTTPProgrammingAPI.Handler Request File resolution Responsedata %d %j %j ", _response.statusCode, filedata, filedata.Result);


                                                                var ext = filedata.Result.FileStructure.split(/[/]+/).pop();
                                                                fileID = format("{0}.{1}", filedata.Result.UniqueId, ext);

                                                                //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                                                                ///DVP/API/'+version+'/FileService/File/Download/:id/:displayname

                                                                fileID = format("http://{0}/DVP/API/{1}/InternalFileService/File/DownloadLatest/{2}/{3}/{4}", config.Services.downloadurl, config.Services.downloaddurlVersion, uuid_data["tenant"], uuid_data["company"], filenamex);


                                                                if (validator.isIP(config.Services.downloadurl))
                                                                    fileID = format("http://{0}:{1}/DVP/API/{2}/InternalFileService/File/DownloadLatest/{3}/{4}/{5}", config.Services.downloadurl, config.Services.downloadport, config.Services.downloaddurlVersion, uuid_data["tenant"], uuid_data["company"], filenamex);

                                                                ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                                                                //fileID = "http://localhost/IVR/Duo_IVR_Menu.wav";

                                                                logger.debug("HTTPProgrammingAPI.Handler Request File resolution %s %s", queryData["session_id"], fileID);


                                                            }
                                                            else {


                                                                //uuid_data["tenant"],uuid_data["company"]
                                                                var companyLocation = format("{0}/{1}", uuid_data["tenant"], uuid_data["company"]);
                                                                fileID = format("{0}/{1}", companyLocation, filenamex);

                                                                logger.error("HTTPProgrammingAPI.Handler Request File resolution %s", queryData["session_id"]);
                                                                logger.error("Errors -----> " + _error + " " + _response);


                                                            }

                                                            ///////////////////////////////////////////////////////////////////////////
                                                            try {

                                                                logger.debug("HTTPProgrammingAPI.Handler CallOperation %s %j %s %s %j", queryData["session_id"], callData, uuid_data["domain"], uuid_data["profile"], queryData);

                                                                Operation(callData, fileID, mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"], '', '');
                                                            }
                                                            catch (exxx) {

                                                                console.log(exxx);

                                                            }
                                                            console.log("----------------------------------------------------> get result");

                                                            uuid_dev["result"] = callData["result"];

                                                            console.log("----------------------------------------------------> got result");


                                                            if (uuid_dev["baseurl"] != "none") {

                                                                console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                                uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                                uuid_dev["nexturl"] = format("{0}/{1}", uuid_dev["baseurl"], callData["nexturl"]);
                                                            }
                                                            else {

                                                                console.log("----------------------------------------------------> no base url");

                                                                uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                                uuid_dev["nexturl"] = callData["nexturl"];

                                                                console.log("DEV DATA -------------> %j", uuid_dev);
                                                                console.log("CALL DATA -------------> %j", callData);


                                                            }


                                                            logger.debug("HTTPProgrammingAPI.Handler APP NextURL  %s %s", queryData["session_id"], uuid_dev["nexturl"]);


                                                            try {
                                                                var redisData = JSON.stringify(uuid_dev);
                                                                redisClient.set(queryData["session_id"] + "_dev", redisData, redis.print);
                                                                logger.debug("HTTPProgrammingAPI.Handler SetRedis Data UUID_DEV %j", redisData);
                                                            }
                                                            catch (e) {
                                                                console.error(e);
                                                            }


                                                        } catch (exx) {

                                                            console.error(exx);

                                                        }


                                                    });
                                                } else {

                                                    var fileID = filenamex;
                                                    Operation(callData, fileID, mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"], '', '');

                                                }

                                            }

                                            else if (callData["action"] == "dialgateway") {


                                                var outbountruleurl;


                                                if ((config.Services && config.Services.ruleservice && config.Services.ruleserviceport)) {
                                                    //, uuid_data["tenant"],uuid_data["company"]

                                                    outbountruleurl = format("http://{0}/DVP/API/{1}/CallRule/Outbound/ANI/{2}/DNIS/{3}", config.Services.ruleservice, config.Services.ruleserviceVersion, callData["callernumber"], callData["number"]);


                                                    if (validator.isIP(config.Services.ruleservice))
                                                        outbountruleurl = format("http://{0}:{1}/DVP/API/{2}/CallRule/Outbound/ANI/{3}/DNIS/{4}", config.Services.ruleservice, config.Services.ruleserviceport, config.Services.ruleserviceVersion, callData["callernumber"], callData["number"]);
                                                }


                                                request.get({
                                                    url: outbountruleurl,
                                                    headers: {
                                                        'authorization': token,
                                                        'companyinfo': format("{0}:{1}", uuid_data["tenant"], uuid_data["company"])
                                                    }
                                                }, function (_error, _response, datax) {

                                                    // var fileID = filenamex;

                                                    var ani;
                                                    var gateway;
                                                    var dnis;

                                                    try {

                                                        if (!_error && _response.statusCode == 200 && _response.body && _response.body.IsSuccess) {


                                                            var ruledata = _response.body.Result;

                                                            callData["callernumber"] = ruledata["ANI"];
                                                            callData["number"] = ruledata["DNIS"];
                                                            callData["gateway"] = ruledata["GatewayCode"];


                                                            logger.debug("HTTPProgrammingAPI.Handler Request Gateway resolution %s %j", queryData["session_id"], ruledata);


                                                        }
                                                        else {

                                                            logger.error("HTTPProgrammingAPI.Handler Request Gateway resolution %s", queryData["session_id"]);

                                                            callData["action"] = "hangup";
                                                            callData["cause"] = "SERVICE_UNAVAILABLE";


                                                        }


                                                        logger.debug("HTTPProgrammingAPI.Handler CallOperation %s %j %s %s %j", queryData["session_id"], callData, uuid_data["domain"], uuid_data["profile"], queryData);


                                                        Operation(callData, callData["file"], mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"], '', '');

                                                        console.log("----------------------------------------------------> get result");

                                                        uuid_dev["result"] = callData["result"];

                                                        console.log("----------------------------------------------------> got result");


                                                        if (uuid_dev["baseurl"] != "none") {

                                                            console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                            uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                            uuid_dev["nexturl"] = format("{0}/{1}", uuid_dev["baseurl"], callData["nexturl"]);
                                                        }
                                                        else {

                                                            console.log("----------------------------------------------------> no base url");

                                                            uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                            uuid_dev["nexturl"] = callData["nexturl"];

                                                            console.log(uuid_dev["nexturl"]);

                                                            console.log("DEV DATA -------------> %j", uuid_dev);
                                                            console.log("CALL DATA -------------> %j", callData);


                                                        }


                                                        logger.debug("HTTPProgrammingAPI.Handler APP NextURL  %s %s", queryData["session_id"], uuid_dev["nexturl"]);


                                                        try {
                                                            var redisData = JSON.stringify(uuid_dev);
                                                            redisClient.set(queryData["session_id"] + "_dev", redisData, redis.print);
                                                            logger.debug("HTTPProgrammingAPI.Handler SetRedis Data UUID_DEV %j", redisData);
                                                        }
                                                        catch (e) {
                                                            console.error(e);
                                                        }
                                                    }
                                                    catch (reqex) {

                                                    }

                                                });
                                            }

                                            else if (callData["action"] == "queue") {


                                                var queueURL;


                                                if ((config.Services && config.Services.ards )) {


                                                    queueURL = format("http://{0}/ardsurl/{1}/{2}", config.Services.ards, uuid_data["tenant"], uuid_data["company"]);


                                                    if (validator.isIP(config.Services.ards))
                                                        queueURL = format("http://{0}:{1}/ardsurl/{2}/{3}", config.Services.ards, config.Services.ardsport, uuid_data["tenant"], uuid_data["company"]);


                                                }


                                                request.get({
                                                    url: queueURL,
                                                    headers: {
                                                        'authorization': token,
                                                        'companyinfo': format("{0}:{1}", uuid_data["tenant"], uuid_data["company"])
                                                    }
                                                }, function (_error, _response, datax) {


                                                    try {

                                                        if (!_error && _response.statusCode == 200 && _response.body && _response.body.IsSuccess) {


                                                            var urldata = _response.body.Result;

                                                            callData["ip"] = urldata["ip"];
                                                            callData["port"] = urldata["port"];

                                                            logger.debug("HTTPProgrammingAPI.Handler Request Queue resolution %s %j", queryData["session_id"], urldata);


                                                        }
                                                        else {

                                                            console.log("Get ARDS rule failed --------> ");
                                                            callData["ip"] = "127.0.0.1";
                                                            callData["port"] = 8084;

                                                            logger.error("HTTPProgrammingAPI.Handler Request Queue resolution %s", queryData["session_id"]);


                                                        }


                                                        logger.debug("HTTPProgrammingAPI.Handler CallOperation %s %j %s %s %j", queryData["session_id"], callData, uuid_data["domain"], uuid_data["profile"], queryData);


                                                        Operation(callData, callData["file"], mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"], callData["ip"], callData["port"]);

                                                        console.log("----------------------------------------------------> get result");

                                                        uuid_dev["result"] = callData["result"];

                                                        console.log("----------------------------------------------------> got result");


                                                        if (uuid_dev["baseurl"] != "none") {

                                                            console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                            uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                            uuid_dev["nexturl"] = format("{0}/{1}", uuid_dev["baseurl"], callData["nexturl"]);
                                                        }
                                                        else {

                                                            console.log("----------------------------------------------------> no base url");

                                                            uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                            uuid_dev["nexturl"] = callData["nexturl"];

                                                            console.log(uuid_dev["nexturl"]);

                                                            console.log("DEV DATA -------------> %j", uuid_dev);
                                                            console.log("CALL DATA -------------> %j", callData);
                                                        }


                                                        logger.debug("HTTPProgrammingAPI.Handler APP NextURL  %s %s", queryData["session_id"], uuid_dev["nexturl"]);


                                                        try {
                                                            var redisData = JSON.stringify(uuid_dev);
                                                            redisClient.set(queryData["session_id"] + "_dev", redisData, redis.print);
                                                            logger.debug("HTTPProgrammingAPI.Handler SetRedis Data UUID_DEV %j", redisData);
                                                        }
                                                        catch (e) {
                                                            console.error(e);
                                                        }
                                                    }
                                                    catch (reqex) {

                                                    }

                                                });
                                            }

                                            /////////////////////////////////////////ards command////////////////////////////////////////////////////////////////////////////
                                            else if (callData["action"] == "ards") {


                                                var profileURL;

                                                if ((config.Services && config.Services.qmusicurl )) {

                                                    profileURL = format("http://{0}/DVP/API/{1}/QueueMusic/Profile/{2}", config.Services.qmusicurl, config.Services.qmusicVersion, callData["profile"]);

                                                    if (validator.isIP(config.Services.qmusicurl))
                                                        profileURL = format("http://{0}:{1}/DVP/API/{2}/QueueMusic/Profile/{3}", config.Services.qmusicurl, config.Services.qmusicport, config.Services.qmusicVersion, callData["profile"]);


                                                }


                                                request.get({
                                                    url: profileURL,
                                                    headers: {
                                                        'authorization': token,
                                                        'companyinfo': format("{0}:{1}", uuid_data["tenant"], uuid_data["company"])
                                                    }
                                                }, function (_error, _response, datax) {


                                                    try {


                                                        if (!_error && _response && _response.statusCode == 200) {

                                                            var profileData = JSON.parse(_response.body);

                                                            if (profileData && profileData.IsSuccess && profileData.Result) {


                                                                if (profileData.Result.MOH)
                                                                    callData["MOH"] = profileData.Result.MOH;
                                                                else
                                                                    callData["MOH"] = "";

                                                                if (profileData.Result.Announcement)
                                                                    callData["Announcement"] = profileData.Result.Announcement;
                                                                else
                                                                    callData["Announcement"] = "";


                                                                if (profileData.Result.FirstAnnounement)
                                                                    callData["FirstAnnounement"] = profileData.Result.FirstAnnounement;
                                                                else
                                                                    callData["FirstAnnounement"] = "";

                                                                if (profileData.Result.AnnouncementTime)
                                                                    callData["AnnouncementTime"] = profileData.Result.AnnouncementTime;
                                                                else
                                                                    callData["AnnouncementTime"] = "";

                                                                if (profileData.Result.PositionAnnouncement)
                                                                    callData["PositionAnnouncement"] = "true";
                                                                else
                                                                    callData["PositionAnnouncement"] = "false";

                                                                if (profileData.Result.Language)
                                                                    callData["Language"] = profileData.Result.Language;
                                                                else
                                                                    callData["Language"] = "en";

                                                                if (profileData.Result.MaxQueueTime)
                                                                    callData["MaxQueueTime"] = profileData.Result.MaxQueueTime;
                                                                else
                                                                    callData["MaxQueueTime"] = "0";

                                                                if (profileData.Result.DialTime)
                                                                    callData["DialTime"] = profileData.Result.DialTime;
                                                                else
                                                                    callData["DialTime"] = "30";


                                                                if (profileData.Result.DialTime)
                                                                    callData["DialTime"] = profileData.Result.DialTime;
                                                                else
                                                                    callData["DialTime"] = "30";

                                                                if (profileData.Result.BusinessUnit)
                                                                    callData["BusinessUnit"] = profileData.Result.BusinessUnit;
                                                                else
                                                                    callData["BusinessUnit"] = "default";





                                                                if (callData['company'] && callData['tenant']) {

                                                                    uuid_data['company'] = callData['company'];
                                                                    uuid_data['tenant'] = callData['tenant'];

                                                                } else {

                                                                    callData['company'] = uuid_data['company'];
                                                                    callData['tenant'] = uuid_data['tenant'];

                                                                }


                                                                logger.debug("HTTPProgrammingAPI.Handler Request profile resolution %s %j", queryData["session_id"], profileData);

                                                            } else {

                                                                console.log("Get ARDS rule failed --------> ");
                                                                callData["MOH"] = "";
                                                                callData["Announcement"] = "";
                                                                callData["FirstAnnounement"] = "";
                                                                callData["AnnouncementTime"] = "";
                                                                callData['company'] = "";
                                                                callData['tenant'] = "";

                                                                logger.error("HTTPProgrammingAPI.Handler Request Profile resolution %s", queryData["session_id"]);

                                                            }
                                                        }
                                                        else {

                                                            console.log("Get ARDS rule failed --------> ");
                                                            callData["MOH"] = "";
                                                            callData["Announcement"] = "";
                                                            callData["FirstAnnounement"] = "";
                                                            callData["AnnouncementTime"] = "";
                                                            callData['company'] = uuid_data['company'];
                                                            callData['tenant'] = uuid_data['tenant'];


                                                            logger.error("HTTPProgrammingAPI.Handler Request Profile resolution %s", queryData["session_id"]);


                                                        }


                                                        logger.debug("HTTPProgrammingAPI.Handler CallOperation %s %j %s %s %j", queryData["session_id"], callData, uuid_data["domain"], uuid_data["profile"], queryData);


                                                        Operation(callData, callData["file"], mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"], callData["ip"], callData["port"]);

                                                        console.log("----------------------------------------------------> get result");

                                                        uuid_dev["result"] = callData["result"];

                                                        console.log("----------------------------------------------------> got result");


                                                        if (uuid_dev["baseurl"] != "none") {

                                                            console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                            uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                            uuid_dev["nexturl"] = format("{0}/{1}", uuid_dev["baseurl"], callData["nexturl"]);
                                                        }
                                                        else {

                                                            console.log("----------------------------------------------------> no base url");

                                                            uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                            uuid_dev["nexturl"] = callData["nexturl"];

                                                            console.log(uuid_dev["nexturl"]);

                                                            console.log("DEV DATA -------------> %j", uuid_dev);
                                                            console.log("CALL DATA -------------> %j", callData);
                                                        }


                                                        logger.debug("HTTPProgrammingAPI.Handler APP NextURL  %s %s", queryData["session_id"], uuid_dev["nexturl"]);


                                                        try {
                                                            var redisData = JSON.stringify(uuid_dev);
                                                            redisClient.set(queryData["session_id"] + "_dev", redisData, redis.print);
                                                            logger.debug("HTTPProgrammingAPI.Handler SetRedis Data UUID_DEV %j", redisData);
                                                        }
                                                        catch (e) {
                                                            console.error(e);
                                                        }
                                                    }
                                                    catch (reqex) {

                                                        console.error(reqex);

                                                    }

                                                });
                                            }

                                            else if (callData["action"] == "ticket") {

                                                CreateTicket("call", queryData["session_id"], uuid_data["company"], uuid_data["tenant"], callData["type"], callData["subject"], callData["description"], callData["prority"], callData["tags"],undefined, function (success, resu) {

                                                    callData["action"] = "continue";

                                                    logger.debug("HTTPProgrammingAPI.Handler CallOperation %s %j %s %s %j", queryData["session_id"], callData, uuid_data["domain"], uuid_data["profile"], queryData);

                                                    uuid_dev["dev_params"]["ticket_reference"] = resu;

                                                    Operation(callData, callData["file"], mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"]);

                                                    console.log("----------------------------------------------------> get result");

                                                    uuid_dev["result"] = callData["result"];

                                                    console.log("----------------------------------------------------> got result");


                                                    if (uuid_dev["baseurl"] != "none") {

                                                        console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                        uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                        uuid_dev["nexturl"] = format("{0}/{1}", uuid_dev["baseurl"], callData["nexturl"]);
                                                    }
                                                    else {

                                                        console.log("----------------------------------------------------> no base url");

                                                        uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                        uuid_dev["nexturl"] = callData["nexturl"];

                                                        console.log(uuid_dev["nexturl"]);


                                                        console.log("DEV DATA -------------> %j", uuid_dev);
                                                        console.log("CALL DATA -------------> %j", callData);


                                                    }


                                                    logger.debug("HTTPProgrammingAPI.Handler APP NextURL  %s %s", queryData["session_id"], uuid_dev["nexturl"]);


                                                    try {
                                                        var redisData = JSON.stringify(uuid_dev);
                                                        redisClient.set(queryData["session_id"] + "_dev", redisData, redis.print);
                                                        logger.debug("HTTPProgrammingAPI.Handler SetRedis Data UUID_DEV %j", redisData);
                                                    }
                                                    catch (e) {
                                                        console.error(e);
                                                    }


                                                });

                                            }

                                            else if (callData["action"] == "profile") {

                                                var profile;
                                                if (uuid_dev["dev_params"] && uuid_dev["dev_params"]["profile"]) {

                                                    profile = uuid_dev["dev_params"]["profile"];
                                                }

                                                console.info("Calling user attribute --------------------> ----------------> " + profile);
                                                GetUserAttributes(uuid_data["company"], uuid_data["tenant"], profile, callData["attribute"], function (success, resu) {

                                                    callData["action"] = "continue";

                                                    logger.debug("HTTPProgrammingAPI.Handler CallOperation %s %j %s %s %j", queryData["session_id"], callData, uuid_data["domain"], uuid_data["profile"], queryData);

                                                    if (resu && callData["key"]) {
                                                        callData["attribute"] = resu;

                                                        if (!uuid_dev["dev_params"]) {
                                                            uuid_dev["dev_params"] = {};
                                                        }


                                                        uuid_dev["dev_params"][callData["key"]] = resu;

                                                    }

                                                    Operation(callData, callData["file"], mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"]);

                                                    console.log("----------------------------------------------------> get result");

                                                    uuid_dev["result"] = callData["result"];

                                                    console.log("----------------------------------------------------> got result");


                                                    if (uuid_dev["baseurl"] != "none") {

                                                        console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                        uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                        uuid_dev["nexturl"] = format("{0}/{1}", uuid_dev["baseurl"], callData["nexturl"]);
                                                    }
                                                    else {

                                                        console.log("----------------------------------------------------> no base url");

                                                        uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                        uuid_dev["nexturl"] = callData["nexturl"];

                                                        console.log(uuid_dev["nexturl"]);


                                                        console.log("DEV DATA -------------> %j", uuid_dev);
                                                        console.log("CALL DATA -------------> %j", callData);


                                                    }


                                                    logger.debug("HTTPProgrammingAPI.Handler APP NextURL  %s %s", queryData["session_id"], uuid_dev["nexturl"]);


                                                    try {
                                                        var redisData = JSON.stringify(uuid_dev);
                                                        redisClient.set(queryData["session_id"] + "_dev", redisData, redis.print);
                                                        logger.debug("HTTPProgrammingAPI.Handler SetRedis Data UUID_DEV %j", redisData);
                                                    }
                                                    catch (e) {
                                                        console.error(e);
                                                    }


                                                });

                                            }

                                            else if (callData["action"] == "updateprofile") {

                                                var profile;
                                                if (uuid_dev["dev_params"] && uuid_dev["dev_params"]["profile"]) {

                                                    profile = uuid_dev["dev_params"]["profile"];
                                                }

                                                console.info("Calling user attribute update--------------------> ----------------> " + profile);
                                                UpdateUserAttributes(uuid_data["company"], uuid_data["tenant"], profile, callData["attribute"], callData["value"], function (success, resu) {

                                                    callData["action"] = "continue";

                                                    logger.debug("HTTPProgrammingAPI.Handler CallOperation %s %j %s %s %j", queryData["session_id"], callData, uuid_data["domain"], uuid_data["profile"], queryData);

                                                    if (resu && callData["key"]) {
                                                        callData["attribute"] = resu;

                                                        if (!uuid_dev["dev_params"]) {
                                                            uuid_dev["dev_params"] = {};
                                                        }


                                                        uuid_dev["dev_params"][callData["key"]] = resu;

                                                    }

                                                    Operation(callData, callData["file"], mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"]);

                                                    console.log("----------------------------------------------------> get result");

                                                    uuid_dev["result"] = callData["result"];

                                                    console.log("----------------------------------------------------> got result");


                                                    if (uuid_dev["baseurl"] != "none") {

                                                        console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                        uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                        uuid_dev["nexturl"] = format("{0}/{1}", uuid_dev["baseurl"], callData["nexturl"]);
                                                    }
                                                    else {

                                                        console.log("----------------------------------------------------> no base url");

                                                        uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                        uuid_dev["nexturl"] = callData["nexturl"];

                                                        console.log(uuid_dev["nexturl"]);


                                                        console.log("DEV DATA -------------> %j", uuid_dev);
                                                        console.log("CALL DATA -------------> %j", callData);


                                                    }


                                                    logger.debug("HTTPProgrammingAPI.Handler APP NextURL  %s %s", queryData["session_id"], uuid_dev["nexturl"]);


                                                    try {
                                                        var redisData = JSON.stringify(uuid_dev);
                                                        redisClient.set(queryData["session_id"] + "_dev", redisData, redis.print);
                                                        logger.debug("HTTPProgrammingAPI.Handler SetRedis Data UUID_DEV %j", redisData);
                                                    }
                                                    catch (e) {
                                                        console.error(e);
                                                    }


                                                });

                                            }

                                            else if (callData["action"] == "csat") {


                                                console.log("CSAT Running");
                                                var profile;
                                                if (uuid_dev["dev_params"] && uuid_dev["dev_params"]["profile"]) {

                                                    profile = uuid_dev["dev_params"]["profile"];
                                                }

                                                console.log("variable_ARDS-Resource-Profile-Name -------------------------------------------------------------> " + uuid_dev["resource"]);

                                                CreateSubmission(uuid_data["company"], uuid_data["tenant"], queryData["session_id"], uuid_dev["resource"], profile, callData["satisfaction"], callerID, function (success, resu) {

                                                    callData["action"] = "continue";

                                                    logger.debug("HTTPProgrammingAPI.Handler CallOperation %s %j %s %s %j", queryData["session_id"], callData, uuid_data["domain"], uuid_data["profile"], queryData);


                                                    Operation(callData, callData["file"], mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"]);

                                                    console.log("----------------------------------------------------> get result");

                                                    uuid_dev["result"] = callData["result"];

                                                    console.log("----------------------------------------------------> got result");


                                                    if (uuid_dev["baseurl"] != "none") {

                                                        console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                        uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                        uuid_dev["nexturl"] = format("{0}/{1}", uuid_dev["baseurl"], callData["nexturl"]);
                                                    }
                                                    else {

                                                        console.log("----------------------------------------------------> no base url");

                                                        uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                        uuid_dev["nexturl"] = callData["nexturl"];

                                                        console.log(uuid_dev["nexturl"]);


                                                        console.log("DEV DATA -------------> %j", uuid_dev);
                                                        console.log("CALL DATA -------------> %j", callData);


                                                    }


                                                    logger.debug("HTTPProgrammingAPI.Handler APP NextURL  %s %s", queryData["session_id"], uuid_dev["nexturl"]);

                                                    try {
                                                        var redisData = JSON.stringify(uuid_dev);
                                                        redisClient.set(queryData["session_id"] + "_dev", redisData, redis.print);
                                                        logger.debug("HTTPProgrammingAPI.Handler SetRedis Data UUID_DEV %j", redisData);
                                                    }
                                                    catch (e) {
                                                        console.error(e);
                                                    }
                                                });
                                            }
                                            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


                                            else {

                                                ///////////////////////////////////////////////////////////////////////////

                                                logger.debug("HTTPProgrammingAPI.Handler CallOperation %s %j %s %s %j", queryData["session_id"], callData, uuid_data["domain"], uuid_data["profile"], queryData);


                                                Operation(callData, callData["file"], mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"]);

                                                console.log("----------------------------------------------------> get result");

                                                uuid_dev["result"] = callData["result"];

                                                console.log("----------------------------------------------------> got result");


                                                if (uuid_dev["baseurl"] != "none") {

                                                    console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                    uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                    uuid_dev["nexturl"] = format("{0}/{1}", uuid_dev["baseurl"], callData["nexturl"]);
                                                }
                                                else {

                                                    console.log("----------------------------------------------------> no base url");

                                                    uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                    uuid_dev["nexturl"] = callData["nexturl"];

                                                    console.log(uuid_dev["nexturl"]);


                                                    console.log("DEV DATA -------------> %j", uuid_dev);
                                                    console.log("CALL DATA -------------> %j", callData);


                                                }


                                                logger.debug("HTTPProgrammingAPI.Handler APP NextURL  %s %s", queryData["session_id"], uuid_dev["nexturl"]);


                                                try {
                                                    var redisData = JSON.stringify(uuid_dev);
                                                    redisClient.set(queryData["session_id"] + "_dev", redisData, redis.print);
                                                    logger.debug("HTTPProgrammingAPI.Handler SetRedis Data UUID_DEV %j", redisData);
                                                }
                                                catch (e) {
                                                    console.error(e);
                                                }

                                                ////////////
                                            }

                                            return next();

                                        }
                                        else {

                                            //redisClient.lpush(queryData["Caller-Destination-Number"] + "_error", response.statusCode + "\n" + uuid_dev["nexturl"], redis.print);

                                            if (response) {

                                                var callreciveEvent = JSON.stringify({
                                                    Type: 'HTTP',
                                                    Code: response.statusCode,
                                                    URL: uuid_dev["nexturl"],
                                                    APPID: uuid_dev["appid"],
                                                    SessionID: queryData["session_id"],
                                                    Description: response.body
                                                });

                                                PublishDVPEventsMessage("HTTPERROR", callreciveEvent);


                                                logger.debug("HTTPProgrammingAPI.Handler REDIS Publish error for monitoring api %s %j", queryData["session_id"], callreciveEvent);

                                            } else {

                                                var callreciveEvent = JSON.stringify({
                                                    Type: 'HTTP',
                                                    Code: 0000,
                                                    URL: uuid_dev["nexturl"],
                                                    APPID: uuid_dev["appid"],
                                                    SessionID: queryData["session_id"],
                                                    Description: "no response"
                                                });
                                                PublishDVPEventsMessage("HTTPERROR", callreciveEvent);


                                                logger.debug("HTTPProgrammingAPI.Handler REDIS Publish error for monitoring api %s %j", queryData["session_id"], callreciveEvent);

                                            }


                                            logger.error("HTTPProgrammingAPI.Handler RequestOut %s with response", queryData["session_id"]);


                                            var date = new Date();
                                            var callreciveEvent = {
                                                EventClass: 'APP',
                                                EventType: 'ERROR',
                                                EventCategory: 'DEVELOPER',
                                                EventTime: date,
                                                EventName: 'DEVELOPERHTTPERROR',
                                                EventData: uuid_data["appid"],
                                                EventParams: '',
                                                CompanyId: uuid_data["company"],
                                                TenantId: uuid_data["tenant"],
                                                SessionId: queryData["session_id"]
                                            };
                                            PublishDVPEventsMessage("DVPEVENTS", callreciveEvent);

                                            logger.debug("HTTPProgrammingAPI.Handler REDIS Publish data to event flow %s %j", queryData["session_id"], callreciveEvent);


                                            res.writeHead(200, {"Content-Type": "text/xml"});
                                            res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
                                            res.end();

                                        }

                                    }
                                });
                            }
                        });
                    }
                });
            }
        }
    });


    return next();
};


function HandleDebugFunction(queryData, req, res, next) {


    //console.log(req.url);
    //var queryData = url.parse(req.url, true).query;


    if (queryData["exiting"] == "true") {


        redisClient.del(queryData["session_id"] + "_dev", redis.print);
        redisClient.del(queryData["session_id"] + "_command", redis.print);
        //redisClient.del(queryData["session_id"] + "_result", redis.print);
        redisClient.del(queryData["session_id"] + "_data", redis.print);
        //redisClient.lrem(queryData["Caller-Destination-Number"] + "_live" , 0 , queryData["session_id"], redis.print);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.write(JSON.stringify({info: "Call Drop NORMAL"}));
        res.end();

        return next();

    }

server.opts('/HTTPProgramingApi/HealthCheck', function(req,res,next)
{
    res.end('OK');

    return next();

});

server.get('/HTTPProgramingApi/HealthCheck', function(req,res,next)
{
    res.end('OK');

    return next();

});
    redisClient.get(queryData["session_id"] + "_data", function (err, sessiondata) {

        var uuid_dev;
        if (err) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.write(JSON.stringify({info: "Call Drop NODATA for given session"}));
            res.end();
        }
        else {
            //console.log("Worked: " + sessiondata);
            var uuid_data = JSON.parse(sessiondata);

            if (!sessiondata) {

                uuid_data = { path: "http://localhost:8081", company: 1, tenant: 3, pbx: 'none', appid:'none', domain:'none', profile:'default', env:'debug'};
            }




            if (!uuid_data) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.write(JSON.stringify({info: "Call Drop NODATA for given session"}));
                res.end();

            }
            else {
                redisClient.get(queryData["session_id"] + "_dev", function (err, value) {

                    var uuid_dev;
                    if (err) {
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.write(JSON.stringify({info: "Call Drop NODEVDATA for given session"}));
                        res.end();
                    }
                    else {

                        uuid_dev = JSON.parse(value);
                        if (!value) {

                            var basurl = "none";
                            var nxurl = uuid_data["path"];
                            if (uuid_data["app"]) {
                                nxurl = format("{0}/{1}", uuid_data["path"], uuid_data["nexturl"])
                                basurl = uuid_data["path"];
                            }


                            uuid_dev = { serverdata: queryData, nexturl: nxurl, currenturl: "none", result: "result", lastcommand: "none", lastresult: "none", company: uuid_data["company"], tenant: uuid_data["tenant"], posturl: "none", baseurl: basurl, appid:  uuid_data["appid"]};
                            //redisClient.lpush(queryData["Caller-Destination-Number"] + "_live", queryData["session_id"], redis.print);
                            console.log("Update UUID_DEV ----> %j",uuid_dev)

                        }


                        var resultValue = "none";
                        if (queryData[uuid_dev["result"]]) {
                            resultValue = queryData[uuid_dev["result"]];
                            uuid_dev["lastresult"] = resultValue;

                        }
                        //redisClient.lpush(queryData["session_id"] + "_result", resultValue, redis.print);

                        var body = { session: queryData["session_id"], direction: queryData["Caller-Direction"], ani: queryData["Caller-Caller-ID-Number"], dnis: queryData["Caller-Destination-Number"], name: queryData["Caller-Caller-ID-Name"], result: resultValue };
                        // var data = JSON.stringify(body);

                        var options = { url: uuid_dev["nexturl"],headers: {'authorization': token, 'companyinfo': format("{0}:{1}",uuid_data["tenant"],uuid_data["company"])}, method: "POST", json: body };



                        var debugdata = [];
                        debugdata.push({type:"message", info: "Call user application", data: body, url:uuid_dev["nexturl"]});



                        request(options, function (error, response, data) {

                            if (!error && response.statusCode == 200) {

                                console.log(response.body)
                                console.log(data);
                                redisClient.lpush(queryData["session_id"] + "_command", JSON.stringify(response.body), redis.print);

                                debugdata.push({type:"message", info: "Receive data from client app", data: {url:uuid_dev["nexturl"], response: response.body, statuscode: response.statuscode}});


                                var callData;
                                try {
                                    callData = response.body;
                                    uuid_dev["lastcommand"] = callData["action"];

                                    if (callData["posturl"]) {
                                        uuid_dev["posturl"] = callData["posturl"];
                                    }

                                    if (callData["baseurl"]) {
                                        uuid_dev["baseurl"] = callData["baseurl"];
                                    }

                                }
                                catch (e) {


                                    debugdata.push({type:"error", info: "Data recived not in correct format", error: e});


                                    res.writeHead(200, { "Content-Type": "application/json" });
                                    res.write(JSON.stringify(debugdata));
                                    res.end();

                                    return next();
                                }



                                var url;


                                var filenamex = callData["file"];

                                if((config.Services && config.Services.downloadurl && config.Services.downloadport && uuid_data['appid'])) {


                                    url = format("http://{0}/{1}/GetFileIDForName/{2}", config.Services.downloadurl, filenamex, uuid_data['appid']);

                                    if(validator.isIP(config.Services.downloadurl))
                                        url = format("http://{0}:{1}/{2}/GetFileIDForName/{3}", config.Services.downloadurl,config.Services.downloadport, filenamex, uuid_data['appid']);

                                    logger.debug("Calling FILE service URL %s",url);
                                }



                                if((callData["action"] == "play" || callData["action"] == "playandgetdigits" ) ) {

                                    request.get({url:url,headers: {'authorization': token, 'companyinfo': format("{0}:{1}",uuid_data["tenant"],uuid_data["company"])}}, function (_error, _response, datax) {

                                        var fileID = filenamex;

                                        try {
                                            var filedata = _response.body;
                                            if (!_error && _response.statusCode == 200 && filedata && filedata["fileID"]) {

                                                fileID = filedata["fileID"];


                                            }
                                            else {

                                                console.log("file resolution failed --------> ");

                                                //uuid_data["tenant"],uuid_data["company"]
                                                var companyLocation = format("{0}_{1}",uuid_data["tenant"], uuid_data["company"]);
                                                fileID = format("{0}/{1}",companyLocation, filenamex);

                                                debugdata.push({type:"warnning", info: "File resolution failed", file: filenamex});


                                            }

                                            ///////////////////////////////////////////////////////////////////////////
                                            try {

                                                OperationDebug(debugdata, callData, fileID, mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"], '', '');
                                            }
                                            catch(exxx){

                                                console.log(exxx);

                                            }
                                            console.log("----------------------------------------------------> get result");

                                            uuid_dev["result"] = callData["result"];



                                            console.log("----------------------------------------------------> got result");


                                            if (uuid_dev["baseurl"] != "none" ) {

                                                console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                uuid_dev["nexturl"] = format("{0}/{1}", uuid_dev["baseurl"], callData["nexturl"]);
                                            }
                                            else {

                                                console.log("----------------------------------------------------> no base url");

                                                uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                uuid_dev["nexturl"] = callData["nexturl"];

                                                console.log(uuid_dev["nexturl"]);
                                            }


                                            try {
                                                var redisData = JSON.stringify(uuid_dev);
                                                redisClient.set(queryData["session_id"] + "_dev", redisData, redis.print);
                                                logger.debug("HTTPProgrammingAPI.Handler SetRedis Data UUID_DEV %j",redisData);
                                            }
                                            catch (e) {
                                                console.error(e);
                                            }


                                        } catch (exx) {

                                        }


                                    });

                                } else if(callData["action"] == "dialgateway"){


                                    var outbountruleurl;


                                    if((config.Services && config.Services.ruleservice && config.Services.ruleserviceport)) {


                                        outbountruleurl = format("http://{0}/Outbound/ANI/{1}/DNIS/{2}", config.Services.ruleservice, callData["callernumber"], callData["number"]);


                                        if(validator.isIP(config.Services.ruleservice))
                                            outbountruleurl = format("http://{0}:{1}/Outbound/ANI/{2}/DNIS/{3}", config.Services.ruleservice,config.Services.ruleserviceport, callData["callernumber"], callData["number"]);
                                    }


                                    request.get({url:outbountruleurl,headers: {'authorization': token, 'companyinfo': format("{0}:{1}",uuid_data["tenant"],uuid_data["company"])}}, function (_error, _response, datax) {

                                        // var fileID = filenamex;

                                        var ani;
                                        var gateway;
                                        var dnis;

                                        try {

                                            if (!_error && _response.statusCode == 200 && _response.body && _response.body.IsSuccess) {


                                                var ruledata = _response.body.Result;

                                                callData["callernumber"] = ruledata["ani"];
                                                callData["number"] =  ruledata["dnis"];
                                                callData["gateway"] = ruledata["gateway"];


                                            }
                                            else {

                                                console.log("Get outbound rule failed --------> ");
                                                callData["action"] = "hangup";
                                                callData["cause"] =  "SERVICE_UNAVAILABLE";


                                            }


                                            OperationDebug(debugdata,callData, callData["file"], mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"], '',  '');

                                            console.log("----------------------------------------------------> get result");

                                            uuid_dev["result"] = callData["result"];

                                            console.log("----------------------------------------------------> got result");


                                            if (uuid_dev["baseurl"] != "none" ) {

                                                console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                uuid_dev["nexturl"] = format("{0}/{1}", uuid_dev["baseurl"], callData["nexturl"]);
                                            }
                                            else {

                                                console.log("----------------------------------------------------> no base url");

                                                uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                uuid_dev["nexturl"] = callData["nexturl"];

                                                console.log(uuid_dev["nexturl"]);
                                            }


                                            try {
                                                var redisData = JSON.stringify(uuid_dev);
                                                redisClient.set(queryData["session_id"] + "_dev", redisData, redis.print);
                                                logger.debug("HTTPProgrammingAPI.Handler SetRedis Data UUID_DEV %j",redisData);
                                            }
                                            catch (e) {
                                                console.error(e);
                                            }
                                        }
                                        catch (reqex) {

                                        }

                                    });
                                }

                                else if(callData["action"] == "queue"){


                                    var queueURL;


                                    if((config.Services && config.Services.ards )) {

                                        queueURL = format("http://{0}/ardsurl/{1}/{2}", config.Services.ards,  uuid_data["tenant"],uuid_data["company"]);


                                        if(validator.isIP(config.Services.ards))
                                            queueURL = format("http://{0}:{1}/ardsurl/{2}/{3}", config.Services.ards,config.Services.ardsport,  uuid_data["tenant"],uuid_data["company"]);

                                    }


                                    request.get({url:queueURL,headers: {authorization: token, companyinfo: format("{0}:{1}",uuid_data["tenant"],uuid_data["company"])}}, function (_error, _response, datax) {


                                        try {
                                            var urldata = _response.body;
                                            if (!_error && _response.statusCode == 200 && ruledata) {


                                                callData["ip"] =  urldata["ip"];
                                                callData["port"] = urldata["port"];


                                            }
                                            else {

                                                console.log("Get ARDS rule failed --------> ");
                                                callData["ip"] =  "127.0.0.1";
                                                callData["port"] = 8084;


                                            }


                                            OperationDebug(debugdata,callData, callData["file"], mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"], callData["ip"],  callData["port"]);

                                            console.log("----------------------------------------------------> get result");

                                            uuid_dev["result"] = callData["result"];

                                            console.log("----------------------------------------------------> got result");


                                            if (uuid_dev["baseurl"] != "none" ) {

                                                console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                uuid_dev["nexturl"] = format("{0}/{1}", uuid_dev["baseurl"], callData["nexturl"]);
                                            }
                                            else {

                                                console.log("----------------------------------------------------> no base url");

                                                uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                uuid_dev["nexturl"] = callData["nexturl"];

                                                console.log(uuid_dev["nexturl"]);
                                            }


                                            try {
                                                var redisData = JSON.stringify(uuid_dev);
                                                redisClient.set(queryData["session_id"] + "_dev", redisData, redis.print);
                                                logger.debug("HTTPProgrammingAPI.Handler SetRedis Data UUID_DEV %j",redisData);
                                            }
                                            catch (e) {
                                                console.error(e);
                                            }
                                        }
                                        catch (reqex) {

                                        }

                                    });
                                }


                                else {

                                    ///////////////////////////////////////////////////////////////////////////

                                    OperationDebug(debugdata,callData, callData["file"], mainServer, queryData, res,uuid_data["domain"],uuid_data["profile"]);

                                    console.log("----------------------------------------------------> get result");

                                    uuid_dev["result"] = callData["result"];

                                    console.log("----------------------------------------------------> got result");


                                    if (uuid_dev["baseurl"] != "none" ) {

                                        console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                        uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                        uuid_dev["nexturl"] = format("{0}/{1}", uuid_dev["baseurl"], callData["nexturl"]);
                                    }
                                    else {

                                        console.log("----------------------------------------------------> no base url");

                                        uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                        uuid_dev["nexturl"] = callData["nexturl"];

                                        console.log(uuid_dev["nexturl"]);
                                    }


                                    try {
                                        var redisData = JSON.stringify(uuid_dev);
                                        redisClient.set(queryData["session_id"] + "_dev", redisData, redis.print);
                                        logger.debug("HTTPProgrammingAPI.Handler SetRedis Data UUID_DEV %j",redisData);
                                    }
                                    catch (e) {
                                        console.error(e);
                                    }

                                    ////////////
                                }

                                return next();

                            }
                            else {

                                //redisClient.lpush(queryData["Caller-Destination-Number"] + "_error", response.statusCode + "\n" + uuid_dev["nexturl"], redis.print);

                                //redisClient.publish("SYS:HTTPPROGRAMMING:HTTPERROR", JSON.stringify({Type: 'HTTP', Code: response.statusCode, URL: uuid_dev["nexturl"], APPID: uuid_dev["appid"], SessionID: queryData["session_id"], Description: response.body  }), redis.print)

                                if(error)
                                {
                                    debugdata.push({type:"error", info: "Error in developer app calling",
                                        data: {
                                            Code: 000,
                                            URL: uuid_dev["nexturl"],
                                            APPID: uuid_dev["appid"],
                                            Description: error.message
                                        }
                                    });


                                }else {
                                    if(response) {
                                        debugdata.push({type:"error",
                                            info: "Error in developer app calling",
                                            data: {
                                                Code: response.statusCode,
                                                URL: uuid_dev["nexturl"],
                                                APPID: uuid_dev["appid"],
                                                Description: response.body
                                            }
                                        });
                                    }else{
                                        debugdata.push({type:"error",
                                            info: "Error in developer app calling",
                                            data: {
                                                Code: 000,
                                                URL: uuid_dev["nexturl"],
                                                APPID: uuid_dev["appid"],
                                                Description: "NO ERROR"
                                            }
                                        });


                                    }

                                }
                                //res.writeHead(200, { "Content-Type": "application/json" });
                                res.write(JSON.stringify(debugdata));
                                res.end();

                            }
                        });
                    }
                });
            }
        }
    });


    return next();
};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


server.post('/debug/create', function DataHandle(req, res, next) {


    //var data = convertUrlEncoded(req.body);

    var url = req.body["url"];
    var company = req.body["company"];
    var tenant = req.body["tenant"];
    var appid = req.body["appid"];
    var app = req.body["app"];

    var varUuid = uuid.v1();



    var uuid_data = { path: url, company: company, tenant: tenant, pbx: 'none', appid: appid, domain:'192.168.8.100', profile: 'default', app: app };
    var redisData = JSON.stringify(uuid_data);
    redisClient.set(varUuid + "_data", redisData, function(err, value) {

        if(!err) {

            res.write(varUuid);
            res.end();

        }
    });


    return next();




});


server.post('/debug/push', function DataHandle(req, res, next) {




    console.log("POST recived .... ");
    //postData(req, res);
    HandleDebugFunction(req.body, req, res, next);

});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
server.post('/', function DataHandle(req, res, next) {
    
    console.log("POST recived .... ");
    postData(req, res);
    HandleFunction(req.body, req, res, next);

});


server.get('/', function CallHandle(req, res, next) {
    
    
    //console.log(req.url);
    var queryData = {};

    try {
        queryData = url.parse(req.url, true).query;
    }catch(ex){
        console.log(ex);
    }
    
    HandleFunction(queryData, req, res, next);

});


server.post('/sms', function CallHandle(req, res, next) {


    HandleSMS(req, res, next);

});


server.post('/testsms', function CallHandle(req, res, next) {


    var response = {};
    response["action"] = "ticket";
    response["type"] = "complain";
    response["subject"]= "sms test";
    response["description"] = "ticket description";
    response["priority"] = "low";
    response["tags"] = "complain.product.tv.display";
    res.write(JSON.stringify(response));
    res.end();
    next();

});

//messageGenerator.Playback("file", "tempURL", "paramName", "errorFile", "digitTimeout", "inputTimeout", "loops", "terminators", "strip");


server.post('/routex', function(req,res, next){

    var data = req.body;


    var destinationURL = format("http://{0}:8080/api/originate?", "127.0.0.1");
    var params = format('{originate_timeout=20,return_ring_ready=true,Originate_session_uuid={0}{1}',data.SessionID, '}');
    var socketdata = format('&socket({0}:{1} async full)', '127.0.0.1',2233);
    var args = format('{1} {0}user/{2} 5555',params, destinationURL, data.Extention);

    console.log(args);

    request(args, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body) // Show the HTML for the Google homepage.

            var arr = body.split(" ");

            if(arr.length > 1) {

                if(arr[0] == '-ERR'){

                    res.send(503, new Error(arr[1]));



                }

            }

            res.end();


        }
        else{

            res.end();
        }
    })

    //http://127.0.0.1:8080/api/originate?%20{return_ring_ready=true,ignore_early_media=false,Originate_session_uuid=1793e788-b4e3-45c0-a4f8-ccee8efe0f04}user/1001%205555



    next();



});

server.opts('/HTTPProgramingApi/HealthCheck', function(req,res,next)
{
    res.end('OK');

    return next();

});

server.get('/HTTPProgramingApi/HealthCheck', function(req,res,next)
{
    res.end('OK');

    return next();

})

process.stdin.resume();
