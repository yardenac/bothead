#!/usr/bin/env node

var colors = require('colors');
var console = require('console');
var jss = require('json-stable-stringify');
var xtend = require('xtend');

var err = function(message) {
    console.log('error: ', message);
};
module.exports = function() {
    var db = require('level').apply(this,[].slice.call(arguments));
    db.dump = function() {
        console.log();
        this.createReadStream({
            gt: null,
            lt: undefined
        }).on('data',function(data) {
            console.log(colors.magenta(data.key) + ' ' + data.value.toString());
        });
    }
    db.merge = function(key, obj) {
        // it's a db of json strings, ~sql, this merges them
        var self = this;
        this.get(key,function(err,oldval) {
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
        });
    };
    return db;
};
