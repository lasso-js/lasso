exports.createDependency = function(dirname) {
    return {
        "parentPath": "/test/fixtures/dep-require/autotest/require-installed",
        "childName": "installed-bar",
        "childVersion": "1.2.0"
    };
};