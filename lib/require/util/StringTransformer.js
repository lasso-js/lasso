function StringTransformer() {
    this.modifications = [];
}

StringTransformer.prototype = {
    transform: function(str) {
        if (this.modifications.length === 0) {
            return str;
        }
        
        this.modifications.sort(function(a, b) {
            var compare = b.index - a.index;
            if (compare === 0) {
                return a.precedence - b.precedence;
            } else {
                return compare;
            }
        });

        for (var i=0,len=this.modifications.length; i<len; i++) {
            str = this.modifications[i].transform(str);
        }

        return str;
    },

    insert: function(index, newStr) {
        this.modifications.push({
            index: index,
            precedence: 3,
            toString: function() {
                return 'insert ' + index + ' --> ' + newStr;
            },
            transform: function(str) {
                return str.substring(0, index) + newStr + str.substring(index);
            }
        });
    },

    replace: function(range, replacement) {
        this.modifications.push({
            index: range[0],
            precedence: 2,
            toString: function() {
                return 'replace ' + range + ' --> ' + replacement;
            },
            transform: function(str) {
                return str.substring(0, range[0]) + replacement + str.substring(range[1]);
            }
        });
    },

    comment: function(range) {
        this.modifications.push({
            index: range[0],
            precedence: 1,
            toString: function() {
                return 'comment ' + range;
            },
            transform: function(str) {
                var code = str.substring(range[0], range[1]);
                return str.substring(0, range[0]) + '/*' + code + '*/' + str.substring(range[1]);
            }
        });
    }
};

module.exports = StringTransformer;