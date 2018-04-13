class LassoPrebuild {
    constructor ({ name, slots, assets, flags }) {
        this.slots = slots;
        this.assets = assets;
        this.name = name;
        this.flags = flags;
    }
}

module.exports = LassoPrebuild;
