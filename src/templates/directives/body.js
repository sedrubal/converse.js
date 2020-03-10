import { directive, html } from "lit-html";
import { __ } from '@converse/headless/i18n';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { isString } from "lodash";
import converse from  "@converse/headless/converse-core";
import tpl_avatar from "templates/avatar.svg";
import URI from "urijs";
import xss from "xss/dist/xss";


const u = converse.env.utils;


function onTagFoundDuringXSSFilter (tag, html, options) {
    /* This function gets called by the XSS library whenever it finds
     * what it thinks is a new HTML tag.
     *
     * It thinks that something like <https://example.com> is an HTML
     * tag and then escapes the <> chars.
     *
     * We want to avoid this, because it prevents these URLs from being
     * shown properly (whithout the trailing &gt;).
     *
     * The URI lib correctly trims a trailing >, but not a trailing &gt;
     */
    if (options.isClosing) {
        // Closing tags don't match our use-case
        return;
    }
    const uri = new URI(tag);
    const protocol = uri.protocol().toLowerCase();
    if (!["https", "http", "xmpp", "ftp"].includes(protocol)) {
        // Not a URL, the tag will get filtered as usual
        return;
    }
    if (uri.equals(tag) && `<${tag}>` === html.toLocaleLowerCase()) {
        // We have something like <https://example.com>, and don't want
        // to filter it.
        return html;
    }
}


class Markup extends String {

    constructor (data) {
        super();
        this.markup = data.markup;
        this.text = data.text;
    }

    get length () {
        return this.text.length;
    }

    toString () {
        return "" + this.text;
    }

    textOf () {
        return this.toString();
    }
}


const tpl_mention_with_nick = (o) => html`<span class="mention mention--self badge badge-info">${o.mention}</span>`;
const tpl_mention = (o) => html`<span class="mention">${mention}</span>`;


function addMentionsMarkup (text, references, chatbox) {
    if (chatbox.get('message_type') !== 'groupchat') {
        return [text];
    }
    const nick = chatbox.get('nick');
    let list = [];
    references
        .sort((a, b) => b.begin - a.begin)
        .forEach(ref => {
            const mention = text.slice(ref.begin, ref.end)
            chatbox;
            if (mention === nick) {
                list = [text.slice(0, ref.begin), new Markup(mention, tpl_mention_with_nick({mention})), text.slice(ref.end),  ...list];
            } else {
                list = [text.slice(0, ref.begin), new Markup(mention, tpl_mention({mention})), text.slice(ref.end), ...list];
            }
            text = text.slice(0, ref.begin);
        });
    return list;
};


export const renderBodyText = directive(component => async part => {
    const model = component.model;
    const _converse = component._converse;

    let text = model.getMessageText();
    /**
     * Synchronous event which provides a hook for transforming a chat message's body text
     * before the default transformations have been applied.
     * @event _converse#beforeMessageBodyTransformed
     * @param { _converse.Message } model - The model representing the message
     * @param { string } text - The message text
     * @example _converse.api.listen.on('beforeMessageBodyTransformed', (view, text) => { ... });
     */
    await _converse.api.trigger('beforeMessageBodyTransformed', model, text, {'Synchronous': true});

    text = xss.filterXSS(text, {'whiteList': {}, 'onTag': onTagFoundDuringXSSFilter});
    text = u.isMeCommand(text) ? text.substring(4) : text;
    text = u.geoUriToHttp(text, _converse.geouri_replacement);

    function process (text) {
        // FIXME: need to handle img emojis
        text = u.addEmoji(text);
        return u.addMentionsMarkup(text, model.get('references'), model.collection.chatbox);
    }

    const list = await Promise.all(await u.addHyperlinks(text)
        .then(list => list.reduce((acc, i) => isString(i) ? [...acc, ...process(i)] : [...acc, i]), [])
    );

    /**
     * Synchronous event which provides a hook for transforming a chat message's body text
     * after the default transformations have been applied.
     * @event _converse#afterMessageBodyTransformed
     * @param { _converse.Message } model - The model representing the message
     * @param { string } text - The message text
     * @example _converse.api.listen.on('afterMessageBodyTransformed', (view, text) => { ... });
     */
    await _converse.api.trigger('afterMessageBodyTransformed', model, text, {'Synchronous': true});

    part.setValue(html`${list}`);
    part.commit();
    model.collection && model.collection.trigger('rendered', model);
    component.registerClickHandlers();
});


export const renderAvatar = directive(o => part => {
    if (o.type === 'headline' || o.is_me_message) {
        part.setValue('');
        return;
    }

    if (o.model.vcard) {
        const data = {
            'classes': 'avatar chat-msg__avatar',
            'width': 36,
            'height': 36,
        }
        const image_type = o.model.vcard.get('image_type');
        const image = o.model.vcard.get('image');
        data['image'] = "data:" + image_type + ";base64," + image;

        // TODO: XSS
        part.setValue(html`${unsafeHTML(tpl_avatar(data))}`);
    }
});
