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


"Services": {

    "uploadurl": 'http://45.55.179.9:8860/',
    "downloaddurl": 'http://45.55.179.9:8860/',
    "ruleservice": 'http://127.0.0.1',
    "ards": 'http://127.0.0.1',
    "uploadurlVersion":"1.0.0",
    "downloaddurlVersion" : "1.0.0",
    "ruleserviceVersion": "1.0.0",
    "ardsVersion": "1.0.0"

    }



};