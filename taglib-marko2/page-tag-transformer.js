
module.exports = function transform(node, compiler, template) {
    function convertDependencyTags(parent) {
        parent.forEachChild(function(child) {
            if (child.isElementNode() && !child.uri) {
                // Convert unnamespaced element nodes to "DependencyTag" nodes

                child.tag = compiler.taglibs.getTag('lasso-dependency');

                if (child.localName !== 'dependency') {
                    child.setProperty('type', child.localName);
                }

                child.forEachAttributeNS('', function(attr) {
                    var value = attr.value;
                    if (value === 'true') {
                        value = true;
                    }
                    else if (value === 'false') {
                        value = false;
                    }
                    else {
                        value = compiler.convertType(value, 'string', true /* allow expressins */);
                    }

                    child.setProperty(attr.localName, value);
                });

                child.removeAttributesNS('');
            }
            else {
                convertDependencyTags(child);
            }
        });
    }

    node.forEachChild(function(child) {
        if (!child.uri && (child.tagName === 'dependencies' || child.tagName === 'includes')) {
            child.tag = compiler.taglibs.getTag('lasso-dependencies');
            convertDependencyTags(child);
        }
    }, this);
};