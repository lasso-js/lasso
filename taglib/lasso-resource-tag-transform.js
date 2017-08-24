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
    let builder = context.builder;

    let resourcesRootNode;

    if (el.childCount === 0) {
        resourcesRootNode = context.data.lassoResourcesNode;

        if (!resourcesRootNode) {
            resourcesRootNode = context.data.lassoResourcesNode = builder.containerNode(function lassoResourcesCodeGenerator() {
                let resources = resourcesRootNode.data.resources;
                let resourcesCustomTag = context.createNodeForEl({
                    tagName: '_lasso-resources-root',
                    body: resourcesRootNode.body
                });

                let paths = [];

                resources.forEach((resource) => {
                    paths.push(resource.path);
                    resourcesCustomTag.addNestedVariable(resource.varName);
                });

                resourcesCustomTag.setAttributeValue('paths', builder.literal(paths));

                return resourcesCustomTag;
            });

            context.root.moveChildrenTo(resourcesRootNode);
            context.root.appendChild(resourcesRootNode);
        }
    } else {
        resourcesRootNode = builder.containerNode(function lassoResourcesCodeGenerator() {
            let resources = resourcesRootNode.data.resources;
            let resourcesCustomTag = context.createNodeForEl({
                tagName: '_lasso-resources-root',
                body: resourcesRootNode.body
            });

            let paths = [];

            resources.forEach((resource) => {
                paths.push(resource.path);
                resourcesCustomTag.addNestedVariable(resource.varName);
            });

            resourcesCustomTag.setAttributeValue('paths', builder.literal(paths));

            return resourcesCustomTag;
        });

        el.replaceWith(resourcesRootNode);
        el.moveChildrenTo(resourcesRootNode);
    }

    if (!resourcesRootNode.data.resources) {
        resourcesRootNode.data.resources = [];
    }

    let resources = resourcesRootNode.data.resources;

    let varName = el.getAttributeValue('var');
    if (varName.type === 'Literal' && typeof varName.value === 'string') {
        varName = varName.value;
    } else {
        context.addError(el, 'Invalid "var". String literal expected');
        return;
    }

    let pathExpression = el.getAttributeValue('path');

    pathExpression = context.resolvePath(pathExpression);

    resources.push({
        varName: varName,
        path: pathExpression
    });

    el.detach();
};
