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
        default:
            return null;
    }
}
