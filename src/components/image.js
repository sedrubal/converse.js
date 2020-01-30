import { LitElement, html } from 'lit-element';
import { BootstrapModal } from "../converse-modal.js";
import { modal_header_close_button } from "../templates/buttons"
import { Model } from 'skeletor.js/src/model.js';


const tpl_image_modal = (o) => html`
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${o.title}</h5>
                ${modal_header_close_button}
            </div>
            <div class="modal-body">
                <img class="chat-image" src="${o.url}"/>
            </div>
        </div>
    </div>
`;


const MessageVersionsModal = BootstrapModal.extend({
    get id () {
        // FIXME
        return "image-modal";
    },

    toHTML () {
        return tpl_image_modal(this.model.toJSON());
    }
});


class ClickableImage extends LitElement {

    static get properties () {
        return {
            url: { type: String },
            src: { type: String },
        }
    }

    createRenderRoot () {
        // Render without the shadow DOM
        return this;
    }

    render () {
        return html`
            <a href="${this.url}" target="_blank" rel="noopener" @click=${ev => this.showMessageVersionsModal(ev, this.url)}>
                <img class="chat-image img-thumbnail" src="${this.src}"/>
            </a>
        `;
    }

    showMessageVersionsModal (ev, o) {
        ev.preventDefault();
        if (!this.modal) {
            this.modal = new MessageVersionsModal(new Model(o));
        }
        this.modal.set(o, {'silent': true});
        this.modal.show(ev);
    }
}

customElements.define('converse-clickable-image', ClickableImage);
