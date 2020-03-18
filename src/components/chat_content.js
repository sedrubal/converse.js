import { LitElement, html } from 'lit-element';
import { __ } from '@converse/headless/i18n';
import { repeat } from 'lit-html/directives/repeat.js';
import converse from "@converse/headless/converse-core";
import dayjs from 'dayjs';
import filesize from "filesize";
import tpl_file_progress from "../templates/file_progress.js";
import tpl_info from "../templates/info.js";
import tpl_new_day from "../templates//new_day.js";
import 'fa-icons';
import "../components/message";

const u = converse.env.utils;

const i18n_no_history = __('No message history available.');
const tpl_no_msgs = html`<div class="empty-history-feedback"><span>${i18n_no_history}</span></div>`


function renderChatMessage (_converse, model) {
    const text = model.getMessageText();
    const time = dayjs(model.get('time'));
    const role = model.vcard ? model.vcard.get('role') : null;
    const roles = role ? role.split(',') : [];
    const username = model.getDisplayName();
    const is_retracted = model.get('retracted') || model.get('moderated') === 'retracted';
    const is_groupchat = (model.get('type') === 'groupchat');
    const has_mentions = is_groupchat && model.collection.chatbox.isUserMentioned(model);
    return html`
        <converse-chat-message
            .model=${model}
            .roles=${roles}
            ._converse=${_converse}
            ?allow_message_retraction=${_converse.allow_message_retraction}
            ?correcting=${model.get('correcting')}
            ?editable=${model.get('editable')}
            ?has_mentions=${has_mentions}
            ?is_delayed=${model.get('is_delayed')}
            ?is_encrypted=${model.get('is_encrypted')}
            ?is_me_message=${u.isMeCommand(text)}
            ?is_only_emojis=${model.get('is_only_emojis')}
            ?is_retracted=${is_retracted}
            ?is_spoiler=${model.get('is_spoiler')}

            from=${model.get('from')}
            moderated_by=${model.get('moderated_by') || ''}
            moderation_reason=${model.get('moderation_reason') || ''}
            msgid=${model.get('msgid')}
            occupant_affiliation=${model.occupant ? model.occupant.get('affiliation') : ''}
            occupant_role=${model.occupant ? model.occupant.get('role') : ''}
            oob_url=${model.get('oob_url') || ''}
            pretty_time=${time.format(_converse.time_format)}
            pretty_type=${model.get('pretty_type')}
            received=${model.get('received')}
            sender=${model.get('sender')}
            spoiler_hint=${model.get('spoiler_hint') || ''}
            subject=${model.get('subject') || ''}
            time=${model.get('time')}
            message_type=${model.get('type')}
            username=${username}></converse-chat-message>
    `;
}

function renderDayIndicator (attrs) {
    return tpl_new_day(attrs);
}

function renderInfoMessage (model) {
    return tpl_info(Object.assign(model.toJSON(), {
        'extra_classes': 'chat-info',
        'onRetryClicked': () => {
            model.error.retry();
            model.destroy();
        },
        'isodate': dayjs(model.get('time')).toISOString()
    }));
}

function renderErrorMessage (model) {
    return tpl_info(Object.assign(model.toJSON(), {
        'extra_classes': 'chat-error',
        'onRetryClicked': () => {
            model.error.retry();
            model.destroy();
        },
        'isodate': dayjs(model.get('time')).toISOString()
    }));
}

function renderFileUploadProgresBar (model) {
    return tpl_file_progress(
        Object.assign(model.toJSON(), {
            'filename': model.file.name,
            'filesize': filesize(model.file.size)
        }));
}


// Return a TemplateResult indicating a new day if the passed in message is
// more than a day later than its predecessor.
function getDayIndicator (model) {
    const models = model.collection.models;
    const idx = models.indexOf(model);
    const prev_model =  models[idx-1];
    if (!prev_model || dayjs(model.get('time')).isAfter(dayjs(prev_model.get('time')), 'day')) {
        const day_date =dayjs(model.get('time')).startOf('day');
        return renderDayIndicator({
            'type': 'date',
            'time': day_date.toISOString(),
            'datestring': day_date.format("dddd MMM Do YYYY")
        });
    }
}


function renderMessage (_converse, model) {
    const day = getDayIndicator(model);
    const templates = day ? [day] : [];
    if (model.get('dangling_retraction')) {
        return;
    } else if (model.get('file') && !model.get('oob_url')) {
        return [...templates, renderFileUploadProgresBar(model)];
    } else if (model.get('type') === 'error') {
        return [...templates, renderErrorMessage(model)];
    } else if (model.get('type') === 'info') {
        return [...templates, renderInfoMessage(model)];
    } else {
        return [...templates, renderChatMessage(_converse, model)];
    }
}


class ChatContent extends LitElement {

    static get properties () {
        return {
            _converse: { type: Object },
            model: { type: Object },
            nonce: { type: String }
        }
    }

    render () {
        return html`
            ${repeat(this.model.messages, msg => msg.get('id'), msg => renderMessage(this._converse, msg)) }
            ${ !this.model.messages.length ? tpl_no_msgs : '' }
        `;
    }

    createRenderRoot () {
        // Render without the shadow DOM
        return this;
    }
}

customElements.define('converse-chat-content', ChatContent);
