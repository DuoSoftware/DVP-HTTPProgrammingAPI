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
var util = require('util');


//console.log(messageGenerator.DTMFType("xxxxxxxxxx", "yyyyyyyyyyyyyyyyy", "inband"));



var mainServer = config.LBServer.path;

////////////////////////////////redis////////////////////////////////////////
var redisClient = redis.createClient(config.Redis.port,config.Redis.ip);
redisClient.on('error',function(err){
    console.log('Error '.red, err);
    });
////////////////////////////////////////////////////////////////////////////////


////////////////////////////////rest server///////////////////////////////////////////////////////////////////////////
var server = restify.createServer();
server.use(restify.fullResponse()).use(restify.bodyParser());
server.listen(config.HTTPServer.port);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var httpPOST = function(custumerData, section, data)
{
    
  //http://192.168.0.60/CSRequestWebApi/api/
    var post_domain = custumerData.domain;  
    var post_port = custumerData.port;  
    var post_path = custumerData.path;  
  
    //var post_data = querystring.stringify({  
    //  'your' : 'post',  
    //  'data': JSON.stringify( data )
    //});  
  
    var post_data =JSON.stringify( data );
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
  
    var post_req = http.request(post_options, function(res) {  
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



function postData(req, res)
{
    //fs.createReadStream('file.json').pipe(request.put('http://mysite.com/obj.json'))

    redisClient.get(req.body["session_id"] + "_dev", function (err, sessiondata) {

        var uuid_data;
        if (err) {

        }
        else {


            uuid_data = JSON.parse(sessiondata);
            if (uuid_data["posturl"] && uuid_data["posturl"] != "none") {
                //fs.createReadStream(req.files.result["path"]).pipe(request.post(uuid_data["posturl"]))


                var form = new FormData();
                form.append("sessionid", req.body["session_id"]);
                form.append("filename", fs.createReadStream(req.files.result["path"]));

                form.getLength(function (err, length) {
                    if (err) {
                        return requestCallback(err);
                    }

                    var r = request.post(uuid_data["posturl"], requestCallback);
                    r._form = form;
                    r.setHeader('content-length', length);

                });

                function requestCallback(err, res, body) {
                    console.log(body);
                }
            }

        }
    });

   };


function HandleFunction(queryData,req, res, next) {


    //console.log(req.url);
    //var queryData = url.parse(req.url, true).query;


    if (queryData["exiting"] == "true") {


        redisClient.del(queryData["session_id"] + "_dev", redis.print);
        redisClient.del(queryData["session_id"] + "_command", redis.print);
        redisClient.del(queryData["session_id"] + "_result", redis.print);
        redisClient.del(queryData["session_id"] + "_data", redis.print);
        redisClient.lrem(queryData["Caller-Destination-Number"]+"_live" ,0 ,queryData["session_id"],redis.print);
        
        res.writeHead(200, { "Content-Type": "text/xml" });
        res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
        res.end();

        return next();

    }


    redisClient.get(queryData["session_id"] + "_data", function (err, sessiondata) {

        var uuid_dev;
        if (err) {
            console.error("error");
            res.writeHead(200, { "Content-Type": "text/xml" });
            res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
            res.end();
        }
        else {
            console.log("Worked: " + sessiondata);
            uuid_data = JSON.parse(sessiondata);

            if (!sessiondata) {

                uuid_data = { path: "http://localhost:8081", company: 1, tenent: 3, pbx: 'none', app: 'start' };
            }


            if (!uuid_data) {
                res.writeHead(200, { "Content-Type": "text/xml" });
                res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
                res.end();

            }
            else {
                redisClient.get(queryData["session_id"] + "_dev", function (err, value) {

                    var uuid_dev;
                    if (err) {
                        console.error("error");
                        res.writeHead(200, { "Content-Type": "text/xml" });
                        res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
                        res.end();
                    }
                    else {
                        console.log("Worked: " + value);
                        uuid_dev = JSON.parse(value);
                        if (!value) {

                            var basurl = "none";
                            var nxurl = uuid_data["path"];
                            if (uuid_data["app"]) {
                                nxurl = util.format("%s/%s", uuid_data["path"], uuid_data["app"])
                                basurl = uuid_data["path"];
                            }


                            uuid_dev = { serverdata: queryData, nexturl: nxurl, currenturl: "none", result: "result", lastcommand: "none", lastresult: "none", company: uuid_data["company"], tenent: uuid_data["tenent"], posturl: "none", baseurl: basurl }
                            redisClient.lpush(queryData["Caller-Destination-Number"] + "_live", queryData["session_id"], redis.print);
                        }


                        var resultValue = "none";
                        if (queryData[uuid_dev["result"]]) {
                            resultValue = queryData[uuid_dev["result"]];
                            uuid_dev["lastresult"] = resultValue;

                        }
                        redisClient.lpush(queryData["session_id"] + "_result", resultValue, redis.print);

                        var body = { session: queryData["session_id"], direction: queryData["Caller-Direction"], ani: queryData["Caller-Caller-ID-Number"], dnis: queryData["Caller-Destination-Number"], name: queryData["Caller-Caller-ID-Name"], result: resultValue };
                        // var data = JSON.stringify(body);

                        var options = { url: uuid_dev["nexturl"], method: "POST", json: body };


                        request(options, function (error, response, data) {

                            if (!error && response.statusCode == 200) {

                                console.log(response.body)
                                redisClient.lpush(queryData["session_id"] + "_command", JSON.stringify(response.body), redis.print);


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

                                    redisClient.lpush(queryData["Caller-Destination-Number"] + "_error", e + "\n" + response.body, redis.print);
                                    res.writeHead(200, { "Content-Type": "text/xml" });
                                    res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
                                    res.end();

                                    return next();
                                }


                                res.writeHead(200, { "Content-Type": "text/xml" });
                                switch (callData["action"]) {

                                    case "play":

                                        var maxdigits = callData["digits"];
                                        if (callData["maxdigits"])
                                            maxdigits = callData["maxdigits"];

                                        res.write(messageGenerator.Playback(callData["file"], mainServer, mainServer, callData["result"], callData["errorfile"], callData["digittimeout"], callData["inputtimeout"], callData["loops"], callData["terminator"], callData["strip"], callData["digits"], maxdigits));
                                        break;


                                    case "playandgetdigits":

                                        var maxdigits = callData["digits"];
                                        if (callData["maxdigits"])
                                            maxdigits = callData["maxdigits"];

                                        var error = './invalid.wav';
                                        if (callData["errorfile"])
                                            error = callData["errorfile"];

                                        res.write(messageGenerator.PlayAndGetDigits(callData["file"], mainServer, mainServer, callData["result"], error, callData["digittimeout"], callData["inputtimeout"], callData["loops"], callData["terminator"], callData["strip"], callData["digits"], maxdigits));


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
                                        var Regex = require("regex");
                                        var regex = new Regex("a=rtpmap:(\d+)\stelephone-event/8000");
                                        
                                        if (queryData["variable_switch_r_sdp"]) {
                                            
                                            console.log("variable_switch_r_sdp ok");

                                            if (regex.test(queryData["switch_r_sdp"])) {
                                                //string terminators = string.Format("sendmsg\ncall-command: execute\nexecute-app-name:set\nexecute-app-arg: {0}={1}\n\n", key, value);

                                                console.log("------------------------------------------------------> outband");
                                                var msg = messageGenerator.Execute(mainServer, mainServer, "set", "dtmftype=outband");
                                                console.log("------------------------------------------------------>" + msg);
                                                res.write(msg);
                                                
                                                console.log("------------------------------------------------------>" + "Done");


                                            }
                                            else {

                                                console.log("------------------------------------------------------> INBAND");
                                                var msg = messageGenerator.DTMFType(mainServer, mainServer, "INBAND");
                                                console.log("------------------------------------------------------>" + msg);
                                                res.write(msg);
                                                
                                                console.log("------------------------------------------------------>" + "Done");


                                            }
                                        }
                                        else {
                                            
                                            ////////////////////////////////////////////////////////////////
                                            
                                            console.log("------------------------------------------------------>" + callData["dtmftype"]);
                                            var msg = messageGenerator.DTMFType(mainServer, mainServer, callData["dtmftype"]);
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


                                    case "dialextention":
                                        var number = util.format("pbx/%s/%s", uuid_data['pbxcontext'], callData["number"]);
                                        res.write(messageGenerator.Dial(mainServer, mainServer, callData["context"], callData["dialplan"], callData["callername"], callData["callernumber"], number));

                                        break;

                                    case "directdial":

                                        var number = util.format("sip:%s@%s", callData["number"], uuid_data['domain']);
                                        var context = "developer";
                                        if (uuid_data['pbxcontext'])
                                            var context = uuid_data['pbxcontext'];
                                        res.write(messageGenerator.Dial(mainServer, mainServer, context, callData["dialplan"], callData["callername"], callData["callernumber"], number));

                                        break;

                                    case "recordcall":
                                        //var recordCall = function(actionURL, tempURL,limit,name)
                                        res.write(messageGenerator.RecordCall(mainServer, mainServer, callData["limit"], callData["name"]));

                                        break;

                                    case "conference":
                                        //var conference = function(actionURL, tempURL,profile,data)
                                        res.write(messageGenerator.Conference(mainServer, mainServer, callData["profile"], callData["data"]));

                                        break;

                                    case "break":
                                        //var breakx = function(actionURL, tempURL,cause)
                                        res.write(messageGenerator.Break(mainServer, mainServer, callData["cause"]));

                                        break;
                                        
                                    case "waitforanswer":
                                        
                                        res.write(messageGenerator.WaitForAnswer(mainServer, mainServer));
                                        
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
                                        res.write(messageGenerator.VoiceMail(mainServer, mainServer, callData["check"], callData["authonly"], callData["profile"], callData["domain"], callData["id"]));

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
                                console.log("----------------------------------------------------> get result");
                                uuid_dev["result"] = callData["result"];                                
                                console.log("----------------------------------------------------> got result");


                               if (uuid_dev["baseurl"] != "none") {
                                    
                                    console.log("----------------------------------------------------> have base url"+ uuid_dev["baseurl"]);
                                    uuid_dev["currenturl"] = uuid_dev["nexturl"];
                                    uuid_dev["nexturl"] = util.format("%s/%s", uuid_dev["baseurl"], callData["nexturl"]);
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
                                }
                                catch (e) {
                                    console.error(e);
                                }
                                return next();

                            }
                            else {

                                redisClient.lpush(queryData["Caller-Destination-Number"] + "_error", response.statusCode + "\n" + uuid_dev["nexturl"], redis.print);
                                res.writeHead(200, { "Content-Type": "text/xml" });
                                res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
                                res.end();

                            }
                        });



                        //res.writeHead(200, { "Content-Type": "text/xml" });
                        //res.write(messageGenerator.Hangup(mainServer, mainServer, "NO_ROUTE_DESTINATION"));
                        //res.end();
                    }
                });
            }
        }
    });


    return next();
};



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

server.post('/', function DataHandle(req, res, next) {

    console.log("POST recived .... ");
    postData(req,res);
    HandleFunction(req.body,req, res, next);

});


server.get('/', function CallHandle(req, res, next) {


    console.log(req.url);
    var queryData = url.parse(req.url, true).query;

     HandleFunction(queryData,req, res, next);

});
 //messageGenerator.Playback("file", "tempURL", "paramName", "errorFile", "digitTimeout", "inputTimeout", "loops", "terminators", "strip");

 process.stdin.resume();