module.exports = {
    "Freeswitch" : {
        "ip": "FS_IP",
        "port": "FS_PORT",
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

        "ip": "LB_IP",
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
        "ards": "SYS_ARDS_HOST",
        "ardsVersion": "SYS_ARDS_VERSION"

    },


    "Host":
    {
        "vdomain": "VIRTUAL_HOST",
        "domain": "HOST_NAME",
        "port": "HOST_HTTPPROGRAMMINGAPI_PORT",
        "version": "HOST_VERSION"
    }




};