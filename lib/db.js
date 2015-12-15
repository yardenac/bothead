#!/usr/bin/env node

var colors = require('colors');
var console = require('console');
var jss = require('json-stable-stringify');
var lock = require('level-lock');
var xtend = require('xtend');

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
                var newobj = xtend(JSON.parse(oldval),obj);
                self.put(key,jss(newobj));
                console.log('changed: ' + jss(newobj));
            };
            unlock();
        });
    };
    return db;
};
