/*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var getImageInfoHelperPath = require.resolve('./helper-getImageInfo');

function GetImageInfo(props) {
    GetImageInfo.$super.call(this);
    if (props) {
        this.setProperties(props);
    }
}
GetImageInfo.prototype = {
    doGenerateCode: function (template) {
        var varName = this.getProperty('var');

        var getImageInfoRequirePath = template.getRequirePath(getImageInfoHelperPath);

        template.addStaticVar('__getImageInfo',

            'require("' + getImageInfoRequirePath + '")');

        var path = this.getProperty('path');

        var funcCall = '__getImageInfo(out, ' + path + ', function(out, ' + varName + ') {';
        template.statement(funcCall).indent(function() {
            this.generateCodeForChildren(template);
        }, this).line('});');
    }
};

module.exports = GetImageInfo;
