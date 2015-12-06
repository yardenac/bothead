#!/usr/bin/env node

var colors = require('colors');
var console = require('console');
var irc = require('irc').Client;

var argv = require('minimist')(process.argv.slice(2), {
    alias: {
        D: 'dir'
    },
    default: {
        datadir: 'db',
        dir: undefined,
        host: ''
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
var ignored_commandtypes = [
    'PING',
    'rpl_created',
    'rpl_isupport',
    'rpl_luserclient',
    'rpl_luserop',
    'rpl_luserunknown',
    'rpl_luserchannels',
    'rpl_luserme',
    'rpl_localusers',
    'rpl_globalusers',
    'rpl_statsconn',
    'rpl_motdstart',
    'rpl_motd',
    'rpl_endofmotd',
    'rpl_creationtime'
];
client.addListener('raw', function (m) {
    var s = ''; // string we'll build & print to console

    var p = ''; // prefix/server string
    if (m.prefix && m.server) {
        if (m.prefix === m.server) {
            p = m.prefix;
        } else p = m.prefix + "/" + m.server;
    } else if (m.prefix) p = m.prefix;
    else if (m.server) p = m.server;
    else p = '_';
    if (p === set.host) p= '@'; // hostname is clutter
    s += colors.green(p) + ' ';

    var c = ''; // command string
    if (m.command && m.rawCommand && m.commandType) {
        if (ignored_commandtypes.indexOf(m.command) > -1) return;
        if (m.command === 'rpl_myinfo') set.host = m.args[1];

        if (m.command === m.rawCommand) c += m.command;
        else c += m.rawCommand + '/' + m.command;

        if (m.commandType === 'normal') true;
        else if (m.commandType === 'error') c += '/e';
        else if (m.commandType === 'reply') c += '/r';
        else c += '/w'; // weird
    } else c = '_';
    s += colors.cyan(c) + ' ';

    var u = ''; // user string
    if (m.nick) u += m.nick;
    if (m.user) u += '!' + m.user;
    if (m.host) u += '@' + m.host;

    // don't repeat noise if prefix & user strings are the same
    if (!(p === u)) s += colors.yellow(u) + ' ';

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
