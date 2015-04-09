'use strict';
function ResourceTag(props) {
    ResourceTag.$super.call(this, 'lasso-resource');
    if (props) {
        this.setProperties(props);
    }
}

ResourceTag.nodeType = 'element';

ResourceTag.prototype = {
    doGenerateCode: function (template) {
        // This is a dummy instance that will get removed by the transform
        throw new Error('Node should not be in tree after transform');
    }
};

module.exports = ResourceTag;