﻿var restify = require('restify');
var fs = require('fs');
var url = require('url');
var messageGenerator = require('./MessageGenerator.js');
var config = require('config');
var colors = require('colors');
var http = require('http');
var redis = require('redis');
var request = require('request');
var FormData = require('form-data');
//var util = require('util');
var Regex = require("regex");
var format = require("stringformat");
var uuid = require('node-uuid');
var logger = require('DVP-Common/LogHandler/CommonLogHandler.js').logger;

//console.log(messageGenerator.DTMFType("xxxxxxxxxx", "yyyyyyyyyyyyyyyyy", "inband"));




var mainServer = format("http://{0}:{1}", config.LBServer.ip, config.LBServer.port);

//var mainServer = config.LBServer.path;

////////////////////////////////redis////////////////////////////////////////
var redisClient = redis.createClient(config.Redis.port, config.Redis.ip);
redisClient.on('error', function (err) {
    console.log('Error '.red, err);
});
////////////////////////////////////////////////////////////////////////////////


////////////////////////////////rest server///////////////////////////////////////////////////////////////////////////
var server = restify.createServer();
server.use(restify.fullResponse()).use(restify.bodyParser());
server.listen(config.HTTPServer.port);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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



    
    redisClient.get(req.body["session_id"] + "_dev", function (err, sessiondata) {
        
        var uuid_data;
        if (err) {

            console.log(err);

        }
        else {
            
            
            uuid_data = JSON.parse(sessiondata);
            //var body = { session: req.body["session_id"], direction: req.body["Caller-Direction"], ani: req.body["Caller-Caller-ID-Number"], dnis: req.body["Caller-Destination-Number"], name: req.body["Caller-Caller-ID-Name"], result: "uploaded" };


            /////////////upload to system location///////////////////////////////////////////

            try {

                if(config.Services && config.Services.uploadurl) {
                    var urloadurl = config.Services.uploadurl;


                    var form = new FormData();
                    form.append("sessionid", req.body["session_id"]);
                    form.append("filename", fs.createReadStream(req.files.result["path"]));
                    form.append("displayname", req.files.result["name"]);
                    form.append("hostname", req.body["hostname"]);
                    form.append("appid", uuid_data["appid"])

                    form.getLength(function (err, length) {
                        if (err) {
                            console.log(err);
                        }

                        var r = request.post(urloadurl, requestCallback);
                        r._form = form;
                        r.setHeader('content-length', length);


                        redisClient.publish("SYS:HTTPPROGRAMMING:FILEUPLOADED", JSON.stringify({Type: 'FILE', DisplayName: req.files.result["name"], SessionID: req.body["session_id"], APPID: uuid_data["appid"], Description: '', SessionID: req.body["session_id"]  }), redis.print);


                    });
                }else{


                }

            }catch(ex){

                console.log(err);
            }


            /////////////////////////////////////////////upload to client post url//////////////////////////////////////////

            if (uuid_data["posturl"] && uuid_data["posturl"] != "none") {
                //fs.createReadStream(req.files.result["path"]).pipe(request.post(uuid_data["posturl"]))
                
                try {
                    var form = new FormData();
                    form.append("sessionid", req.body["session_id"]);
                    form.append("filename", fs.createReadStream(req.files.result["path"]));
                    form.append("displayname", req.files.result["name"]);

                    form.getLength(function (err, length) {
                        if (err) {
                            console.log(err);
                        }

                        var r = request.post(uuid_data["posturl"], requestCallbackDev);
                        r._form = form;
                        r.setHeader('content-length', length);

                    });
                }catch(ex){

                    console.log(ex);
                }
                
                function requestCallback(err, res, body) {

                    if(res.statusCode == 200) {

                        console.log(body);
                        //////////////////////////////////////////////push activities///////////////////

                    }else{


                    }
                }

                function requestCallbackDev(err, res, body) {

                    if(res.statusCode == 200) {

                        console.log(body);
                        //////////////////////////////////////////////push activities///////////////////


                    }else{



                    }
                }
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

            res.write(messageGenerator.Playback(fileID, mainServer, mainServer, callData["result"], callData["errorfile"], callData["digittimeout"], callData["inputtimeout"], callData["loops"], callData["terminator"], callData["strip"], callData["digits"], maxdigits));



            break;


        case "playandgetdigits":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];

            var error = './invalid.wav';
            if (callData["errorfile"])
                error = callData["errorfile"];


            res.write(messageGenerator.PlayAndGetDigits(fileID, mainServer, mainServer, callData["result"], error, callData["digittimeout"], callData["inputtimeout"], callData["loops"], callData["terminator"], callData["strip"], callData["digits"], maxdigits));

            break;

        case "record":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];
            //file, actionURL,tempURL, paramName, errorFile, digitTimeout, limit, terminators, strip
            res.write(messageGenerator.Record(callData["file"], mainServer, mainServer, callData["result"], callData["errorfile"], callData["digittimeout"], callData["inputtimeout"], callData["limit"], callData["terminator"], callData["strip"], callData["digits"], maxdigits));

            break;

        case "pause":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];
            //var pause = function( actionURL,tempURL, paramName, errorFile, digitTimeout,inputTimeout, milliseconds, terminators, strip)
            res.write(messageGenerator.Pause(mainServer, mainServer, callData["result"], callData["errorfile"], callData["digittimeout"], callData["inputtimeout"], callData["milliseconds"], callData["terminator"], callData["strip"], callData["digits"], maxdigits));

            break;

        case "speak":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];
            //var speak = function(file,actionURL, tempURL, paramName, errorFile, digitTimeout, inputTimeout, loops,engine,voice, terminators, strip)
            res.write(messageGenerator.Speak(callData["file"], mainServer, mainServer, callData["result"], callData["errorfile"], callData["digittimeout"], callData["inputtimeout"], callData["loops"], callData["engine"], callData["voice"], callData["terminator"], callData["strip"], callData["digits"], maxdigits));

            break;

        case "say":

            var maxdigits = callData["digits"];
            if (callData["maxdigits"])
                maxdigits = callData["maxdigits"];

            //var say = function(file,actionURL, tempURL, paramName, errorFile, digitTimeout, inputTimeout, loops,language,type,method,gender, terminators, strip)
            res.write(messageGenerator.Say(callData["file"], mainServer, mainServer, callData["result"], callData["errorfile"], callData["digittimeout"], callData["inputtimeout"], callData["loops"], callData["language"], callData["type"], callData["method"], callData["gender"], callData["terminator"], callData["strip"], callData["digits"], maxdigits));

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
                    var msg = messageGenerator.Continue(mainServer);
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
            //var dial = function(actionURL, tempURL,context,dialplan,callername,callernumber,number)
            res.write(messageGenerator.Dial(mainServer, mainServer, callData["context"], callData["dialplan"], callData["callername"], callData["callernumber"], callData["number"]));

            break;


        case "dialuser":
            var number = format("user/{0}@{1}", callData["number"], uuid_data['domain']);
            res.write(messageGenerator.Dial(mainServer, mainServer, callData["context"], callData["dialplan"], callData["callername"], callData["callernumber"], number));

            break;

        case "dialdirect":

            var number = format("sip:{0}@{1}", callData["number"], uuid_data['domain']);
            var context = "developer";
            if (uuid_data['pbxcontext'])
                var context = uuid_data['pbxcontext'];
            res.write(messageGenerator.Dial(mainServer, mainServer, context, callData["dialplan"], callData["callername"], callData["callernumber"], number));

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


        case "log":
            //var log = function(actionURL, tempURL,level,clean,message)
            res.write(messageGenerator.Log(mainServer, mainServer, callData["level"], callData["clean"], callData["message"]));

            break;


        case "getvar":
            //var getVar = function(actionURL, tempURL, permenent, name)
            res.write(messageGenerator.GetVar(mainServer, mainServer, callData["permenent"], callData["name"]));

            break;


        case "voicemail":
            //var voicemail = function(actionURL, tempURL, check, authonly, profile,domain,id)
            res.write(messageGenerator.VoiceMail(mainServer, mainServer, callData["check"], callData["authonly"], profile, domain, callData["id"]));

            break;

        case "hangup":
            res.write(messageGenerator.Hangup(mainServer, mainServer, callData["cause"]));

            break;

        case "continue":
            res.write(messageGenerator.Continue(mainServer));

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


function HandleFunction(queryData, req, res, next) {
    
    
    //console.log(req.url);
    //var queryData = url.parse(req.url, true).query;

    var isdebug= false;
    var debugdata = {};
    var fileID = "";
    var company = '';
    var tenant = '';

    logger.debug("HTTPProgrammingAPI.Handler FS Request Recived");
    
    
    if (queryData["exiting"] == "true") {

        logger.debug("HTTPProgrammingAPI.Handler Session Leave %s", queryData["session_id"]);
        
        redisClient.del(queryData["session_id"] + "_dev", redis.print);
        redisClient.del(queryData["session_id"] + "_command", redis.print);
       //redisClient.del(queryData["session_id"] + "_result", redis.print);
        redisClient.del(queryData["session_id"] + "_data", redis.print);
       // redisClient.lrem(queryData["Caller-Destination-Number"] + "_live" , 0 , queryData["session_id"], redis.print);


        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        var date = new Date();
        var callreciveEvent = {EventClass:'APP',EventType:'EVENT', EventCategory:'SYSTEM', EventTime:date, EventName:'APPLICATIONEND',EventData:'',EventParams:'',CompanyId:company, TenantId: tenant, SessionId: queryData["session_id"]  };
        redisClient.publish("SYS:MONITORING:DVPEVENTS", JSON.stringify(callreciveEvent), redis.print);


        logger.debug("HTTPProgrammingAPI.Handler REDIS Publish data to event flow %s",queryData["session_id"], callreciveEvent);
        //////////////////////////////////////////////////////////////////////////////// %s///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


        res.writeHead(200, { "Content-Type": "text/xml" });
        res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
        res.end();
        
        return next();

    }
    
    
    redisClient.get(queryData["session_id"] + "_data", function (err, sessiondata) {
        
        var uuid_dev;
        if (err) {

            logger.error("HTTPProgrammingAPI.Handler REDIS Error in sessiondata retrieve %s",queryData["session_id"], err);
            console.error("error");
            res.writeHead(200, { "Content-Type": "text/xml" });
            res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
            res.end();
        }
        else {
            //console.log("Worked: " + sessiondata);
            var uuid_data = JSON.parse(sessiondata);
            
            if (!sessiondata) {
                
                uuid_data = { path: "http://localhost:8081", company: 1, tenent: 3, pbx: 'none', appid:'none', domain:'none', profile:'default', env:'production'};

                logger.debug("HTTPProgrammingAPI.Handler no sessiondata found create new");

            }


            //logger.debug("Session Data included ----------------------> %j", sessiondata);

            if(uuid_data["env"] == "debug"){

                isdebug = true;
            }

            company = uuid_data['company'];
            tenant = uuid_data['tenant'];
            
            
            if (!uuid_data) {
                res.writeHead(200, { "Content-Type": "text/xml" });
                res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
                res.end();

            }
            else {
                redisClient.get(queryData["session_id"] + "_dev", function (err, value) {
                    
                    var uuid_dev;
                    if (err) {
                        logger.error("HTTPProgrammingAPI.Handler REDIS Error in sessiondev retrieve %s",queryData["session_id"], err);
                        res.writeHead(200, { "Content-Type": "text/xml" });
                        res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
                        res.end();
                    }
                    else {
                        //console.log("Worked: " + value);
                        uuid_dev = JSON.parse(value);
                        if (!value) {
                            
                            var basurl = "none";
                            var nxurl = uuid_data["path"];
                            if (uuid_data["app"]) {
                                nxurl = format("{0}/{1}", uuid_data["path"], uuid_data["app"])
                                basurl = uuid_data["path"];
                            }
                            
                            
                            uuid_dev = { serverdata: queryData, nexturl: nxurl, currenturl: "none", result: "result", lastcommand: "none", lastresult: "none", company: uuid_data["company"], tenent: uuid_data["tenent"], posturl: "none", baseurl: basurl, appid:  uuid_data["appid"]}
                            //redisClient.lpush(queryData["Caller-Destination-Number"] + "_live", queryData["session_id"], redis.print);
                            //redisClient.lpush("APPID_" + uuid_data["appid"], queryData["session_id"], redis.print);


                            logger.debug("HTTPProgrammingAPI.Handler Session Create %s", queryData["session_id"], uuid_dev);

                        }
                        
                        
                        var resultValue = "none";
                        if (queryData[uuid_dev["result"]]) {
                            resultValue = queryData[uuid_dev["result"]];
                            uuid_dev["lastresult"] = resultValue;

                        }
                        //redisClient.lpush(queryData["session_id"] + "_result", resultValue, redis.print);
                        
                        var body = { session: queryData["session_id"], direction: queryData["Caller-Direction"], ani: queryData["Caller-Caller-ID-Number"], dnis: queryData["Caller-Destination-Number"], name: queryData["Caller-Caller-ID-Name"], result: resultValue };

                        logger.debug("HTTPProgrammingAPI.Handler RequestOut DeveloperAPP Data %s %j",queryData["session_id"], body);

                        // var data = JSON.stringify(body);
                        
                        var options = { url: uuid_dev["nexturl"], method: "POST", json: body };

                        ////////////////////////////////////////




                        var date = new Date();
                        var callreciveEvent = {EventClass:'APP',EventType:'EVENT', EventCategory:'SYSTEM', EventTime:date, EventName:'APPLICATIONFOUND',EventData:uuid_data["appid"],EventParams:'',CompanyId:uuid_data["company"], TenantId: uuid_data["tenent"], SessionId: queryData["session_id"]  };
                        redisClient.publish("SYS:MONITORING:DVPEVENTS", JSON.stringify(callreciveEvent), redis.print);

                        logger.debug("HTTPProgrammingAPI.Handler REDIS Publish data to event flow %s %j",queryData["session_id"], callreciveEvent);


                        ////////////////////////////////////////


                        logger.debug("HTTPProgrammingAPI.Handler RequestOut DeveloperAPP URL %s", uuid_dev["nexturl"]);
                        
                        
                        request.get(options, function (error, response, data) {
                            
                            if (!error && response.statusCode == 200) {


                                logger.debug("HTTPProgrammingAPI.Handler RequestOut DeveloperAPP Success %s %j", queryData["session_id"], response.body);
                                
                                //console.log(response.body)
                                //console.log(data);
                                redisClient.lpush(queryData["session_id"] + "_command", JSON.stringify(response.body), redis.print);

                                logger.debug("HTTPProgrammingAPI.Handler REDIS lpush data for command %s",queryData["session_id"]);


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


                                    var eventFlowData = JSON.stringify({Type: 'DATA', Code: '', URL: '', APPID: uuid_dev["appid"], Description: JSON.stringify(response.body), SessionID: queryData["session_id"] });

                                    redisClient.publish("SYS:HTTPPROGRAMMING:DATAERROR", eventFlowData, redis.print);

                                    logger.debug("HTTPProgrammingAPI.Handler REDIS Publish data for monitoring api %s %j",queryData["session_id"], eventFlowData);


                                    var date = new Date();
                                    var callreciveEvent = {EventClass:'APP',EventType:'ERROR', EventCategory:'DEVELOPER', EventTime:date, EventName:'DEVELOPERDATAERROR',EventData:uuid_data["appid"],EventParams:'',CompanyId:uuid_data["company"], TenantId: uuid_data["tenent"], SessionId: queryData["session_id"]  };
                                    redisClient.publish("SYS:MONITORING:DVPEVENTS", JSON.stringify(callreciveEvent), redis.print);

                                    logger.debug("HTTPProgrammingAPI.Handler REDIS Publish data to event flow %s %j",queryData["session_id"], callreciveEvent);



                                    res.writeHead(200, { "Content-Type": "text/xml" });
                                    res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
                                    res.end();


                                    logger.error("HTTPProgrammingAPI.Handler RequestOut DeveloperAPP DataError %s %j", queryData["session_id"], callData);
                                    
                                    return next();
                                }


                                ////////////////////////////////////////


                                var date = new Date();
                                var callreciveEvent = {EventClass:'APP',EventType:'COMMAND', EventCategory:'DEVELOPER', EventTime:date, EventName:callData["action"], EventData:uuid_data["appid"],EventParams:'',CompanyId:uuid_data["company"], TenantId: uuid_data["tenent"], SessionId: queryData["session_id"]  };
                                redisClient.publish("SYS:MONITORING:DVPEVENTS", JSON.stringify(callreciveEvent), redis.print);

                                logger.debug("HTTPProgrammingAPI.Handler REDIS Publish data to event flow %s %j",queryData["session_id"], callreciveEvent);

                                ////////////////////////////////////////


                                var url;
                                /*
                                if(process.env.envirnament && process.env.domain){

                                    url = format("{0}{1}/{2}/GetFileIDForName/{3}", process.env.envirnament, process.env.domain, filenamex, uuid_data['appid']);

                                }
                                else */

                                var filenamex = callData["file"];

                                if((config.Services && config.Services.downloaddurl && uuid_data['appid'])) {

                                    ///DVP/API/'+version+'/FIleService/FileHandler/:filename/FileInfoForApplicationId/:appId
                                    url = format("{0}/DVP/API/{1}/FIleService/FileHandler/{2}/FileInfoForApplicationId/{3}", config.Services.downloaddurl,config.Services.uploadurlVersion, filenamex, uuid_data['appid']);
                                    logger.debug("Calling FILE service URL %s",url);
                                }



                                if((callData["action"] == "play" || callData["action"] == "playandgetdigits" ) ) {

                                        request.get(url, function (_error, _response, datax) {

                                            var fileID = filenamex;

                                            try {
                                                var filedata = _response.body;
                                                if (!_error && _response.statusCode == 200 && filedata && filedata.Result && filedata.Result["UniqueId"]) {

                                                    fileID = filedata.Result["UniqueId"];

                                                    logger.debug("HTTPProgrammingAPI.Handler Request File resolution %s %s", queryData["session_id"],fileID);


                                                }
                                                else {


                                                    //uuid_data["tenant"],uuid_data["company"]
                                                    //var companyLocation = format("{0}_{1}",uuid_data["tenant"], uuid_data["company"]);
                                                    //fileID = format("{0}/{1}",companyLocation, filenamex);

                                                    logger.error("HTTPProgrammingAPI.Handler Request File resolution %s", queryData["session_id"]);




                                                }

                                                ///////////////////////////////////////////////////////////////////////////
                                                try {

                                                    logger.debug("HTTPProgrammingAPI.Handler CallOperation %s %j %s %s %j", queryData["session_id"],callData,uuid_data["domain"], uuid_data["profile"], queryData);

                                                    Operation(callData, fileID, mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"], '', '');
                                                }
                                                catch(exxx){

                                                    console.log(exxx);

                                                }
                                                console.log("----------------------------------------------------> get result");

                                                uuid_dev["result"] = callData["result"];

                                                console.log("----------------------------------------------------> got result");


                                                if (uuid_dev["baseurl"] != "none" && callData["app"]) {

                                                    console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                    uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                    uuid_dev["nexturl"] = util.format("%s/%s", uuid_dev["baseurl"], callData["app"]);
                                                }
                                                else {

                                                    console.log("----------------------------------------------------> no base url");

                                                    uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                    uuid_dev["nexturl"] = callData["nexturl"];

                                                    console.log("DEV DATA -------------> %j",uuid_dev);
                                                    console.log("CALL DATA -------------> %j",callData);


                                                }


                                                logger.debug("HTTPProgrammingAPI.Handler APP NextURL  %s %s",queryData["session_id"], uuid_dev["nexturl"]);


                                                try {
                                                    var redisData = JSON.stringify(uuid_dev);
                                                    redisClient.set(queryData["session_id"] + "_dev", redisData, redis.print);
                                                    logger.debug("HTTPProgrammingAPI.Handler SetRedis Data UUID_DEV %j",redisData);
                                                }
                                                catch (e) {
                                                    console.error(e);
                                                }


                                            } catch (exx) {

                                                console.error(e);

                                            }


                                        });

                                } else if(callData["action"] == "dialgateway"){


                                    var outbountruleurl;


                                    if((config.Services && config.Services.ruleservice )) {
                                        outbountruleurl = format("{0}/{1}/GetOutboundRule/{2}/{3}/{4}", config.Services.ruleservice, callData["callernumber"], callData["number"], uuid_data["tenant"],uuid_data["company"]);
                                    }


                                    request.get(outbountruleurl, function (_error, _response, datax) {

                                       // var fileID = filenamex;

                                        var ani;
                                        var gateway;
                                        var dnis;

                                        try {
                                            var ruledata = _response.body;
                                            if (!_error && _response.statusCode == 200 && ruledata) {



                                                callData["callernumber"] = ruledata["ani"];
                                                callData["number"] =  ruledata["dnis"];
                                                callData["gateway"] = ruledata["gateway"];


                                                logger.debug("HTTPProgrammingAPI.Handler Request Gateway resolution %s %j", queryData["session_id"],ruledata);


                                            }
                                            else {

                                                logger.error("HTTPProgrammingAPI.Handler Request Gateway resolution %s", queryData["session_id"]);

                                                callData["action"] = "hangup";
                                                callData["cause"] =  "SERVICE_UNAVAILABLE";


                                            }


                                            logger.debug("HTTPProgrammingAPI.Handler CallOperation %s %j %s %s %j", queryData["session_id"],callData,uuid_data["domain"], uuid_data["profile"], queryData);


                                            Operation(callData, callData["file"], mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"], '',  '');

                                            console.log("----------------------------------------------------> get result");

                                            uuid_dev["result"] = callData["result"];

                                            console.log("----------------------------------------------------> got result");


                                            if (uuid_dev["baseurl"] != "none" && callData["app"]) {

                                                console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                uuid_dev["nexturl"] = util.format("%s/%s", uuid_dev["baseurl"], callData["app"]);
                                            }
                                            else {

                                                console.log("----------------------------------------------------> no base url");

                                                uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                uuid_dev["nexturl"] = callData["nexturl"];

                                                console.log(uuid_dev["nexturl"]);

                                                console.log("DEV DATA -------------> %j",uuid_dev);
                                                console.log("CALL DATA -------------> %j",callData);


                                            }


                                            logger.debug("HTTPProgrammingAPI.Handler APP NextURL  %s %s",queryData["session_id"], uuid_dev["nexturl"]);


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
                                        queueURL = format("{0}/ardsurl/{1}/{2}", config.Services.ards,  uuid_data["tenant"],uuid_data["company"]);
                                    }


                                    request.get(queueURL, function (_error, _response, datax) {


                                        try {
                                            var urldata = _response.body;
                                            if (!_error && _response.statusCode == 200 && ruledata) {


                                                callData["ip"] =  urldata["ip"];
                                                callData["port"] = urldata["port"];

                                                logger.debug("HTTPProgrammingAPI.Handler Request Queue resolution %s %j", queryData["session_id"], urldata);


                                            }
                                            else {

                                                console.log("Get ARDS rule failed --------> ");
                                                callData["ip"] =  "127.0.0.1";
                                                callData["port"] = 8084;

                                                logger.error("HTTPProgrammingAPI.Handler Request Queue resolution %s", queryData["session_id"]);


                                            }


                                            logger.debug("HTTPProgrammingAPI.Handler CallOperation %s %j %s %s %j", queryData["session_id"],callData,uuid_data["domain"], uuid_data["profile"], queryData);


                                            Operation(callData, callData["file"], mainServer, queryData, res, uuid_data["domain"], uuid_data["profile"], callData["ip"],  callData["port"]);

                                            console.log("----------------------------------------------------> get result");

                                            uuid_dev["result"] = callData["result"];

                                            console.log("----------------------------------------------------> got result");


                                            if (uuid_dev["baseurl"] != "none" && callData["app"]) {

                                                console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                uuid_dev["nexturl"] = util.format("%s/%s", uuid_dev["baseurl"], callData["app"]);
                                            }
                                            else {

                                                console.log("----------------------------------------------------> no base url");

                                                uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                uuid_dev["nexturl"] = callData["nexturl"];

                                                console.log(uuid_dev["nexturl"]);

                                                console.log("DEV DATA -------------> %j",uuid_dev);
                                                console.log("CALL DATA -------------> %j",callData);
                                            }


                                            logger.debug("HTTPProgrammingAPI.Handler APP NextURL  %s %s",queryData["session_id"], uuid_dev["nexturl"]);


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

                                    logger.debug("HTTPProgrammingAPI.Handler CallOperation %s %j %s %s %j", queryData["session_id"],callData,uuid_data["domain"], uuid_data["profile"], queryData);


                                    Operation(callData, callData["file"], mainServer, queryData, res,uuid_data["domain"],uuid_data["profile"]);

                                    console.log("----------------------------------------------------> get result");

                                    uuid_dev["result"] = callData["result"];

                                    console.log("----------------------------------------------------> got result");


                                    if (uuid_dev["baseurl"] != "none" && callData["app"]) {

                                        console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                        uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                        uuid_dev["nexturl"] = format("{0}/{1}", uuid_dev["baseurl"], callData["app"]);
                                    }
                                    else {

                                        console.log("----------------------------------------------------> no base url");

                                        uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                        uuid_dev["nexturl"] = callData["nexturl"];

                                        console.log(uuid_dev["nexturl"]);


                                        console.log("DEV DATA -------------> %j",uuid_dev);
                                        console.log("CALL DATA -------------> %j",callData);


                                    }


                                    logger.debug("HTTPProgrammingAPI.Handler APP NextURL  %s %s",queryData["session_id"], uuid_dev["nexturl"]);


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

                                if(response) {

                                    var callreciveEvent = JSON.stringify({
                                        Type: 'HTTP',
                                        Code: response.statusCode,
                                        URL: uuid_dev["nexturl"],
                                        APPID: uuid_dev["appid"],
                                        SessionID: queryData["session_id"],
                                        Description: response.body
                                    });

                                    redisClient.publish("SYS:HTTPPROGRAMMING:HTTPERROR", callreciveEvent, redis.print);


                                    logger.debug("HTTPProgrammingAPI.Handler REDIS Publish error for monitoring api %s %j",queryData["session_id"], callreciveEvent);

                                }else{

                                    var callreciveEvent = JSON.stringify({
                                        Type: 'HTTP',
                                        Code:0000,
                                        URL: uuid_dev["nexturl"],
                                        APPID: uuid_dev["appid"],
                                        SessionID: queryData["session_id"],
                                        Description: "no response"
                                    });
                                    redisClient.publish("SYS:HTTPPROGRAMMING:HTTPERROR", callreciveEvent, redis.print);


                                    logger.debug("HTTPProgrammingAPI.Handler REDIS Publish error for monitoring api %s %j",queryData["session_id"], callreciveEvent);

                                }



                                logger.error("HTTPProgrammingAPI.Handler RequestOut %s with response", queryData["session_id"]);


                                var date = new Date();
                                var callreciveEvent = {EventClass:'APP',EventType:'ERROR', EventCategory:'DEVELOPER', EventTime:date, EventName:'DEVELOPERHTTPERROR',EventData:uuid_data["appid"],EventParams:'',CompanyId:uuid_data["company"], TenantId: uuid_data["tenent"], SessionId: queryData["session_id"]  };
                                redisClient.publish("SYS:MONITORING:DVPEVENTS", JSON.stringify(callreciveEvent), redis.print);

                                logger.debug("HTTPProgrammingAPI.Handler REDIS Publish data to event flow %s %j",queryData["session_id"], callreciveEvent);




                                res.writeHead(200, { "Content-Type": "text/xml" });
                                res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
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

                uuid_data = { path: "http://localhost:8081", company: 1, tenent: 3, pbx: 'none', appid:'none', domain:'none', profile:'default', env:'debug'};
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
                                nxurl = format("{0}/{1}", uuid_data["path"], uuid_data["app"])
                                basurl = uuid_data["path"];
                            }


                            uuid_dev = { serverdata: queryData, nexturl: nxurl, currenturl: "none", result: "result", lastcommand: "none", lastresult: "none", company: uuid_data["company"], tenent: uuid_data["tenent"], posturl: "none", baseurl: basurl, appid:  uuid_data["appid"]};
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

                        var options = { url: uuid_dev["nexturl"], method: "POST", json: body };



                        var debugdata = [];
                        debugdata.push({type:"message", info: "Call user application", data: body, url:uuid_dev["nexturl"]});



                        request.get(options, function (error, response, data) {

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

                                if((config.Services && config.Services.downloaddurl && uuid_data['appid'])) {
                                    url = format("{0}/{1}/GetFileIDForName/{2}", config.Services.downloaddurl, filenamex, uuid_data['appid']);

                                    logger.debug("Calling FILE service URL %s",url);
                                }



                                if((callData["action"] == "play" || callData["action"] == "playandgetdigits" ) ) {

                                    request.get(url, function (_error, _response, datax) {

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


                                            if (uuid_dev["baseurl"] != "none" && callData["app"]) {

                                                console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                uuid_dev["nexturl"] = util.format("%s/%s", uuid_dev["baseurl"], callData["app"]);
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


                                    if((config.Services && config.Services.ruleservice )) {
                                        outbountruleurl = format("{0}/{1}/GetOutboundRule/{2}/{3}/{4}", config.Services.ruleservice, callData["callernumber"], callData["number"], uuid_data["tenant"],uuid_data["company"]);
                                    }


                                    request.get(outbountruleurl, function (_error, _response, datax) {

                                        // var fileID = filenamex;

                                        var ani;
                                        var gateway;
                                        var dnis;

                                        try {
                                            var ruledata = _response.body;
                                            if (!_error && _response.statusCode == 200 && ruledata) {



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


                                            if (uuid_dev["baseurl"] != "none" && callData["app"]) {

                                                console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                uuid_dev["nexturl"] = util.format("%s/%s", uuid_dev["baseurl"], callData["app"]);
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
                                        queueURL = format("{0}/ardsurl/{1}/{2}", config.Services.ards,  uuid_data["tenant"],uuid_data["company"]);
                                    }


                                    request.get(queueURL, function (_error, _response, datax) {


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


                                            if (uuid_dev["baseurl"] != "none" && callData["app"]) {

                                                console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                                uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                                uuid_dev["nexturl"] = util.format("%s/%s", uuid_dev["baseurl"], callData["app"]);
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


                                    if (uuid_dev["baseurl"] != "none" && callData["app"]) {

                                        console.log("----------------------------------------------------> have base url" + uuid_dev["baseurl"]);

                                        uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                        uuid_dev["nexturl"] = format("{0}/{1}", uuid_dev["baseurl"], callData["app"]);
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



    var uuid_data = { path: url, company: company, tenent: tenant, pbx: 'none', appid: appid, domain:'192.168.8.100', profile: 'default', app: app };
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
    
    
    console.log(req.url);
    var queryData = url.parse(req.url, true).query;
    
    HandleFunction(queryData, req, res, next);

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

process.stdin.resume();