/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import {IronswornActor} from './actors/actor.js'
import {IronswornItemSheet} from './items/item-sheet.js'
import {IronswornActorSheet} from './actors/actor-sheet.js'
import {IronswornParser} from "./parser.js";
import {getAttributeNames, getDifficultyNames} from "./utils.js";
import {preloadTemplates} from "./templates.js";
import {IronswornDice} from "./roll.js";
import {IronswornChat} from "./chat.js";
import {IronswornItem} from "./items/item.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once('init', async function () {
    console.log(`Initializing Ironsworn System`)

    // Define custom Entity classes
    CONFIG.Actor.entityClass = IronswornActor
    CONFIG.Item.entityClass = IronswornItem
    // CONFIG.RollTable.resultTemplate =
    //   'systems/ironsworn/templates/chat/table-draw.hbs'

    // Register sheet application classes
    Actors.unregisterSheet('core', ActorSheet)
    Actors.registerSheet('ironsworn', IronswornActorSheet, {makeDefault: true})
    Items.unregisterSheet('core', ItemSheet)
    Items.registerSheet('ironsworn', IronswornItemSheet, {makeDefault: true})

    // Register system settings
    game.settings.register('ironsworn', 'macroShorthand', {
        name: 'SETTINGS.SimpleMacroShorthandN',
        hint: 'SETTINGS.SimpleMacroShorthandL',
        scope: 'world',
        type: Boolean,
        default: true
    })

    game.settings.register('ironsworn', 'autoMarkExperience', {
        name: 'SETTINGS.AutoExperience',
        hint: 'SETTINGS.AutoExperienceHint',
        config: true,
        scope: 'client',
        type: Boolean,
        default: false
    });

    await preloadTemplates();
})

Hooks.once('setup', () => {
    Roll.prototype.render = async function (chatOptions = {}) {
        chatOptions = mergeObject(
            {
                user: game.user._id,
                flavor: null,
                template: CONFIG.Dice.template,
                blind: false
            },
            chatOptions
        )
        const isPrivate = chatOptions.isPrivate
        // Execute the roll, if needed
        if (!this._rolled) this.roll()
        // Define chat data
        const chatData = {
            formula: isPrivate ? '???' : this.formula,
            roll: this, // this is new
            flavor: isPrivate ? null : chatOptions.flavor,
            user: chatOptions.user,
            tooltip: isPrivate ? '' : await this.getTooltip(),
            total: isPrivate ? '?' : Math.round(this.total * 100) / 100
        }
        // Render the roll display template
        return renderTemplate(chatOptions.template, chatData)
    }
})

// Autofucus on input box when rolling
Hooks.on('renderIronswornRollDialog', async (dialog, html, data) => {
    html.find('input').focus()
})

Hooks.on('renderItemSheet', IronswornParser.ParseSheetContent);
Hooks.on('renderChatLog', (app, html, data) => IronswornChat.chatListeners(app, html, data));

Handlebars.registerHelper('join', function (a, joiner) {
    return a.join(joiner)
})

Handlebars.registerHelper('json', function (context) {
    return JSON.stringify(context, null, 2)
})

Handlebars.registerHelper('ifIsIronswornRoll', function (options) {
    if (
        this.roll.dice.length === 3 &&
        this.roll.dice.filter(x => x.faces === 6).length === 1 &&
        this.roll.dice.filter(x => x.faces === 10).length === 2
    ) {
        return options.fn(this)
    } else {
        return options.inverse(this)
    }
})
Handlebars.registerHelper('localizeDifficulty', function (value) {
    return getDifficultyNames(value);
})

class IronswornRollDialog extends Dialog {
}

export async function ironswornRollDialog(data, stat, title) {
    const template = 'systems/ironsworn/templates/roll-dialog.hbs'
    const templateData = {data, stat: getAttributeNames(stat)}
    const html = await renderTemplate(template, templateData)
    let d = new IronswornRollDialog({
        title: title || `${game.i18n.localize('IRONSWORN.Roll')} +${getAttributeNames(stat)}`,
        content: html,
        buttons: {
            roll: {
                icon: '<i class="fas fa-dice"></i>',
                label: game.i18n.localize('IRONSWORN.Roll'),
                callback: x => {
                    const form = x[0].querySelector('form')
                    const bonus = parseInt(form[0].value, 10)
                    const roll = IronswornDice.moveRoll(data,`@${stat}+${bonus || 0}`)
                    roll.flavor = title;
                    roll.roll();

                }
            }
        },
        default: 'roll'
    })
    d.render(true)
}

Handlebars.registerHelper('rangeProgress', function (context, options) {
    const results = []
    let marks = context.hash.marks;
    for (let value = context.hash.from; value <= context.hash.to; value++) {
      let cls;
      if (marks >= 4) {
        cls = "mark-4"
      } else if (marks <= 0) {
        cls = "";
      } else {
        cls = "mark-" + Math.abs(marks)
      }
      marks -= 4;
      results.push(
          context.fn({
            ...this,
            cls
          })
      )
    }
    return results.join("\n");
});

Handlebars.registerHelper('rangeEach', function (context, options) {
    const results = []
    for (let value = context.hash.from; value >= context.hash.to; value--) {
        const valueStr = value > 0 ? `+${value}` : value.toString()
        const isCurrent = value === context.hash.current
        results.push(
            context.fn({
                ...this,
                valueStr,
                value,
                isCurrent
            })
        )
    }
    return results.join('\n')
})

Handlebars.registerHelper('capitalize', txt => {
    const [first, ...rest] = txt
    return `${first.toUpperCase()}${rest.join('')}`
})
