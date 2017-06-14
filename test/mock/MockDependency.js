'use strict';

class MockDependency{
    getParentManifestDir() {
        return this.__dirname;
    }

    getParentManifestPath() {
        return this.__filename;
    }
}

module.exports = MockDependency;