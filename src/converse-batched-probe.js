import { api, converse } from "@converse/headless/converse-core";
import log from "@converse/headless/log";

const { Strophe, $iq } = converse.env;
const u = converse.env.utils;
let probed_jids = [];


converse.plugins.add('converse-batched-probe', {

    dependencies: ['converse-muc', 'converse-status'],

    initialize () {

        api.listen.on('messageAdded', data => {
            // Whenever we receive a message from an unknown author, we send a
            // presence probe in order to get their hats information
            const { message, chatbox } = data;
            const jid = `${chatbox.get('jid')}/${message.get('nick')}`;
            if (message.get('sender') === 'them' && !message.occupant && !probed_jids.includes(jid)) {
                api.user.presence.send('probe', jid);
                probed_jids.push(jid);
            }
        });


        api.listen.on('MAMResult', async data => {
            // Whenever we receive a batch of MAM messages, we check for
            // unknown authors and send an IQ stanza to probe for their hats in bulk.
            const { chatbox, result } = data;
            const known_nicknames = chatbox.occupants.pluck('nick');
            const muc_jid = chatbox.get('jid');
            const jids_to_probe = [...new Set(result.messages
                .filter(m => !known_nicknames.includes(m.nick))
                .map(m => `${muc_jid}/${m.nick}`)
                .filter(jid => !probed_jids.includes(jid))
            )];

            const iq = $iq({'type': 'get'}).c('query', {'xmlns': Strophe.NS.MUC_USER});
            jids_to_probe.forEach(jid => iq.c('item', { jid }));
            const old_probed_jids = probed_jids;
            probed_jids = [...probed_jids, ...jids_to_probe];

            const iq_result = await api.sendIQ(iq, null, false);
            if (iq_result === null) {
                const err_msg = "Timeout while doing a batched presence probe.";
                log.error(err_msg);
                probed_jids = old_probed_jids
            } else if (u.isErrorStanza(iq_result)) {
                log.error("Error stanza while doing a batched presence probe.");
                log.error(iq_result);
            }
        });
    }
});
