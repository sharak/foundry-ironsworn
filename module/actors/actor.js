/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class IronswornActor extends Actor {
    /** @override */
    getRollData() {
        const data = super.getRollData()
        const shorthand = game.settings.get('ironsworn', 'macroShorthand')

        // Re-map all attributes onto the base roll data
        // if (!!shorthand) {
        //   for (let [k, v] of Object.entries(data.attributes)) {
        //     if (!(k in data)) data[k] = v.value
        //   }
        //   delete data.attributes
        // }

        // Map all items data using their slugified names
        // data.items = this.data.items.reduce((obj, i) => {
        //   let key = i.name.slugify({ strict: true })
        //   let itemData = duplicate(i.data)
        //   if (!!shorthand) {
        //     for (let [k, v] of Object.entries(itemData.attributes)) {
        //       if (!(k in itemData)) itemData[k] = v.value
        //     }
        //     delete itemData['attributes']
        //   }
        //   obj[key] = itemData
        //   return obj
        // }, {})
        return data
    }

    /** @override */
    prepareDerivedData() {
        // Calculate momentum max/reset from debilities
        const numDebilitiesMarked = Object.values(this.data.data.debility).filter(
            x => x
        ).length
        this.data.data.momentumMax = 10 - numDebilitiesMarked
        this.data.data.momentumReset = Math.max(0, 2 - numDebilitiesMarked)
    }

    async addDefaultMoves() {
        const pack = game.packs.get('foundry-ironsworn.ironswornmoves')
        const packIndex = await pack.getIndex()
        for (const itemEntry of packIndex) {
            const item = await pack.getEntity(itemEntry._id)
            if (item.type === 'move') await this.createOwnedItem(item)
        }
    }

    async createEmptyVow(ev) {
        const data = {
            name: game.i18n.localize('IRONSWORN.NewVow'),
            type: "vow",
        }
        return await this.createOwnedItem(data, {renderSheet: true});
    }
}

Hooks.on('createActor', async actor => {
    if (actor.data.type === 'character') {
        await actor.addDefaultMoves()
    }
})