const { registerReceivedEmailNode } = require('../../api/mailgun-api');

module.exports = function(RED) {
  class ReceivedEmail {
    constructor(config) {
      RED.nodes.createNode(this, config);
      this.config = config;

      registerReceivedEmailNode(this);

      const { recipient } = this.config;

      this.onInboundEmail = (msg) => {
        // eslint-disable-next-line security/detect-non-literal-regexp
        const re = new RegExp(recipient);

        const { sender } = msg;

        if (!recipient || recipient === '' || sender.match(re)) {
          this.send(msg);
        }
      };
    }
  }

  RED.nodes.registerType('sinch-received-email', ReceivedEmail);
};
