'use strict';

var path = require('path');
var join = path.join;
var extname = path.extname;
var through = require('through2');
var PluginError = require('gulp-util').PluginError;
var debug = require('debug')('transport:util');

var util = require('./util');
var template = util.template;
var extendOption = util.extendOption;
var isRelative = util.isRelative;
var hideExt = util.hideExt;
var addExt = util.addExt;
var rename = util.rename;
var winPath = util.winPath;

/*
  exports
*/

exports.transportId = transportId;
exports.transportDeps = transportDeps;
exports.getFileInfo = getFileInfo;
exports.createStream = createStream;
exports.getStyleId = getStyleId;
exports.getExtra = getExtra;
exports.getDepsPackage = getDepsPackage;
exports.resolveIdleading = resolveIdleading;

/*
  Transport cmd id

  - filepath: file path based on package
  - pkg: package info parsed by father
  - required options: idleading, rename
*/

function transportId(filepath, pkg, options) {
  options = extendOption(options);
  if (isRelative(filepath)) {
    throw new PluginError('transportId', 'do not support relative path');
  }

  var idleading = resolveIdleading(options.idleading, filepath, pkg);
  var prefix = template(idleading, pkg);

  // rename with fullpath
  filepath = join(pkg.dest, filepath);
  filepath = addExt(filepath);

  var file = {
    path: filepath,
    originPath: filepath
  };
  filepath = rename(file, options);

  filepath = path.relative(pkg.dest, filepath);
  filepath = hideExt(filepath);

  // seajs has hacked css before 3.0.0
  // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
  // demo https://github.com/popomore/seajs-test/tree/master/css-deps
  if (extname(filepath) === '.css') {
    filepath += '.js';
  }

  var id = winPath(join(prefix, filepath));
  debug('transport id(%s) of pakcage %s', id, pkg.id);
  return id;
}

/*
  Transport cmd dependencies, it will get deep dependencies of the file,
  but will ignore relative module of the dependent package.

  - filepath: file path based on package
  - pkg: package info parsed by father
  - required options: idleading, rename, ignore
*/

function transportDeps(filepath, pkg, options) {
  if (!pkg.files[filepath]) {
    throw new PluginError('transportDeps', filepath + ' is not included in ' + Object.keys(pkg.files));
  }

  options = extendOption(options);
  var deps, file = pkg.files[filepath];
  var include = options.include;
  var extra = getExtra(file, pkg, options);
  var ignore = getDepsPackage(options.ignore, pkg);

  // only return ignore package when include = all
  if (include === 'all') {
    deps = file.lookup(function(fileInfo) {
      var pkg = fileInfo.pkg;
      return !fileInfo.isRelative && (fileInfo.ignore || ignore.indexOf(pkg.id) > -1) ?
        pkg.name : false;
    });
  } else {
    deps = file.lookup(function(fileInfo) {
      var file = fileInfo.filepath;
      var pkg = fileInfo.pkg;
      var isRelative = fileInfo.isRelative;

      if (fileInfo.ignore) {
        return pkg.name;
      }

      // needn't contain css
      if (fileInfo.extension === 'css') {
        return false;
      }

      // relative file need transport only when self
      if (isSelf(pkg) && include !== 'self') {
        return false;
      }

      // package dependencies
      if (!isSelf(pkg)) {
        // ignore relative file in package of dependencies
        if (isRelative) return false;

        // don't transport ignore package
        if (~ignore.indexOf(pkg.id)) {
          return pkg.name;
        }
      }

      return transportId(file, pkg, options);
    }, extra);
  }

  debug('transport deps(%s) of pakcage %s, include: %s', deps, pkg.id, include);
  return deps;

  // test if pkg is self
  function isSelf(pkg_) {
    return pkg_.name === pkg.name;
  }
}

/*
  Get filepath and pkg from vinyl object, attempt to find
  from dependent package if current package don't match.
*/

function getFileInfo(file, pkg) {
  var fullpath = file.path;
  // hack file.path for gulp-rev
  var origFullpath = file.revOrigPath || file.originPath || fullpath;
  var originPath = relative(pkg.dest, origFullpath);

  // if specified filepath is not in pkg.files, then find it in pkg.dependencies
  if (!pkg.files[originPath]) {
    var hasFound = false, pkgs = pkg.getPackages();
    for (var i in pkgs) {
      var p = pkgs[i];
      if (~origFullpath.indexOf(p.dest)) {
        originPath = relative(p.dest, origFullpath);
        pkg = p;
        hasFound = true;
        break;
      }
    }
    if (!hasFound) {
      throw new PluginError('getFileInfo', 'not found ' + originPath + ' of pkg ' + pkg.id);
    }
  }

  var filepath = relative(pkg.dest, file.path);

  debug('found fileInfo filepath(%s)/origin(%s) pkg(%s)', filepath, originPath, pkg.id);
  return {
    originPath: originPath,
    path: filepath,
    pkg: pkg
  };

  function relative(path1, path2) {
    return util.winPath(path.relative(path1, path2));
  }
}

/*
  Create a stream for parser in lib/parser
*/

function createStream(options, type, parser) {
  options = extendOption(options);
  if (!options.pkg) {
    throw new PluginError('transport', 'pkg missing');
  }

  var pluginName = 'transport:' + type;

  return through.obj(function(file, enc, callback) {
    if (file.isStream()) return callback(new PluginError(pluginName, 'Streaming not supported.'));

    var ext = extname(file.path).substring(1);
    if (ext !== type) {
      return callback(new PluginError(pluginName, 'extension "' + ext + '" not supported.'));
    }

    try {
      file = parser(file, options);
    } catch(e) {
      return callback(new PluginError(pluginName, e));
    }

    this.push(file);
    return callback();
  });
}

function getStyleId (file, options) {
  var fileInfo = getFileInfo(file, options.pkg);
  var idleading = resolveIdleading(
    options.idleading,
    fileInfo.originPath,
    fileInfo.pkg
  );
  return template(idleading, fileInfo.pkg)
    .replace(/\\/g, '/')
    .replace(/\/$/, '')
    .replace(/\//g, '-')
    .replace(/\./g, '_');
}

function isFunction(fun) {
  return Object.prototype.toString.call(fun) === '[object Function]';
}

function resolveIdleading(idleading, filepath, pkg) {
  return isFunction(idleading) ?
    idleading(filepath, pkg) : idleading;
}

/*
  Get extra fileInfo for file.lookup
  see https://github.com/popomore/father#file-object
*/

var extDeps = {
  'handlebars': 'handlebars-runtime',
  'css': 'import-style'
};

function getExtra(file, pkg, options) {
  return Object.keys(extDeps).filter(function(ext) {
    return file.extension === ext || file.hasExt(ext, ignoreCssOutDependency);
  }).map(function(ext) {
    var name = extDeps[ext];
    var extraPkg = options.pkg.dependencies[name];
    if (!extraPkg) {
      throw new Error(name + ' not exist, but required .' + ext);
    }

    // extra package
    var deps = {};
    deps[name] = extraPkg;
    pkg.dependencies = deps;

    return {
      filepath: extraPkg.main,
      pkg: extraPkg,
      isRelative: false,
      extension: extname(extraPkg.main).substring(1)
    };
  });

  // return false if css file is not in pkg or pkg.dependencies
  function ignoreCssOutDependency(fileInfo) {
    var pkg = fileInfo.pkg;
    return !(fileInfo.extension === 'css' && !(isSelf(pkg) || isInDeps(pkg)));
  }

  // test if it is in pkg.dependencies
  function isInDeps(pkg_) {
    return !!pkg.dependencies[pkg_.name];
  }

  // test if pkg is self
  function isSelf(pkg_) {
    return pkg_.name === pkg.name;
  }
}

function getDepsPackage(name, pkg) {
  if (!Array.isArray(name)) name = [name];

  return _getDepsPackage(pkg.dependencies, false)
  .filter(function(item, index, arr) {
    return index === arr.indexOf(item);
  });

  function _getDepsPackage(deps, include) {
    var ret = [];
    Object.keys(deps)
    .forEach(function(key) {
      var pkg = deps[key], isIncluded = name.indexOf(key) > -1 || include;
      if (isIncluded) {
        ret.push(pkg.id);
      }
      ret = ret.concat(_getDepsPackage(pkg.dependencies, isIncluded));
    });
    return ret;
  }
}
