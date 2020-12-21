import {IRONSWORN} from "./config.js";

export class IronswornChat {
    static chatListeners(app, html) {
        html.on('click', '.card-buttons button', IronswornChat._onChatCardAction.bind(this));
    }

    static async _onChatCardAction(event) {
        event.stopPropagation();
        const button = event.currentTarget;
        const action = button.dataset.action;
        const card = button.closest('.chat-card');

        const actor = game.actors.get(button.dataset.actorid);
        let item, level;
        switch (action) {
            case "mark-experience":
                const experience = button.dataset.experience;
                await actor.markExperience(experience);
                button.remove();
                break;
            case "fulfill":
                item = actor.items.get(button.dataset.itemid);
                await item.fulfill();
                button.remove();
                break;
            case "recommit-vow":
                item = actor.items.get(button.dataset.itemid);
                level = IRONSWORN.difficulties[item.data.data.level];
                const nextLevel = IRONSWORN.nextLevel[level];
                item.update({
                    'data.level': parseInt(nextLevel),
                    'data.current': 4
                });
                card.querySelector('.card-buttons').remove();
                break;
            case "giveup-vow":
                item = actor.items.get(button.dataset.itemid);
                level = IRONSWORN.difficulties[item.data.data.level];
                const spiritLoss = parseInt(IRONSWORN.experience[level]);
                const newSpirit = parseInt(actor.data.data.spirit) - spiritLoss;
                await actor.update({
                    "data.spirit": Math.max(0, newSpirit)
                });
                item.remove();
                card.querySelector('.card-buttons').remove();
                break;
        }
        await IronswornChat.updateChatCard(card);
    }
    static async updateChatCard(card, messageId) {
        const message_id = messageId == null ? card.closest('.message').dataset.messageId : messageId;
        let message = game.messages.get(message_id);

        const updatedMessage = await message.update({content: card.outerHTML});
        await ui.chat.updateMessage(updatedMessage, false);
        return updatedMessage;

    }
}
