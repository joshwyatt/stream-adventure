var spawn = require('child_process').spawn;
var tuple = require('tuple-stream');
var through = require('through');
var split = require('split');
var path = require('path');

var x256 = require('x256');

var COLORS = (function () {
    var c = {
        PASS: [0,255,0],
        FAIL: [255,0,0],
        INFO: [0,255,255]
    };
    return Object.keys(c).reduce(function (acc, key) {
        acc[key] = '\x1b[38;5;' + x256(c[key]) + 'm';
        return acc;
    }, {});
})();
COLORS.RESET = '\x1b[00m';

module.exports = function (acmd, bcmd) {
    var a = spawn(process.execPath, acmd);
    var b = spawn(process.execPath, bcmd);
    
    var c = compare(a.stdout, b.stdout);
    c.on('pass', function () { tr.emit('pass') });
    c.on('fail', function () { tr.emit('fail') });
    
    var tr = through();
    tr.pipe(a.stdin);
    tr.pipe(b.stdin);
    return tr;
};

function compare (actual, expected) {
    var equal = true;
    var output = through(write, end).pause();
    output.queue(COLORS.RESET);
    output.queue(wrap('ACTUAL', 30) + '     EXPECTED\n');
    output.queue(wrap('------', 30) + '     --------\n');
    
    tuple(actual.pipe(split()), expected.pipe(split()))
        .pipe(output)
        .pipe(process.stdout)
    ;
    output.resume();
    return output;
    
    function write (pair) {
        var eq = pair[0] === pair[1];
        equal = equal && eq;
        this.queue(
            COLORS[eq ? 'PASS' : 'FAIL']
            + wrap(JSON.stringify(pair[0]), 30)
            + ' ' + (eq ? '   ' : '!==') + ' '
            + wrap(JSON.stringify(pair[1]), 30)
            + '\n'
        );
    }
    
    function end () {
        output.queue(COLORS.RESET);
        this.queue(null);
        this.emit(equal ? 'pass' : 'fail');
    }
}

function wrap (s_, n) {
    var s = String(s_);
    return s + Array(Math.max(0, n + 1 - s.length)).join(' ');
}
