module.exports = { 
  "Freeswitch" : {
  "ip": 'localhost',
  "port": 8021,
  "password": 'devadmin'
  },


"Redis" : {
    "ip": '127.0.0.1',
    "port": 6379
    },

"HTTPServer" : {
    "port": 8086
    },


"LBServer" : {

    "ip": '127.0.0.1',
    "port": 8086

    },

    "Host":{

        "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdWtpdGhhIiwianRpIjoiMDY1N2ZjNjEtZDUwMy00ZTZlLWE5NTktYzgyODllYmIxODg0Iiwic3ViIjoiNTZhOWU3NTlmYjA3MTkwN2EwMDAwMDAxMjVkOWU4MGI1YzdjNGY5ODQ2NmY5MjExNzk2ZWJmNDMiLCJleHAiOjE0NTkyMjk2NTAsInRlbmFudCI6MSwiY29tcGFueSI6MSwic2NvcGUiOlt7InJlc291cmNlIjoiZmlsZXNlcnZpY2UiLCJhY3Rpb25zIjpbInJlYWQiLCJ3cml0ZSIsImRlbGV0ZSJdfV0sImlhdCI6MTQ1ODYyNDg1MH0.sUujjP0gDxLFliZtEdIvchv0BZne3fxiz3xjf1Hm6c0"
    },

"Services": {

    "uploadurl": '192.168.0.88',
    "uploadport": '8081',
    "downloadurl": '192.168.0.88',
    "downloadport": '8081',
    "ruleservice": '127.0.0.1',
    "ruleserviceport":'8888',
    "ards": '127.0.0.1',
    "ardsport": '8080',

    "qmusicurl": '45.55.179.9',
    "qmusicport": '8860',
    "ardsVersion": "1.0.0",

    "uploadurlVersion":"6.0",
    "downloaddurlVersion" : "6.0",
    "ruleserviceVersion": "1.0.0",
    "qmusicVersion": "1.0.0"


    }



};