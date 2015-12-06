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
client.addListener('raw', function (message) {
    var fserver = /[a-z0-9]+\.freenode\.net$/i;
    if (message.prefix && message.prefix.match(fserver)
        && message.server.match(fserver)
        && (message.commandType === 'normal')
        && (message.args[0] === set.username)
        && message.args[1].match(/^unaffiliated\//)
        && (message.args[2] === 'is now your hidden host (set by services.)')) {
        client.join(set.channels);
    }
});
client.addListener('message', function (from, to, text, message) {
    console.log(to + ' ' + from + ' ' + text);
    if (/^&quit/.test(text)) {
        client.disconnect(err);
        process.exit();
    }
});
