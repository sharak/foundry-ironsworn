import {ironswornRollDialog} from "./ironsworn.js";
import {getAttributeNames} from "./utils.js";

export class IronswornParser {
    static ParseSheetContent(app, html, data) {
        for (const element of html.find('div.editor-content > *, p')) {
            element.outerHTML = IronswornParser.EnrichHTML(element.outerHTML, data.title);
        }

        html.find('a.inline-roll').on('click', event => {
            event.stopPropagation();
            const options = event.currentTarget.dataset;
            const speaker = ChatMessage.getSpeaker();
            const actor = ChatMessage.getSpeakerActor(speaker);
            if (actor) {
                ironswornRollDialog(actor.data?.data, options.attr, actor.data?.data.options.title)
            }

        });
        return;
    }

    static EnrichHTML(content, title) {
        const html = document.createElement('div');
        html.innerHTML = String(content);

        let text = [];

        text = TextEditor._getTextNodes(html);

        const regex = new RegExp(/@(ironsworn)\.(.*?)\[([^\]]+)\](?:{([^}]+)})?/, 'gi');
        TextEditor._replaceTextContent(text, regex, (match, tag, type, options, name) =>
            IronswornParser.createLink(type, options, name, title));

        return html.innerHTML;
    }

    static createLink(type, options, name, title) {
        const data = {
            cls: ['inline-roll'],
            dataset: {},
            icon: 'fas fa-dice',
            name
        }

        const regex = new RegExp(/[^,]+/, 'gi');
        const matches = options.matchAll(regex);
        for (let match of Array.from(matches)) {
            let [key, value] = match[0].split(':');
            data.dataset[key] = value;
        }
        if (!data.dataset.hasOwnProperty('title')) {
            data.dataset.title = title;
        }

        let linktext;
        switch (type.toLowerCase()) {
            case 'moveroll':
                linktext = `${data.dataset.title} (+${getAttributeNames(data.dataset.attr)})`;
                break;
            default:
                break;
        }

        if (!name) {
            data.name = linktext
        }

        const a = document.createElement('a');
        a.title = linktext;
        a.classList.add(...data.cls);
        for (let [k, v] of Object.entries(data.dataset)) {
            a.dataset[k] = v;
        }

        a.innerHTML = `<i data-link-icon="${data.icon}" class="link-icon ${data.icon}"></i> ${data.name}`;

        return a;
    }
}
