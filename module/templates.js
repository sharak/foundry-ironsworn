export const preloadTemplates = async function() {
    const templates = [
        'systems/ironsworn/templates/actor/parts/assets.hbs',
        'systems/ironsworn/templates/actor/parts/main-stats.hbs',
        'systems/ironsworn/templates/actor/parts/moves.hbs',
        'systems/ironsworn/templates/actor/parts/oracles.hbs',
        'systems/ironsworn/templates/actor/parts/debilities.hbs',
        'systems/ironsworn/templates/actor/parts/progress-track.hbs',
        'systems/ironsworn/templates/actor/parts/progress-block.hbs',
        'systems/ironsworn/templates/actor/parts/stacked-stat.hbs',
    ];

    return loadTemplates(templates);
}
