'use strict';

var createStream = require('../common').createStream;
var debug = require('debug')('transport:json');

module.exports = function jsonParser(options) {
  return createStream(options, 'json', parser);
};

function parser(file) {
  debug('filepath:%s', file.path);
  var code = 'module.exports = ' + clean(file) + ';\n';
  file.contents = new Buffer(code);
  file.originPath = file.originPath || file.path;
  file.path += '.js';
  return file;
}

function clean(file) {
  var code = file.contents.toString();
  return JSON.stringify(JSON.parse(code));
}
