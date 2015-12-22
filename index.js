#!/usr/bin/env node

var colors = require('colors');
var console = require('console');
var irc = require('irc').Client;

var argv = require('minimist')(process.argv.slice(2), {
    alias: {
        D: 'dir'
    },
    boolean: ['debug'],
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

var db = {
    nicks: require('path').join(argv.dir, argv.datadir, 'nicks')
};
require('mkdirp').sync(db.nicks);
db.nicks = require(__dirname + '/lib/db.js')(db.nicks);

var err = function(message) {
    console.log('error: ', message);
};

var client = new irc('chat.freenode.net', set.username, {
    nick: set.username,
    userName: set.username,
    realName: set.username,
    password: set.password,
    port: 7000,
    debug: argv.debug,
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

client._maxListeners = 30;
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
    'rpl_creationtime',
    'rpl_welcome',
    'rpl_yourhost',
    'rpl_myinfo',
    'rpl_topic',
    'rpl_topicwhotime',
    'rpl_endofnames',
    'rpl_whoisuser',
    'rpl_whoischannels',
    'rpl_whoisserver',
    'rpl_whoisidle',
    '330',
    '378',
    '671',
    'rpl_endofwhois',
    'rpl_namreply',
    'rpl_away'
];
var ignored_sendtypes = [
    'PONG',
    'WHOIS'
];
var isString = function(v) {
    if (v === null || v === undefined) return false;
    return (typeof v === 'string' || v instanceof String);
};
var safeNick = function(nick) {
    // if it's not a nick, return false
    // if it is, return the nick (with @ or + stripped)
    if (!nick || !isString(nick)) return false;
    var match = nick.match(/^[@+]?([a-z_\-\[\]\\^{}|`][a-z0-9_\-\[\]\\^{}|`]{2,15})$/i);
    if (match === null) return false;
    return match[1];
};
var endswith = function(v, end) {
    // does the string 'v' end with the string 'end'?
    if (!v || !end || !isString(v) || !isString(end)) return false;
    var start = v.length - end.length;
    if (start < 0) return false;
    return (v.substring(0,start) === end);
};
var parseUser = function(u) {

    // sanitize input...
    if (!(u.nick = safeNick(u.nick))) {
        console.log('NOT A NICK: ' + u.nick);
        return false;
    };

    if (!u.host || !isString(u.host)) {
        // weird. whois doesn't even go here. untrustworthy info
        console.log(colors.red('no host???' + jss(u)));
        return false;
    };

    delete u.channel;

    // ask nickserv about it, but not more than daily
    db.nicks.stamp(u.nick, 'lastns', 86400000, function() {
        client.say('nickserv','info ' + u.nick + ' all');
    });

    return db.nicks.merge(u.nick, u);
};
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
        switch(m.command) {
        case 'rpl_myinfo':
            set.host = m.args[1];
            break;
        case 'rpl_namreply':
            m.args[3].split(' ').forEach(function(nick) {
                if (!(nick = safeNick(nick))) return false;
                client._maxListeners++;
                client.whois(nick, function(whois) {
                    client._maxListeners--;
                    parseUser({
                        channel: m.args[2],
                        nick: whois.nick,
                        username: whois.user,
                        host: whois.host,
                        realname: whois.realname
                    });
                });
            });
            break;
        case 'JOIN':
        case 'QUIT':
            parseUser({
                channel: m.args[0],
                nick: m.nick,
                username: m.user,
                host: m.host
            });
            break;
        case 'NICK':
            parseUser({
                nick: m.args[0],
                username: m.user,
                host: m.host
            });
            break;
        case 'PRIVMSG':
            // all nickserv messages are duplicated as notices
            if (m.nick === 'NickServ'
                && m.user === 'NickServ'
                && m.host === 'services.') {
                return;
            };
            break;
        case 'NOTICE':
            if (m.nick === 'NickServ'
                && m.user === 'NickServ'
                && m.host === 'services.') {
                if (m.args[1].match(/^Information on [a-z0-9_\-\[\]\\^{}|`]+ \(account /)) {
                    var words = m.args[1].split(' ');
                    var lastword = words[words.length - 1];
                    setTimeout(parseUser,0,{
                        nick: words[2],
                        accountname: lastword.substring(0, lastword.length - 2)
                    });
                    return;
                } else if (endswith(m.args[1],' has enabled nick protection')) {
                    return;
                } else
                    switch(m.args[1].substring(0,13)) {
                    case 'Registered : ':
                    case 'User reg.  : ':
                    case 'Last addr  : ':
                    case 'vHost      : ':
                    case 'Last seen  : ':
                    case 'Logins from: ':
                    case 'Nicks      : ':
                    case 'Email      : ':
                    case 'Flags      : ':
                    case '*** End of In':
                        return;
                    };
            };
        case '396':
            var fserver = /[a-z0-9]+\.freenode\.net$/i;
            if (m.prefix && m.prefix.match(fserver)
                && m.server.match(fserver)
                && (m.commandType === 'normal')
                && (m.args[0] === set.username)
                && m.args[1].match(/^unaffiliated\//)
                && (m.args[2] === 'is now your hidden host (set by services.)')) {
                set.channels.forEach(function(channel) {
                    if (isString(channel))
                        client.join(channel)
                    else {
                        client.join(channel.name);
                        client.join(channel.opchannel);
                    };
                });
            };
            break;
        };

        if (ignored_commandtypes.indexOf(m.command) > -1) return;

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
});
client.addListener('send', function (s) {
    var cmd = /^([^ ]+)/.exec(s);
    if (cmd && cmd[1] && (ignored_sendtypes.indexOf(cmd[1]) < 0)) {
        console.log(colors.yellow(s));
    };
});

// print database contents on ctrl-z
process.on('SIGTSTP',function() {
    db.nicks.dump();
});

// close connection properly on ctrl-c, etc
['SIGABRT',
 'SIGCONT',
 'SIGEXIT',
 'SIGHUP',
 'SIGINT',
 'SIGTERM',
 'SIGQUIT'].forEach(function(sig) {
    process.on(sig, function() {
        console.log('Got signal: ' + sig);
        client.disconnect(err);
        process.exit();
    });
});
