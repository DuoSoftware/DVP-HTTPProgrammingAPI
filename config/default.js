module.exports = { 
  Freeswitch : {
  ip: 'localhost',
  port: 8021,
  password: 'devadmin'
  },

 WebAPI : {
      domain: '192.168.1.35',
      port: 80,
      path: '/CSRequestWebApi/api/'
      },

Redis : {
    ip: '192.168.2.33',
    port: 6379
    },

HTTPServer : {
    port: 8086
    },


LBServer : {
    path: 'http://192.168.0.108:8086/'
    }

};