export const preloadTemplates = async function() {
    const templates = [
        'systems/foundry-ironsworn/templates/actor/parts/assets.hbs',
        'systems/foundry-ironsworn/templates/actor/parts/main-stats.hbs',
        'systems/foundry-ironsworn/templates/actor/parts/summary.hbs',
        'systems/foundry-ironsworn/templates/actor/parts/moves.hbs',
        'systems/foundry-ironsworn/templates/actor/parts/oracles.hbs',
    ];

    return loadTemplates(templates);
}
