module.exports = {
    "Freeswitch" : {
        "ip": "SYS_FREESWITCH_HOST",
        "port": "SYS_EVENTSOCKET_PORT",
        "password": "FS_PASSWORD"
    },



    "Redis":
    {
        "ip": "SYS_REDIS_HOST",
        "port": "SYS_REDIS_PORT",
        "user": "SYS_REDIS_USER",
        "password": "SYS_REDIS_PASSWORD"

    },

    "Security":
    {
        "ip": "SYS_REDIS_HOST",
        "port": "SYS_REDIS_PORT",
        "user": "SYS_REDIS_USER",
        "password": "SYS_REDIS_PASSWORD"

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
        "fileserviceurl": "SYS_FILESERVICE_HOST",
        "fileserviceport":"SYS_FILESERVICE_PORT",
        "fileserviceVersion":"SYS_FILESERVICE_VERSION",


        "interactionurl": "SYS_INTERACTION_HOST",
        "interactionport": "SYS_INTERACTION_PORT",
        "interactionversion":"SYS_INTERACTION_VERSION",

        "ticketurl": "SYS_TICKET_HOST",
        "ticketport": "SYS_TICKET_PORT",
        "ticketversion":"SYS_TICKET_VERSION",

        "csaturl": "SYS_CSAT_HOST",
        "csatport": 'SYS_CSAT_PORT',
        "csatversion": "SYS_CSAT_VERSION",



        "userserviceurl": "SYS_USERSERVICE_HOST",
        "userserviceport": 'SYS_USERSERVICE_PORT',
        "userserviceversion": "SYS_USERSERVICE_VERSION",

        "downloadurl": "SYS_DOWNLOAD_FILESERVICE_HOST",
        "downloadport":"SYS_DOWNLOAD_FILESERVICE_PORT",
        "downloaddurlVersion" : "SYS_DOWNLOAD_FILESERVICE_VERSION",


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
        "version": "HOST_VERSION",
        "token": "HOST_TOKEN"
    }




};
