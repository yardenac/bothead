#!/usr/bin/env node

var console = require('console');
var irc = require('irc').Client;

var argv = require('minimist')(process.argv.slice(2), {
    alias: {
        D: 'dir'
    },
    default: {
        datadir: 'db',
        dir: undefined
    }
});
if (argv.dir === undefined) {
    console.log("USAGE: bothead -D /path/to/bot/homedir");
} else {
    var set = require(argv.dir + '/settings.js');
};

var err = function(message) {
    console.log('error: ', message);
};

var client = new irc('chat.freenode.net', set.username, {
    nick: set.username,
    userName: set.username,
    realName: set.username,
    password: set.password,
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
        && (to === set.username)
        && (text === "You are now identified for " + set.username + ".")) {
        client.join(set.channels);
    }
});
client.addListener('message', function (from, to, message) {
    console.log(to + ' ' + from + ' ' + message);
    if (/^&quit/.test(message)) {
        client.disconnect(err);
        process.exit();
    }
});
