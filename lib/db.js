#!/usr/bin/env node

var colors = require('colors');
var console = require('console');

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
    return db;
};
