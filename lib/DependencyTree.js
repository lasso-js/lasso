function Node(dependency, parent) {
    this.dependency = dependency;
    this.children = [];
    this.parent = parent;
}

function DependencyTree() {
    this._root = new Node();
    this._root.isRoot = true;
    this._nodes = {};
    this._bundleTrees = {};
}

DependencyTree.prototype = {
    add: function(dependency, parentDependency) {
        var parentNode = parentDependency ?
            this._nodes[parentDependency.getKey()] :
            this._root;

        if (!parentNode) {
            throw new Error('parentNode node not found: ' + parentDependency.getKey());
        }

        var node = new Node(dependency, parentNode);

        parentNode.children.push(node);
        this._nodes[dependency.getKey()] = node;
    },

    addToBundle: function(bundle, dependency, parentDependency) {
        var bundleTree = this._bundleTrees[bundle.getKey()];
        if (!bundleTree) {
            bundleTree = this._bundleTrees[bundle.getKey()] = new DependencyTree();
            bundleTree.bundle = bundle;
        }

        var parentNode = parentDependency ?
            this._nodes[parentDependency.getKey()] :
            this._root;

        var copyNodes = function(node) {
            if (node.isRoot || bundleTree._nodes[node.dependency.getKey()]) {
                return;
            }

            if (node.parent) {
                copyNodes(node.parent);
            }



            bundleTree.add(node.dependency, node.parent ? node.parent.dependency : null);

        };

        copyNodes(parentNode);

        bundleTree.add(dependency, parentDependency);
    },

    bundlesToString: function() {
        var lines = [];

        for (var k in this._bundleTrees) {
            if (this._bundleTrees.hasOwnProperty(k)) {
                var bundleTree = this._bundleTrees[k];
                lines.push('Bundle ' + bundleTree.bundle.toString() + ':');
                lines.push(bundleTree.toString());
            }
        }

        return lines.join('\n');
    },

    toString: function() {
        var lines = [];

        function toStringHelper(node, indent) {
            for (var i=0, len=node.children.length; i<len; i++) {
                var child = node.children[i];
                var line = indent;
                if (!child.dependency.isPackageDependency()) {
                    line += '+ ';
                }
                line += child.dependency.toString();

                lines.push(line);
                
                toStringHelper(child, indent + '  ');
            }
        }

        toStringHelper(this._root, '  ');

        return lines.join('\n');
        
    }
};

module.exports = DependencyTree;