import {ironswornRollDialog} from '../ironsworn.js'
import {IronswornParser} from "../parser.js";
import {getAttributeNames} from "../utils.js";
import {IronswornDice} from "../roll.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class IronswornActorSheet extends ActorSheet {
    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['ironsworn', 'sheet', 'actor'],
            width: 800,
            height: 800,
            tabs: [
                {
                    navSelector: '.sheet-tabs',
                    contentSelector: '.sheet-main',
                    initial: 'summary'
                }
            ],
            dragDrop: [{dragSelector: '.item-list .item', dropSelector: null}]
        })
    }

    /** @override */
    get template() {
        const path = 'systems/foundry-ironsworn/templates/actor'
        return `${path}/${this.actor.data.type}.hbs`
    }

    /* -------------------------------------------- */

    /** @override */
    getData() {
        const data = super.getData()

        data.vows = data.items.filter(item => item.type === 'vow');

        let movesForDisplay = {}
        const moves = this.actor.items.filter(item => item.type === 'move');
        for (const move of moves) {
            const category = move.data.data.category || "default";
            if (!movesForDisplay.hasOwnProperty(category)) {
                movesForDisplay[category] = [];
            }
            movesForDisplay[category].push(move);
        }
        data.movesForDisplay = movesForDisplay;
        return data
    }

    /* -------------------------------------------- */

    /** @override */
    activateListeners(html) {
        super.activateListeners(html)

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return

        // Handle most clickables
        html.find('.clickable').click(this._rollStat.bind(this))

        html.find('#burn').click(this._burnMomentum.bind(this))

        // Enable editing stats
        html.find('#edit-stats').click(async ev => {
            if (this.actor.getFlag('foundry-ironsworn', 'editStats')) {
                await this.actor.unsetFlag('foundry-ironsworn', 'editStats')
            } else {
                await this.actor.setFlag('foundry-ironsworn', 'editStats', 'true')
            }
        })

        // Moves expand in place
        html.find('.move-entry').click(this._handleMoveExpand.bind(this))

        html.find('.mark-progress').click(ev => {
            const itemId = ev.currentTarget.dataset.id;
            const marks = parseInt(ev.currentTarget.dataset.marks);
            const item = this.actor.getOwnedItem(itemId);
            const currentMarks = item.data.data.current;
            item.update({'data.current': currentMarks+marks});
        })
        html.find('.fulfill-progress').click(ev => {
            const itemId = ev.currentTarget.dataset.id;
            const marks = parseInt(ev.currentTarget.dataset.marks);
            const item = this.actor.getOwnedItem(itemId);
            const actionValue = Math.floor(item.data.data.current / 4);
            const roll = IronswornDice.progressRoll(this.actor.data?.data, actionValue);
            roll.flavor = item.name;
            roll.roll();
        })
        html.find('.add-item').click(ev => {
            switch (ev.currentTarget.dataset.type) {
                case 'vow':
                    this.actor.createEmptyVow(ev);
                    break;
            }
        })

        // Update Inventory Item
        html.find('.item-edit').click(ev => {
            const li = $(ev.currentTarget).parents('.item')
            const item = this.actor.getOwnedItem(li.data('itemId'))
            item.sheet.render(true)
        })

        // Delete Inventory Item
        html.find('.item-delete').click(ev => {
            const li = $(ev.currentTarget).parents('.item')
            this.actor.deleteOwnedItem(li.data('itemId'))
            li.slideUp(200, () => this.render(false))
        })
    }

    async _handleMoveExpand(ev) {
        ev.preventDefault()
        const li = $(ev.currentTarget).parents('li')
        const item = this.actor.getOwnedItem(li.data('id'))

        if (li.hasClass('expanded')) {
            const summary = li.children('.move-summary')
            summary.slideUp(200, () => summary.remove())
        } else {
            const content = this._renderMove(item)
            const div = $(`<div class="move-summary">${content}</div>`)
            this._attachInlineRollListeners(div, item)
            li.append(div.hide())
            div.slideDown(200)
        }
        li.toggleClass('expanded')
    }

    _renderMove(move) {
        return IronswornParser.EnrichHTML(move.data.data.description, move.data.name)
    }

    _attachInlineRollListeners(html, item) {
        html.find('a.inline-roll').on('click', ev => {
            ev.stopPropagation();
            const el = ev.currentTarget
            const moveTitle = `${item.name} (+${getAttributeNames(el.dataset.attr)})`
            const actor = this.actor || {}
            return ironswornRollDialog(actor.data?.data, el.dataset.attr, moveTitle)
        })
    }

    async _rollStat(event) {
        event.preventDefault()
        const el = event.currentTarget

        const stat = el.dataset.stat;
        if (stat) {
            // Clicked a non-edit stat; trigger a roll
            ironswornRollDialog(this.actor.data.data, stat, `${game.i18n.localize('IRONSWORN.Roll')} +${getAttributeNames(stat)}`)
        }

        const resource = el.dataset.resource
        if (resource) {
            // Clicked a value in momentum/health/etc, set the value
            const newValue = parseInt(el.dataset.value)
            const {momentumMax} = this.actor.data.data
            if (newValue <= momentumMax) {
                await this.actor.update({data: {[resource]: newValue}})
            }
        }

        const tableName = el.dataset.table
        if (tableName) {
            // Clicked an oracle, roll from the table
            let table = game.tables.find(x => x.name === tableName)
            if (!table) {
                const pack = game.packs.get('foundry-ironsworn.ironsworntables')
                const index = await pack.getIndex()
                const entry = index.find(x => x.name == tableName)
                if (entry) table = await pack.getEntity(entry._id)
            }
            console.log({table})
            if (table) table.draw()
        }
    }

    async _rollDialog(key) {
        const move = MOVES[key]
        const html = await renderTemplate(
            'systems/foundry-ironsworn/templates/move-dialog.hbs',
            move
        )

        new Dialog({
            title: move.title,
            content: html,
            buttons: {
                roll: {
                    icon: '<i class="roll die d10"></i>',
                    label: 'Roll',
                    callback: function () {
                        console.log(this, 'Chose One')
                    }
                }
            }
        }).render(true)
    }

    async _burnMomentum(event) {
        event.preventDefault()

        const {momentum, momentumReset} = this.actor.data.data
        if (momentum > momentumReset) {
            await this.actor.update({
                _id: this.actor.id,
                data: {momentum: momentumReset}
            })
        }
    }
}

const MOVES = [
    '--- Fate',
    'Pay the Price',
    'Ask the Oracle',
    '--- Combat',
    'Enter the Fray',
    'Strike',
    'Clash',
    'Turn the Tide',
    'End the Fight',
    'Battle',
    '--- Adventure',
    'Face Danger',
    'Secure an Advantage',
    'Gather Information',
    'Heal',
    'Resupply',
    'Make Camp',
    'Undertake a Journey',
    'Reach Your Destination',
    '--- Relationship',
    'Compel',
    'Sojourn',
    'Draw the Circle',
    'Forge a Bond',
    'Test Your Bond',
    'Aid Your Ally',
    'Write Your Epilogue',
    '--- Quest',
    'Swear an Iron Vow',
    'Reach a Milestone',
    'Fulfill Your Vow',
    'Forsake Your Vow',
    'Advance',
    '--- Suffer',
    'Endure Harm',
    'Endure Stress',
    'Companion Endure Harm',
    'Face Death',
    'Face Desolation',
    'Out of Supply',
    'Face a Setback'
]