'use strict';
function OptimizerResourceNode(props) {
    OptimizerResourceNode.$super.call(this, 'lasso-resource');
    if (props) {
        this.setProperties(props);
    }
}

OptimizerResourceNode.nodeType = 'element';

OptimizerResourceNode.prototype = {
    doGenerateCode: function (template) {
        // This is a dummy instance that will get removed by the transform
        throw new Error('Node should not be in tree after transform');
    }
};

module.exports = OptimizerResourceNode;