module.exports = {

      "Freeswitch" : {
          "ip": 'localhost',
          "port": 8021,
          "password": ''
      },

    "Redis":
    {
        "mode":"sentinel",//instance, cluster, sentinel
        "ip": "",
        "port": 6389,
        "user": "",
        "password": "",
        "sentinels":{
            "hosts": "",
            "port":16389,
            "name":"redis-cluster"
        }

    },


    "Security":
    {

        "ip" : "",
        "port": 6389,
        "user": "",
        "password": "",
        "mode":"instance",//instance, cluster, sentinel
        "sentinels":{
            "hosts": "",
            "port":16389,
            "name":"redis-cluster"
        }
    },

    "HTTPServer" : {
        "port": 8086
    },


    "LBServer" : {
        "ip": '127.0.0.1',
        "port": 8086
    },

    "Host":{

        "token": ""
    },

    "Services": {

        "uploadurl": '',
        "uploadport": '8888',
        "downloadurl": '',
        "downloadport": '8081',
        "ruleservice": '127.0.0.1',
        "ruleserviceport": '8888',
        "ards": '127.0.0.1',
        "ardsport": '8080',
        "ardsversion": '1.0.0.0',

        "ardsServiceHost": "127.0.0.1",
        "ardsServicePort": "8828",
        "ardsServiceVersion": "1.0.0.0",


        "qmusicurl": '',
        "qmusicport": '8860',
        "qmusicversion": "1.0.0",


        "fileserviceurl": '',
        "fileserviceport": '8081',
        "fileserviceVersion": "6.0",


        "interactionurl": "",
        "interactionport": '3637',
        "interactionversion": "1.0.0.0",

        "userserviceurl": "127.0.0.1",
        "userserviceport": '3637',
        "userserviceversion": "1.0.0.0",



        "ticketurl": "",
        "ticketport": '3636',
        "ticketversion": "1.0.0.0",

        "csaturl": "127.0.0.1",
        "csatport": '3636',
        "csatversion": "1.0.0.0",


        "uploadurlVersion": "1.0.0.0",
        "downloaddurlVersion": "1.0.0.0",
        "ruleserviceVersion": "1.0.0.0",
        "qmusicVersion": "1.0.0.0"

    }



};
