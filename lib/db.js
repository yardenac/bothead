#!/usr/bin/env node

var colors = require('colors');
var console = require('console');
var jss = require('json-stable-stringify');
var lock = require('level-lock');
var overextend = require('./overextend.js');

var err = function(message) {
    console.log('error: ', message);
};
module.exports = function() {
    var db = require('level').apply(this,[].slice.call(arguments));
    db.dump = function() {
        console.log();
        var self = this;
        self.createReadStream({
            gt: null,
            lt: undefined
        }).on('data',function(data, err) {
            if (err) return err(err);
            console.log(colors.magenta(data.key) + ' ' + data.value.toString());
        });
    }
    db.merge = function(key, obj, num) {
        if ((num === undefined) || (num === null) || !num) num = 0;
        if (num > 5) return console.log("giving up merging " + key);
        // it's a db of json strings, ~sql, this merges them
        var self = this;
        var unlock = lock(self,key,'w');
        if (!unlock) return setTimeout(self.merge.bind(self),1000,key,obj,num+1);
        self.get(key,function(err,oldval) {
            if (err) {
                if (err.name == 'NotFoundError') {
                    self.put(key,jss(obj));
                    console.log('new: ' + jss(obj));
                } else console.error('weird db err: ' + err);
            } else {
                var newobj = overextend(JSON.parse(oldval),obj);
                self.put(key,jss(newobj));
                console.log('changed: ' + jss(newobj));
            };
            unlock();
        });
    };
    db.stamp = function(key, stampname, lifespan, cb, num) {
        // atomically check a timestamp
        // if it's older than lifespan milliseconds,
        // then update it and callback
        if ((num === undefined) || (num === null) || !num) num = 0;
        if (num > 5) return console.log("giving up getting " + key);
        var self = this;
        var unlock = lock(self,key,'w');
        if (!unlock) return setTimeout(self.stamp.bind(self),1000,key,stampname,lifespan,cb,num+1);
        self.get(key,function(err,oldval) {
            var obj = {};
            var oldstamp = 0;
            var now = Date.now();
            if (err) {
                if (err.name == 'NotFoundError') {
                    obj['nick'] = key;
                } else {
                    console.error('weird db err while stamping ' + key + '[' + stampname + ']' + ': ' + err);
                    return unlock();
                };
            } else {
                obj = JSON.parse(oldval);
                if (obj[stampname]) oldstamp = obj[stampname];
            };
            if (now - oldstamp > lifespan) {
                obj[stampname] = now;
                self.put(key,jss(obj));
                cb();
            };
            unlock();
        });
    };
    return db;
};
