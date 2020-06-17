module.exports = {
  Freeswitch: {
    ip: "localhost",
    port: 8021,
    password: "devadmin",
  },

  VoiceMail: {
    type: "voicemail",
    priority: "high",
  },

  Redis: {
    mode: "sentinel", //instance, cluster, sentinel
    ip: "",
    port: 6379,
    user: "",
    password: "",
    sentinels: {
      hosts: "",
      port: 6379,
      name: "redis-cluster",
    },
  },

  Security: {
    ip: "",
    port: 6379,
    user: "",
    password: "",
    mode: "instance", //instance, cluster, sentinel
    sentinels: {
      hosts: "",
      port: 6379,
      name: "redis-cluster",
    },
  },

  HTTPServer: {
    port: 8086,
  },

  LBServer: {
    ip: "8e047a84.ngrok.io",
    port: 8086,
  },

  Host: {
    apptoken:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdWtpdGhhIiwianRpIjoiYWEzOGRmZWYtNDFhOC00MWUyLTgwMzktOTJjZTY0YjM4ZDFmIiwic3ViIjoiNTZhOWU3NTlmYjA3MTkwN2EwMDAwMDAxMjVkOWU4MGI1YzdjNGY5ODQ2NmY5MjExNzk2ZWJmNDMiLCJleHAiOjE5MDIzODExMTgsInRlbmFudCI6LTEsImNvbXBhbnkiOi0xLCJzY29wZSI6W3sicmVzb3VyY2UiOiJhbGwiLCJhY3Rpb25zIjoiYWxsIn1dLCJpYXQiOjE0NzAzODExMTh9.Gmlu00Uj66Fzts-w6qEwNUz46XYGzE8wHUhAJOFtiRo",
    token:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdWtpdGhhIiwianRpIjoiYWEzOGRmZWYtNDFhOC00MWUyLTgwMzktOTJjZTY0YjM4ZDFmIiwic3ViIjoiNTZhOWU3NTlmYjA3MTkwN2EwMDAwMDAxMjVkOWU4MGI1YzdjNGY5ODQ2NmY5MjExNzk2ZWJmNDMiLCJleHAiOjE5MDIzODExMTgsInRlbmFudCI6LTEsImNvbXBhbnkiOi0xLCJzY29wZSI6W3sicmVzb3VyY2UiOiJhbGwiLCJhY3Rpb25zIjoiYWxsIn1dLCJpYXQiOjE0NzAzODExMTh9.Gmlu00Uj66Fzts-w6qEwNUz46XYGzE8wHUhAJOFtiRo",
  },

  Services: {
    uploadurl: "fileservice.local",
    uploadport: "8812",
    downloadurl: "fileservice.local",
    downloadport: "8812",
    ruleservice: "ruleservice.local",
    ruleserviceport: "8817",
    ards: "ardsliteservice.local",
    ardsport: "8828",
    ardsversion: "1.0.0.0",

    ardsServiceHost: "ardsliteservice.local",
    ardsServicePort: "8828",
    ardsServiceVersion: "1.0.0.0",

    qmusicurl: "queuemusic.local",
    qmusicport: "8843",
    qmusicversion: "1.0.0.0",

    fileserviceurl: "fileservice.local",
    fileserviceport: "8812",
    fileserviceVersion: "1.0.0.0",

    interactionurl: "interactions.local",
    interactionport: "8873",
    interactionversion: "1.0.0.0",

    userserviceurl: "userservice.local",
    userserviceport: "8842",
    userserviceversion: "1.0.0.0",

    ticketurl: "liteticket.local",
    ticketport: "8872",
    ticketversion: "1.0.0.0",

    csaturl: "queuemusic.local",
    csatport: "3636",
    csatversion: "1.0.0.0",

    uploadurlVersion: "1.0.0.0",
    downloaddurlVersion: "1.0.0.0",
    ruleserviceVersion: "1.0.0.0",
    qmusicVersion: "1.0.0.0",

    dynamicPort: true,
  },
};
