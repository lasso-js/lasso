class DeduperContext {
    constructor() {
        this.lookups = {
            def: {},
            run: {},
            installed: {},
            main: {},
            remap: {},
            require: {},
            builtin: {},
            searchPath: {}
        };
        this.runtimeInclude = false;
        this.readyIncluded = false;
        this.processIncluded = false;
    }
}

module.exports = DeduperContext;
