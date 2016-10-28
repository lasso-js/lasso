/**
* This method walks up the tree from the provided node to find the
* root "_lasso-resources-root" node. The root node is what asynchronously
* loads all of the bundles and asynchronously renders the body. If a
* root "_lasso-resources-root" node is not found then a new one is created
* and made to be a child of the true root. All of the child nodes
* of the actual root node are moved to children of the newly created
* node.
*
* @param node Node to search form
* @param compiler Used to create the node if it is not found.
*/
function findRootResourcesNode(node, compiler) {
    if (node.isRoot()) {
        if (node.data.lassoResourcesNode) { // Is a "_lasso-resources-root" already associated with the root node?
            // If so then use that node
            return node.data.lassoResourcesNode;
        } else {
            // Otherwise, create a new "_lasso-resources-root" node
            var rootResourcesNode =
                node.data.lassoResourcesNode =
                compiler.createTagHandlerNode('_lasso-resources-root');

            // *Move* all of the existing children of the root node to this node
            // NOTE: A node can only have one parent so an appendChild will move the node to the new parent
            node.forEachChild(function (childNode) {
                // Make the node that used to be a child of the root node, a child of the 'lasso-resources' node
                rootResourcesNode.appendChild(childNode);
            });

            // Now make the new "_lasso-resources" node the only child of the root node
            node.appendChild(rootResourcesNode);

            // Keep up with each bundles need to be loaded in order to render the template
            var pathExpressionArray = [];
            var pathsExpression = function () { // This function will be called at code generation time
                // to produce the expression for the "paths" property
                // Convert the used bundle names to an Array expression
                return compiler.makeExpression('[' + pathExpressionArray.join(', ') + ']');
            };

            rootResourcesNode.setProperty('paths', pathsExpression);

            // Add a helper method to the data object that can be used to add additional bundle
            // dependencies to the root use node
            rootResourcesNode.data.addPath = function addPath(varName, pathExpression) {
                // We will introduced variables by adding parameters to the compiled function that
                // is used to render the body.
                rootResourcesNode.addNestedVariable(varName);

                // Keep track of all of the expressions that are used to refer to bundles
                pathExpressionArray.push(pathExpression.toString());
            };

            // Return the newly created "_lasso-resources-root" node
            return rootResourcesNode;
        }
    } else {
        return findRootResourcesNode(node.parentNode, compiler);
    }
}

module.exports = function transform(node, compiler, builder) {

    // Get or create the root "_lasso-resources-root" node
    var rootResourcesNode = findRootResourcesNode(node, compiler);

    if (node.tagName === 'lasso-resource') {
        var varName = node.getAttribute('var');
        var bundleName = node.getProperty('path');

        // NOTE: bundleName is actually a JavaScript expression represented as a String
        rootResourcesNode.data.addPath(varName, bundleName);

        // Remove this node out of the tree since it is no longer needed
        node.parentNode.removeChild(node);
    }
};