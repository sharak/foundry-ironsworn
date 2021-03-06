import {IRONSWORN} from "./config.js";

export class IronswornDice {
    constructor(actor, formula) {
        this.formula = formula;
        this.actor = actor
        this.data = actor.data?.data;
        this.ignoreMomentum = false;
        this._roll = new Roll(formula, this.data);
    }

    static progressRoll(actor, actionValue) {
        const roll = new IronswornDice(actor, `{1d10,1d10}`);
        roll.actionValue = actionValue;
        roll.ignoreMomentum = true;
        return roll;
    }

    static moveRoll(actor, bonusExpr) {
        return new IronswornDice(actor, `{1d6+${bonusExpr},1d10,1d10}`)
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

    get isNegativeMomentumEffect() {
        return !this.ignoreMomentum && this.actor.momentum < 0 && this.actionDie.terms[0].total === Math.abs(this.actor.momentum);
    }

    get hit() {
        let actionValue = this.actionValue || this.actionDie.total;
        if (this.isNegativeMomentumEffect) {
            const diceResult = this.actionDie.terms[0].results[0].result;
            actionValue -= diceResult;
        }
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
            d.total === maxRoll ? 'max' : null,
            (maxRoll === 6 && this.isNegativeMomentumEffect) ? 'strike' : null,
        ].filter(x => x).join(' ')
        return {
            cls: classes,
            total: (maxRoll === 6 && this.isNegativeMomentumEffect) ? `${roll.total - d.total} !!` : roll.total,
            die: d.total,
            text: roll.terms.slice(1).join('')
        }

    }

    async roll(messageData = {}) {
        if (!this._roll._rolled) {
            this._roll.roll();
        }
        const template = 'systems/ironsworn/templates/chat/roll.hbs'
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
                    actorId: actor._id,
                    itemId: item._id,
                    action: 'recommit-vow'
                }
                const giveUpButton = {
                    title: game.i18n.localize('IRONSWORN.VOW.GiveUp'),
                    actorId: actor._id,
                    itemId: item._id,
                    action: 'giveup-vow'
                }
                buttons.push(recommitButton, giveUpButton);
                break
            case "IRONSWORN.Oportunity":
            case "IRONSWORN.StrongHit":
                const experienceSHButton = await this._markExperience(actor, item.data.data.level);
                if (experienceSHButton) {
                    buttons.push(experienceSHButton);
                }
                buttons.push(this.fulfillButton(actor, item))
                break;
            case "IRONSWORN.WeakHit":
                const experienceButton = await this._markExperience(actor, item.data.data.level, -1);
                if (experienceButton) {
                    buttons.push(experienceButton);
                }
                buttons.push(this.fulfillButton(actor, item))
                break;
        }

        this.roll({
            buttons
        })
    }

    async _markExperience(actor, level, mod = 0) {
        const difficulty = IRONSWORN.difficulties[level];
        const experience = IRONSWORN.experience[difficulty] + mod;
        if (game.settings.get('ironsworn', 'autoMarkExperience')) {
            await actor.markExperience(experience);
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

    fulfillButton(actor, item) {
        return {
            title: game.i18n.localize('IRONSWORN.VOW.Complete'),
            actorId: actor._id,
            itemId: item._id,
            action: 'fulfill'
        }
    }


}
