#!/usr/bin/env node

var colors = require('colors');
var console = require('console');

module.exports = {
    dbdump: function(db) {
        console.log();
        db.createReadStream({
            gt: null,
            lt: undefined
        }).on('data',function(data) {
            console.log(colors.magenta(data.key) + ' ' + data.value.toString());
        });
    }
};
