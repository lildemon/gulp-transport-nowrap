# History

---

## 0.6.9

support .html

## 0.6.8

fix ignore package in transportDeps when fileInfo.ignore

## 0.6.7

if package is not existed, fileInfo.ignore will be true 

## 0.6.6

- improve rename
- return package name when package is ignore

## 0.6.5

- fix dest plugin when rename
- improve fileInfo return [originPath, path, pkg]

## 0.6.4

can transport the dependencies of the package

## 0.6.3

remove dest plugin in from transport

## 0.6.2

fix dest position

## 0.6.1

- fix extendOption when empty string
- opt.stream's value should be function
- add dest plugin

## 0.6.0

- big change, transport stream wrapped
- upgrade searequire@1.5.0

## 0.5.5

fix ignore in handlebars spmjs/spm#831

## 0.5.4

fix idleading exception

## 0.5.3

fix win path in getFileInfo spmjs/spm#815

## 0.5.2

add styleBox option

## 0.5.1

fix ie hack when css2js

## 0.5.0

- idleading support function
- change .css -> .css.js
- remove css comment
- support require directory

## 0.4.7

- update npmignore
- exports jsParser

## 0.4.6

fix windows path

## 0.4.5

- stop parsing dependencies when have been ignore
- ignore condition before package check
- throw when rename error
- replace ignore comment

## 0.4.4

fix quote bug in handlebar and tpl

## 0.4.3

handlebars -> handlebars-runtime

## 0.4.2

rollback: addExt: a.css -> a.css.js

## 0.4.1

- PluginError miss argument
- fix addExt: a.css -> a.css.js

## 0.4.0

- upgrade css-import@0.2.0
- transport relative id into complete id by transportId
- more testcase form cssParser

## 0.3.5

fix generateId when set base

## 0.3.4

util.replaceSuffix -> util.rename

## 0.3.3

don't modify origin option

## 0.3.2

add suffix option

## 0.3.1

throw when css conflict

## 0.3.0

- add cssParser
- upgrade father
- getId support sub package
- don't return relative path in dependent package

## 0.2.0

exports other parser as plugins, in parser folder

## 0.1.0

First commit
