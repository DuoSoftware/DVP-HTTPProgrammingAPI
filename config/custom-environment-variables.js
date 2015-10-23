module.exports = {
    "Freeswitch" : {
        "ip": "SYS_FREESWITCH_HOST",
        "port": "SYS_EVENTSOCKET_PORT",
        "password": "FS_PASSWORD"
    },


    "Redis":
    {
        "ip": "SYS_REDIS_HOST",
        "port": "SYS_REDIS_PORT"

    },

    "HTTPServer" : {
        "port": "HOST_HTTPPROGRAMMINGAPI_PORT"
    },


    "LBServer" : {

        "ip": "LB_FRONTEND",
        "port": "LB_PORT"

    },

    "Services": {

        "uploadurl": "SYS_FILESERVICE_HOST",
        "uploadport":"SYS_FILESERVICE_PORT",
        "uploadurlVersion":"SYS_FILESERVICE_VERSION",
        "downloadurl": "SYS_FILESERVICE_HOST",
        "downloadport":"SYS_FILESERVICE_PORT",
        "downloaddurlVersion" : "SYS_FILESERVICE_VERSION",
        "ruleservice": "SYS_RULESERVICE_HOST",
        "ruleserviceport": "SYS_RULESERVICE_PORT",
        "ruleserviceVersion": "SYS_RULESERVICE_VERSION",
        "ards": "SYS_ARDSLITESERVICE_HOST",
        "ardsport": "SYS_ARDSLITESERVICE_PORT",
        "ardsVersion": "SYS_ARDSLITESERVICE_VERSION",

        "qmusicurl": 'SYS_QUEUEMUSIC_HOST',
        "qmusicport": 'SYS_QUEUEMUSIC_PORT',
        "ardsVersion": "SYS_QUEUEMUSIC_VERSION"

    },


    "Host":
    {
        "vdomain": "LB_FRONTEND",
        "domain": "HOST_NAME",
        "port": "HOST_HTTPPROGRAMMINGAPI_PORT",
        "version": "HOST_VERSION"
    }




};
