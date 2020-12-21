import {IRONSWORN} from "./config.js";

export class IronswornDice {
    constructor(data, formula) {
        this.formula = formula;
        this.data = data;
        this._roll = new Roll(formula, data);
    }

    static progressRoll(data, actionValue) {
        const roll = new IronswornDice(data, `{1d10,1d10}`);
        roll.actionValue = actionValue
        return roll
    }

    static moveRoll(data, bonusExpr) {
        return new IronswornDice(data, `{1d6+${bonusExpr},1d10,1d10}`)
    }

    set flavor(flavor) {
        this._flavor = flavor
    }

    get flavor() {
        if (this._flavor) return this._flavor;
        let flavor = '';
        if (this.actionValue) flavor = game.i18n.localize('IRONSWORN.ProgressRoll');
        else flavor = game.i18n.localize('IRONSWORN.MoveRoll');

        return flavor;
    }

    get actionDie() {
        return this._roll.terms[0].rolls.find(r => r.dice[0].faces === 6);
    }

    get challengeDice() {
        return this._roll.terms[0].rolls.filter(r => r.dice[0].faces === 10);
    }

    get hit() {
        const actionValue = this.actionValue || this.actionDie.total;
        const [challenge1, challenge2] = this.challengeDice.map(x => x.total);
        const match = challenge1 === challenge2;
        if (actionValue <= Math.min(challenge1, challenge2)) {
            if (match) return {cls: 'complication', type: 'IRONSWORN.Complication'}
            return {cls: 'miss', type: 'IRONSWORN.Miss'}
        }
        if (actionValue > Math.max(challenge1, challenge2)) {
            if (match) return {cls: 'oportunity', type: 'IRONSWORN.Oportunity'};
            return {cls: 'strong-hit', type: 'IRONSWORN.StrongHit'};
        }
        return {cls: 'weak-hit', type: 'IRONSWORN.WeakHit'};
    }

    format(roll) {
        if (!roll) return false;
        const d = roll.dice[0]
        const maxRoll = d.faces
        const classes = [
            d.constructor.name.toLowerCase(),
            'd' + d.faces,
            d.total === 1 ? 'min' : null,
            d.total === maxRoll ? 'max' : null
        ].filter(x => x).join(' ')
        return {
            cls: classes,
            total: roll.total,
            die: d.total,
            text: roll.terms.slice(1).join('')
        }

    }

    async roll(messageData = {}) {
        if (!this._roll._rolled) {
            this._roll.roll();
        }
        const template = 'systems/foundry-ironsworn/templates/chat/roll.hbs'
        const data = mergeObject({
            actionValue: this.actionValue,
            actionDie: this.format(this.actionDie),
            challengeDice: this.challengeDice.map(d => this.format(d)),
            hit: this.hit
        }, messageData);
        const html = await renderTemplate(template, data)
        this._roll.toMessage({
            flavor: this.flavor,
            content: html
        });
    }

    fulfill(actor, item) {
        switch (item.type) {
            case 'vow':
                this._fulfillVow(actor, item);
                break
        }
    }

    async _fulfillVow(actor, item) {
        this._roll.roll();
        const buttons = [];
        switch (this.hit.type) {
            case "IRONSWORN.Complication":
            case "IRONSWORN.Miss":
                const recommitButton = {
                    title: game.i18n.localize('IRONSWORN.VOW.Recommit'),
                    itemId: item._id,
                    action: 'recommit-vow'
                }
                const giveUpButton = {
                    title: game.i18n.localize('IRONSWORN.VOW.GiveUp'),
                    itemId: item._id,
                    action: 'giveup-vow'
                }
                buttons.push(recommitButton, giveUpButton);
                break
            case "IRONSWORN.Oportunity":
            case "IRONSWORN.StrongHit":
                const diffSH = IRONSWORN.difficulties[item.data.data.level];
                let experienceSH = IRONSWORN.experience[diffSH];
                const experienceSHButton = await this._markExperience(actor, experienceSH);
                if (experienceSHButton) {
                    buttons.push(experienceSHButton);
                }
                break;
            case "IRONSWORN.WeakHit":
                const difficulty = IRONSWORN.difficulties[item.data.data.level];
                let experience = IRONSWORN.experience[difficulty] - 1;
                const experienceButton = await this._markExperience(actor, experience);
                if (experienceButton) {
                    buttons.push(experienceButton);
                }
                break;
        }

        this.roll({
            buttons
        })
    }

    async _markExperience(actor, experience) {
        if (game.settings.get('foundry-ironsworn', 'autoMarkExperience')) {
            const currentExperience = parseInt(actor.data.experience);
            await actor.update({"data.experience": currentExperience + experience});
            return false;
        } else {
            return {
                title: game.i18n.localize('IRONSWORN.MarkExperience'),
                actorId: actor._id,
                experience: experience,
                action: 'mark-experience'
            }
        }
    }
}
