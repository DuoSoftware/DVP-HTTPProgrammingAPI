var builder = require('xmlbuilder');
var util = require('util');


    /*
var doc = builder.create();

doc.begin('root')
  .ele('xmlbuilder')
    .att('for', 'node-js')
    .ele('repo')
      .att('type', 'git')
      .txt('git://github.com/oozcitak/xmlbuilder-js.git')
    .up()
  .up()
  .ele('test')
    .txt('complete');

console.log(doc.toString({ pretty: true }));
    */
    //text/xml
    //<document type="text/freeswitch-httapi">
    //<variables/>--set channel variables
    //<params/>--custum post tags
    //<work/>
    //</document>
    /*

    <document type="text/freeswitch-httapi">
<work>
<playback action="http://newurl/index.php"
temp-action="http://newtempurl/index.php"
name="playback_user_input"
error-file="ivr/ivr-error.wav"
file="ivr/ivr-welcome_to_freeswitch.wav"
asr-engine="pocketsphinx"
asr-grammar="my_default_asr_grammar"
digit-timeout="5"
    input-timeout="10"
loops="3"
terminators="#">
<bind strip="#">~\\d{3}</bind>
</playback>
</work>
</document>'



<document type="text/freeswitch-httapi">
<work>
<execute application="play_and_get_digits" data="1 4 1 5000 # ivr/ivr-please_enter_the_number_where_we_can_reach_you.wav '' myChannelVar \d+" />
<getVariable name=" myChannelVar "/>
</work>
</document>
    */







var playandgetdigits = function (file, actionURL, tempURL, paramName, errorFile, digitTimeout, inputTimeout, loops, terminators, strip, digitcount, digitcountmax) {


    // <min> <max> <tries> <timeout> <terminators> <file> <invalid_file> <var_name> <regexp> <digit_timeout> <transfer_on_failure>


        //"~\\d{1}"
    var format = util.format("\\S{%d}", digitcount);

    if (digitcountmax > digitcount)
        format = util.format("\\S{%d,%d}", digitcount,digitcountmax);
    //(^\d{3,5}$);

    var application = 'play_and_get_digits';
    var data = util.format("%d %d %d %d %s %s %s %s %s", digitcount, digitcountmax, loops, inputTimeout, terminators, file, errorFile, paramName, format);

    var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("execute")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("application", application)
            .att("data", data)
            .up()
            .ele("getVariable")
            .att("name", paramName)
            .end({ pretty: true });


    return doc;



};


var playback = function (file, actionURL, tempURL, paramName, errorFile, digitTimeout, inputTimeout, loops, terminators, strip, digitcount, digitcountmax) {

    //"~\\d{1}"
    var format = util.format("~\\d{%d}", digitcount);

    if (digitcountmax > digitcount)
        format = util.format("~\\d{%d,%d}", digitcount,digitcountmax);
    //(^\d{3,5}$);
    if (digitcount == -1)
        format = util.format("~\\d+%s",terminators);

    var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("playback")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("name", paramName)
            .att("file", file)
            .att("error-file", errorFile)
            .att("digit-timeout", digitTimeout)
            .att("input-timeout", inputTimeout)
            .att("loops", loops)
            .att("terminators", terminators)
            .ele("bind")
            .att("strip", strip)
            .txt(format)
            .end({ pretty: true });


    return doc;


};


var record = function (file, actionURL, tempURL, paramName, errorFile, digitTimeout, inputTimeout, limit, terminators, strip, digitcount, digitcountmax) {


    //"~\\d{1}"
    var format = util.format("~\\d{%d}", digitcount);

    if (digitcountmax > digitcount)
        format = util.format("~\\d{%d,%d}", digitcount,digitcountmax);
    //(^\d{3,5}$);
    if (digitcount == -1)
        format = util.format("~\\d+%s",terminators);

    var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("record")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("name", paramName)
            .att("error-file", errorFile)
            .att("digit-timeout", digitTimeout)
            .att("input-timeout", inputTimeout)
            .att("beep-file", "tone_stream://$${beep}")
            .att("file", file)
            .att("limit", limit)
            .att("terminators", terminators)
            .ele("bind")
            .att("strip", strip)
            .txt(format)
            .end({ pretty: true });


    return doc;

};


var pause = function (actionURL, tempURL, paramName, errorFile, digitTimeout, inputTimeout, milliseconds, terminators, strip, digitcount, digitcountmax) {


    //"~\\d{1}"
    var format = util.format("~\\d{%d}", digitcount);

    if (digitcountmax > digitcount)
        var format = util.format("~\\d{%d,%d}", digitcount,digitcountmax);
    //(^\d{3,5}$);
    if (digitcount == -1)
        var format = util.format("~\\d+%s",terminators);

    var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("pause")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("name", paramName)
            .att("milliseconds", milliseconds)
            .att("error-file", errorFile)
            .att("digit-timeout", digitTimeout)
            .att("input-timeout", inputTimeout)
            .att("loops", loops)
            .att("terminators", terminators)
            .ele("bind")
            .att("strip", strip)
            .txt(format)
            .end({ pretty: true });


    return doc;


};


var speak = function (file, actionURL, tempURL, paramName, errorFile, digitTimeout, inputTimeout, loops, engine, voice, terminators, strip, digitcount, digitcountmax) {


    //"~\\d{1}"
    var format = util.format("~\\d{%d}", digitcount);

    if (digitcountmax > digitcount)
        var format = util.format("~\\d{%d,%d}", digitcount,digitcountmax);
    //(^\d{3,5}$);
    if (digitcount == -1)
        var format = util.format("~\\d+%s",terminators);

    var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("speak")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("name", paramName)
            .att("file", file)
            .att("error-file", errorFile)
            .att("digit-timeout", digitTimeout)
            .att("input-timeout", inputTimeout)
            .att("loops", loops)
            .att("engine", engine)
            .att("voice", voice)
            .att("terminators", terminators)
            .ele("bind")
            .att("strip", strip)
            .txt(format)
            .end({ pretty: true });


    return doc;


};


var say = function (file, actionURL, tempURL, paramName, errorFile, digitTimeout, inputTimeout, loops, language, type, method, gender, terminators, strip, digitcount, digitcountmax) {

    //"~\\d{1}"
    var format = util.format("~\\d{%d}", digitcount);

    if (digitcountmax > digitcount)
        var format = util.format("~\\d{%d,%d}", digitcount,digitcountmax);
    //(^\d{3,5}$);
    if (digitcount == -1)
        var format = util.format("~\\d+%s",terminators);

    var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("say")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("name", paramName)
            .att("file", file)
            .att("error-file", errorFile)
            .att("digit-timeout", digitTimeout)
            .att("input-timeout", inputTimeout)
            .att("loops", loops)
            .att("language", language)
            .att("type", type)
            .att("method", method)
            .att("gender", gender)
            .att("terminators", terminators)
            .ele("bind")
            .att("strip", strip)
            .txt(format)
            .end({ pretty: true });


    return doc;


};


var sms = function (actionURL, tempURL, to, message) {




        var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("sms")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("to", to)
            .txt(message)
            .end({ pretty: true });


        return doc;


    };


var wait_for_answer = function (actionURL, tempURL) {

    return execute(actionURL, tempURL, 'wait_for_answer', '');
};


var Queue = function (actionURL, tempURL, skill, server, port) {


    var socketInfo = util.format("%s:%s async full",server, port);

    var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .ele("skill")
        .text(skill)
        .up()
        .up()
        .ele("params")
        .up()
        .ele("work")
        .ele("execute")
        .att("action", actionURL)
        .att("temp-action", tempURL)
        .att("application", "socket")
        .att("data", socketInfo)
        .end({ pretty: true });


    return doc;
};


var Ards = function (actionURL, tempURL, skill,skilldisplay, company, tenant, ardsholdmusic, ardsfirstannouncement, ardsannouncement, announcementtime, positionannouncement, language, priority) {



    var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .ele("ards_skill")
        .text(skill)
        .up()
        .ele("ards_priority")
        .text(priority)
        .up()
        .ele("ards_skill_display")
        .text(skilldisplay)
        .up()
        .ele("companyid")
        .text(company)
        .up()
        .ele("tenantid")
        .text(tenant)
        .up()
        .ele("ards_hold_music")
        .text(ardsholdmusic)
        .up()
        .ele("ards_first_announcement")
        .text(ardsfirstannouncement)
        .up()
        .ele("ards_announcement")
        .text(ardsannouncement)
        .up()
        .ele("ards_announcement_time")
        .text(announcementtime)
        .up()
        .ele("ards_position_announcement")
        .text(positionannouncement)
        .up()
        .ele("ards_position_language")
        .text(language)
        .up()
        .up()
        .ele("params")
        .up()
        .ele("work")
        .ele("execute")
        .att("action", actionURL)
        .att("temp-action", tempURL)
        .att("application", "ards")
        .att("data", skill+","+tenant+","+company+",")
        .end({ pretty: true });


    return doc;
};



var dtmf_type = function (actionURL, tempURL, dtmfType) {

    var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("execute")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("application", "set")
            .att("data", dtmfType)
            .end({ pretty: true });


    return doc;
};


var execute = function (actionURL, tempURL, application, data) {


        var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("execute")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("application", application)
            .att("data", data)
            .end({ pretty: true });


        return doc;


    };


var dial = function (actionURL, tempURL, context, dialplan, callername, callernumber, number) {


        var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("dial")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("caller-id-name", callername)
            .att("caller-id-number", callernumber)
            .att("context", context)
            .att("Dialplan", dialplan)
            .txt(number)
            .end({ pretty: true });


        return doc;


    };


var recordCall = function (actionURL, tempURL, limit, name) {

        var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("recordCall")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("limit", limit)
            .att("name", name)
            .end({ pretty: true });


        return doc;


    };


var conference = function (actionURL, tempURL, profile, data) {


        var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("conference")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("profile", profile)
            .txt(data)
            .end({ pretty: true });


        return doc;


    };


var hangup = function (actionURL, tempURL, cause) {


        var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("hangup")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("cause", cause)
            .end({ pretty: true });


        return doc;


    };


var breakx = function (actionURL, tempURL, cause) {


        var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("work")
            .ele("break")
            .end({ pretty: true });


        return doc;


    };


var continuex = function (actionURL, key, attribute) {


    var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")

        .ele("work")
        .ele("continue")
        .att("action", actionURL)
        .end({pretty: true});


    if(key && attribute) {

        doc = builder.create("document")
            .att("type", "text/freeswitch-httapi")

            .ele("variables")
            .ele(key)
            .text(attribute)
            .up()
            .up()

            .ele("work")
            .ele("continue")
            .att("action", actionURL)
            .end({pretty: true});


    }


    return doc;


};


var log = function (actionURL, tempURL, level, clean, message) {


        var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("log")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("level", level)
            .att("clean", clean)
            .txt(message)
            .end({ pretty: true });


        return doc;


    };


var getVar = function (actionURL, tempURL, permenent, name) {


    var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("getVariable")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("name", name)
            .att("permanent", permenent)
        .end({pretty: true});


    return doc;


};


var voicemail = function (actionURL, tempURL, check, authonly, profile, domain, id) {


        var doc = builder.create("document")
        .att("type", "text/freeswitch-httapi")
        .ele("variables")
        .up()
        .ele("params")
        .up()
        .ele("work")
            .ele("voicemail")
            .att("action", actionURL)
            .att("temp-action", tempURL)
            .att("check", check)
            .att("auth-only", authonly)
            .att("id", id)
            .att("profile", profile)
            .att("domain", domain)
            .end({ pretty: true });


        return doc;


    };

module.exports.PlayAndGetDigits = playandgetdigits;
module.exports.Playback = playback;
module.exports.Record = record;
module.exports.Pause = pause;
module.exports.Speak = speak;
module.exports.Say = say;
module.exports.Sms = sms;
module.exports.Execute = execute;
module.exports.Dial = dial;
module.exports.RecordCall = recordCall;
module.exports.Conference = conference;
module.exports.Hangup = hangup;
module.exports.Break = breakx;
module.exports.Log = log;
module.exports.GetVar = getVar;
module.exports.VoiceMail = voicemail;
module.exports.Continue = continuex;
module.exports.WaitForAnswer = wait_for_answer;
module.exports.DTMFType = dtmf_type;
module.exports.Queue = Queue;
module.exports.ARDS = Ards;