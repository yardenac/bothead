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
client.addListener('raw', function (m) {
    var s = ''; // string we'll build & print to console

    var p = ''; // prefix/server string
    if (m.prefix && m.server) {
        if (m.prefix === m.server) {
            p += m.prefix + " ";
        } else p += m.prefix + "/" + m.server;
    } else if (m.prefix) p += m.prefix + ' ';
    else if (m.server) p += m.server + ' ';
    else p += '@ ';
    s += p;

    if (m.command && m.rawCommand && m.commandType) {
        if (m.command === m.rawCommand) s += m.command + ' ';
        else s += m.rawCommand + '/' + m.command + ' ' + m.commandType + ' ';
    } else s += '@ ';

    var u = ''; // user string
    if (m.nick) u += m.nick;
    if (m.user) u += '!' + m.user;
    if (m.host) u += '@' + m.host;
    u += ' ';

    // don't repeat noise
    if (!(p === u)) s += u;

    for (var i = 0, len = m.args.length; i < len; ++i) {
        if (i) s += '|';
        s += m.args[i];
    }
    console.log(s);

    var fserver = /[a-z0-9]+\.freenode\.net$/i;
    if (m.prefix && m.prefix.match(fserver)
        && m.server.match(fserver)
        && (m.commandType === 'normal')
        && (m.args[0] === set.username)
        && m.args[1].match(/^unaffiliated\//)
        && (m.args[2] === 'is now your hidden host (set by services.)')) {
        client.join(set.channels);
    }
});
client.addListener('message', function (from, to, text, m) {
    console.log(to + ' ' + from + ' ' + text);
    if (/^&quit/.test(text)) {
        client.disconnect(err);
        process.exit();
    }
});
