module.exports = {

    "Freeswitch" : {
        "ip": 'localhost',
        "port": 8021,
        "password": 'devadmin'
    },

    "Redis":
        {
            "mode":"sentinel",//instance, cluster, sentinel
            "ip": "45.55.142.207",
            "port": 6389,
            "user": "duo",
            "password": "DuoS123",
            "sentinels":{
                "hosts": "138.197.90.92,45.55.205.92,162.243.81.39",
                "port":16389,
                "name":"redis-cluster"
            }

        },


    "Security":
        {

            "ip" : "45.55.142.207",
            "port": 6389,
            "user": "duo",
            "password": "DuoS123",
            "mode":"instance",//instance, cluster, sentinel
            "sentinels":{
                "hosts": "138.197.90.92,45.55.205.92,162.243.81.39",
                "port":16389,
                "name":"redis-cluster"
            }
        },

    "HTTPServer" : {
        "port": 8086
    },


    "LBServer" : {
        "ip": '8e047a84.ngrok.io',
        "port": 8086
    },

    "Host":{

        "apptoken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdWtpdGhhIiwianRpIjoiYWEzOGRmZWYtNDFhOC00MWUyLTgwMzktOTJjZTY0YjM4ZDFmIiwic3ViIjoiNTZhOWU3NTlmYjA3MTkwN2EwMDAwMDAxMjVkOWU4MGI1YzdjNGY5ODQ2NmY5MjExNzk2ZWJmNDMiLCJleHAiOjE5MDIzODExMTgsInRlbmFudCI6LTEsImNvbXBhbnkiOi0xLCJzY29wZSI6W3sicmVzb3VyY2UiOiJhbGwiLCJhY3Rpb25zIjoiYWxsIn1dLCJpYXQiOjE0NzAzODExMTh9.Gmlu00Uj66Fzts-w6qEwNUz46XYGzE8wHUhAJOFtiRo",
        "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdWtpdGhhIiwianRpIjoiYWEzOGRmZWYtNDFhOC00MWUyLTgwMzktOTJjZTY0YjM4ZDFmIiwic3ViIjoiNTZhOWU3NTlmYjA3MTkwN2EwMDAwMDAxMjVkOWU4MGI1YzdjNGY5ODQ2NmY5MjExNzk2ZWJmNDMiLCJleHAiOjE5MDIzODExMTgsInRlbmFudCI6LTEsImNvbXBhbnkiOi0xLCJzY29wZSI6W3sicmVzb3VyY2UiOiJhbGwiLCJhY3Rpb25zIjoiYWxsIn1dLCJpYXQiOjE0NzAzODExMTh9.Gmlu00Uj66Fzts-w6qEwNUz46XYGzE8wHUhAJOFtiRo"
    },

    "Services": {

        "uploadurl": '192.168.0.88',
        "uploadport": '8888',
        "downloadurl": 'internalfileservice.app.veery.cloud',
        "downloadport": '8081',
        "ruleservice": '127.0.0.1',
        "ruleserviceport": '8888',
        "ards": '127.0.0.1',
        "ardsport": '8080',
        "ardsversion": '1.0.0.0',

        "ardsServiceHost": "127.0.0.1",
        "ardsServicePort": "8828",
        "ardsServiceVersion": "1.0.0.0",


        "qmusicurl": 'queuemusic.app.veery.cloud',
        "qmusicport": '8860',
        "qmusicversion": "1.0.0",


        "fileserviceurl": 'fileservice.app.veery.cloud',
        "fileserviceport": '8081',
        "fileserviceVersion": "6.0",


        "interactionurl": "interactions.app.veery.cloud",
        "interactionport": '3637',
        "interactionversion": "1.0.0.0",

        "userserviceurl": "127.0.0.1",
        "userserviceport": '3637',
        "userserviceversion": "1.0.0.0",



        "ticketurl": "127.0.0.1",
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