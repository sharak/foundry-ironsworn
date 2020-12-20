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
            if (match) return game.i18n.localize('IRONSWORN.Complication')
            return game.i18n.localize('IRONSWORN.Miss')
        }
        if (actionValue > Math.max(challenge1, challenge2)) {
            if (match) return game.i18n.localize('IRONSWORN.Oportunity');
            return game.i18n.localize('IRONSWORN.StrongHit');
        }
        return game.i18n.localize('IRONSWORN.WeakHit');
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

    async roll() {
        this._roll.roll();
        const template = 'systems/foundry-ironsworn/templates/chat/roll.hbs'
        const messageData = {
            actionValue: this.actionValue,
            actionDie: this.format(this.actionDie),
            challengeDice: this.challengeDice.map(d => this.format(d)),
            hit: this.hit
        }
        const html = await renderTemplate(template, messageData)
        this._roll.toMessage({
            flavor: this.flavor,
            content: html
        });
    }
}
