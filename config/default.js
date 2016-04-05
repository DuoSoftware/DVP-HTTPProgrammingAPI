module.exports = { 
  "Freeswitch" : {
  "ip": 'localhost',
  "port": 8021,
  "password": 'devadmin'
  },


"Redis" : {
    "ip": '127.0.0.1',
    "port": 6379,
    "user": "duo",
    "password": "DuoS123"
    },

    "Security":
    {
        "ip" : "45.55.142.207",
        "port": 6379,
        "user": "duo",
        "password": "DuoS123"
    },

"HTTPServer" : {
    "port": 8086
    },


"LBServer" : {

    "ip": '127.0.0.1',
    "port": 8086

    },

    "Host":{

        "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdWtpdGhhIiwianRpIjoiM2NmMTQ3Y2QtM2EyZS00MTdlLWE4NDMtNzBhMGJlYmMxN2QyIiwic3ViIjoiNTZhOWU3NTlmYjA3MTkwN2EwMDAwMDAxMjVkOWU4MGI1YzdjNGY5ODQ2NmY5MjExNzk2ZWJmNDMiLCJleHAiOjE0NTkyMzk4NzMsInRlbmFudCI6MSwiY29tcGFueSI6MSwic2NvcGUiOlt7InJlc291cmNlIjoiZmlsZXNlcnZpY2UiLCJhY3Rpb25zIjpbInJlYWQiLCJ3cml0ZSIsImRlbGV0ZSJdfV0sImlhdCI6MTQ1ODYzNTA3M30.87o-b51h1zSCMHf8TxxADaY4eFfTD3wWLoM29ExPlXY"
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