var globRegExp = /[*?+{}]/;
var glob = require("glob");
var series = require('raptor-async/series');
var nodePath = require('path');

function globNormalizer(dependency, context, callback) {
    if (typeof dependency === 'string' && globRegExp.test(dependency)) {

        var pattern = dependency;
        var typeSeparator = dependency.indexOf(':');
        var type = null;
        var basedir = context.dirname;
        var matches = [];

        if (typeSeparator) {
            type = dependency.substring(0, typeSeparator).trim();
            pattern = dependency.substring(typeSeparator+1);

        }

        pattern = pattern.trim();
        var patterns = pattern.split(/\s+/);
        var asyncTasks = patterns.map(function(pattern) {
            return function(callback) {
                glob(pattern,
                    {
                        cwd: basedir
                    },
                    function (err, files) {
                        if (err) {
                            return callback(err);
                        }

                        matches = matches.concat(files);
                        callback();
                    });
            };
        });

        series(asyncTasks, function(err) {
            if (err) {
                return callback(err);
            }


            matches = matches.map(function(match) {
                match = nodePath.join(basedir, match);
                return type ? type + ':' + match : match;
            });

            callback(null, matches);
        });

    } else {
        callback();
    }
}

exports.normalizer = globNormalizer;