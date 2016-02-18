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
'use strict';

module.exports = function transform(el, context) {
    // Get or create the root "_lasso-resources-root" node
    var builder = context.builder;
    var resourcesRootNode = context.data.lassoResourcesNode;

    if (!resourcesRootNode) {
        resourcesRootNode = context.data.lassoResourcesNode = builder.containerNode(function lassoResourcesCodeGenerator() {
            var resources = resourcesRootNode.data.resources;
            var resourcesCustomTag = context.createNodeForEl({
                tagName: '_lasso-resources-root',
                body: resourcesRootNode.body
            });

            var paths = [];

            resources.forEach((resource) => {
                paths.push(resource.path);
                resourcesCustomTag.addNestedVariable(resource.varName);
            });

            resourcesCustomTag.setAttributeValue('paths', builder.literal(paths));

            return resourcesCustomTag;
        });

        resourcesRootNode.data.resources = [];

        context.root.moveChildrenTo(resourcesRootNode);
        context.root.appendChild(resourcesRootNode);
    }

    var resources = resourcesRootNode.data.resources;

    var varName = el.getAttributeValue('var');
    if (varName.type === 'Literal' && typeof varName.value === 'string') {
        varName = varName.value;
    } else {
        context.addError(el, 'Invalid "var". String literal expected');
        return;
    }

    var pathExpression = el.getAttributeValue('path');

    pathExpression = context.resolvePath(pathExpression);

    resources.push({
        varName: varName,
        path: pathExpression
    });

    el.detach();
};