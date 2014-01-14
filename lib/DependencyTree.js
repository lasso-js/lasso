function Node(dependency) {
    this.dependency = dependency;
    this.children = [];
}

function DependencyTree() {
    this._root = new Node();
    this._nodes = {};
}

DependencyTree.prototype = {
    add: function(dependency, parentDependency) {
        var parentNode = parentDependency ?
            this._nodes[parentDependency.getKey()] :
            this._root;

        if (!parentNode) {
            throw new Error('parentNode node not found: ' + parentDependency.getKey());
        }

        var node = new Node(dependency);

        parentNode.children.push(node);
        this._nodes[dependency.getKey()] = node;
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

        toStringHelper(this._root, "  ");

        return lines.join('\n');
        
    }
};

module.exports = DependencyTree;