/**
 * Created by Pawan on 11/24/2017.
 */
var format = require('stringformat');
var config = require('config');
var amqp = require('amqp');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;


var eventQueue=config.EventQueueName;

var ips = [];
if(config.RabbitMQ.ip) {
    ips = config.RabbitMQ.ip.split(",");
}


var queueConnection = amqp.createConnection({
    //url: queueHost,
    host: ips,
    port: config.RabbitMQ.port,
    login: config.RabbitMQ.user,
    password: config.RabbitMQ.password,
    vhost: config.RabbitMQ.vhost,
    noDelay: true,
    heartbeat:10
}, {
    reconnect: true,
    reconnectBackoffStrategy: 'linear',
    reconnectExponentialLimit: 120000,
    reconnectBackoffTime: 1000
});

queueConnection.on('ready', function () {

    logger.info("Conection with the queue is OK");
});

queueConnection.on('error', function (error) {

    logger.info("There is an error" + error);
});

module.exports.PublishToQueue = function(sendObj ) {

    logger.info("Email Send : " + JSON.stringify(sendObj));

    try {
        if (sendObj) {
            queueConnection.publish(eventQueue, sendObj, {
                contentType: 'application/json'
            });
        }
    } catch (exp) {

        console.log(exp);
    }
}


