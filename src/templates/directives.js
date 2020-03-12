import { directive, html } from "lit-html";
import { __ } from '@converse/headless/i18n';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import tpl_avatar from "templates/avatar.svg";
import URI from "urijs";


const i18n_retract_message = __('Retract this message');
const tpl_retract = html`
    <button class="chat-msg__action chat-msg__action-retract" title="${i18n_retract_message}">
        <fa-icon class="fas fa-trash-alt" path-prefix="/node_modules" color="var(--text-color-lighten-15-percent)" size="1em"></fa-icon>
    </button>
`;


export const renderRetractionLink = directive(o => async part => {
    const is_groupchat_message = o.model.get('type') === 'groupchat';
    const is_own_message = o.model.get('sender') === 'me';
    const may_moderate_message = !is_own_message &&
        is_groupchat_message &&
        await o.model.collection.chatbox.canRetractMessages();

    const may_retract_own_message = is_own_message && ['all', 'own'].includes(o._converse.allow_message_retraction);
    const retractable = !o.is_retracted && (may_moderate_message || may_retract_own_message);
    if (retractable) {
        part.setValue(tpl_retract);
    } else {
        part.setValue('');
    }
    part.commit();
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
