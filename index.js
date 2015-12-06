#!/usr/bin/env node

var console = require('console');
var irc = require('irc').Client;

var err = function(message) {
    console.log('error: ', message);
};

var username = '';
var channels = '';
var password = '';

var client = new irc('chat.freenode.net', username, {
    nick: username,
    userName: username,
    realName: username,
    password: password,
    port: 7000,
    debug: true,
    showErrors: true,
    autoRejoin: false,
    autoConnect: true,
    secure: true,
    selfSigned: true,
    certExpired: true,
    floodProtection: true,
    floodProtectionDelay: 1000,
    sasl: true,
    stripColors: true,
    channelPrefixes: "&#",
    messageSplit: 512,
    encoding: ''
});

client.addListener('error', err);
client.addListener('notice', function (nick, to, text, message) {
    if ((message.prefix === "NickServ!NickServ@services.")
        && (to === username)
        && (text === "You are now identified for " + username + ".")) {
        client.join(channels);
    }
});
client.addListener('message', function (from, to, message) {
    console.log(to + ' ' + from + ' ' + message);
    if (/^&quit/.test(message)) {
        client.disconnect(err);
        process.exit();
    }
});
