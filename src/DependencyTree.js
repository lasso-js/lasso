const hasOwn = Object.prototype.hasOwnProperty;

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
        const parentNode = parentDependency
            ? this._nodes[parentDependency.getKey()]
            : this._root;

        if (!parentNode) {
            throw new Error('parentNode node not found: ' + parentDependency.getKey());
        }

        const node = new Node(dependency, parentNode);

        parentNode.children.push(node);
        this._nodes[dependency.getKey()] = node;
    },

    addToBundle: function(bundle, dependency, parentDependency) {
        let bundleTree = this._bundleTrees[bundle.getKey()];
        if (!bundleTree) {
            bundleTree = this._bundleTrees[bundle.getKey()] = new DependencyTree();
            bundleTree.bundle = bundle;
        }

        const parentNode = parentDependency
            ? this._nodes[parentDependency.getKey()]
            : this._root;

        function copyNodes(node) {
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
        const lines = [];

        for (const k in this._bundleTrees) {
            if (hasOwn.call(this._bundleTrees, k)) {
                const bundleTree = this._bundleTrees[k];
                lines.push('Bundle ' + bundleTree.bundle.toString() + ':');
                lines.push(bundleTree.toString());
            }
        }

        return lines.join('\n');
    },

    toString: function(indent) {
        const lines = [];

        function toStringHelper(node, indent) {
            for (let i = 0, len = node.children.length; i < len; i++) {
                const child = node.children[i];
                let line = indent;
                if (!child.dependency.isPackageDependency()) {
                    line += '+ ';
                }
                line += child.dependency.toString();

                lines.push(line);

                toStringHelper(child, indent + '  ');
            }
        }

        toStringHelper(this._root, indent || '');

        return lines.join('\n');
    }
};

module.exports = DependencyTree;
