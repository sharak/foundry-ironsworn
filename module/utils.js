export function getAttributeNames(attr) {
    const attrKey = attr.toLowerCase();

    switch (attrKey) {
        case 'heart':
            return game.i18n.localize('STAT.Heart');
        case 'edge':
            return game.i18n.localize('STAT.Edge');
        case 'iron':
            return game.i18n.localize('STAT.Iron');
        case 'shadow':
            return game.i18n.localize('STAT.Shadow');
        case 'wits':
            return game.i18n.localize('STAT.Wits');
        case 'health':
            return game.i18n.localize('STAT.Health');
        case 'spirit':
            return game.i18n.localize('STAT.Spirit');
        case 'supply':
            return game.i18n.localize('STAT.Supply');
        default:
            return null;
    }
}

export function getDifficultyNames(level) {
    switch (parseInt(level)) {
        case 1:
            return game.i18n.localize('DIFFICULTY.Epic');
        case 2:
            return game.i18n.localize('DIFFICULTY.Extreme');
        case 4:
            return game.i18n.localize('DIFFICULTY.Formidable');
        case 8:
            return game.i18n.localize('DIFFICULTY.Dangerous');
        case 12:
            return game.i18n.localize('DIFFICULTY.Troublesome');

    }
}
