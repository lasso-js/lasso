const nodePath = require('path');
const promisify = require('pify');
const glob = promisify(require('glob'));

const globRegExp = /[*?+{}]/;

async function globNormalizer (dependency, context) {
    if (typeof dependency === 'string' && globRegExp.test(dependency)) {
        const typeSeparator = dependency.indexOf(':');
        const basedir = context.dirname;

        let pattern = dependency;
        let type = null;
        let matches = [];

        if (typeSeparator) {
            type = dependency.substring(0, typeSeparator).trim();
            pattern = dependency.substring(typeSeparator + 1);
        }

        pattern = pattern.trim();

        const patterns = pattern.split(/\s+/);

        for (const pattern of patterns) {
            const files = await glob(pattern, { cwd: basedir });
            matches = matches.concat(files);
        }

        matches = matches.map((match) => {
            match = nodePath.join(basedir, match);
            return type ? type + ':' + match : match;
        });

        return matches;
    }
}

exports.normalizer = globNormalizer;
