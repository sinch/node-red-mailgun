const formData = require('form-data');
const Mailgun = require('mailgun.js');

module.exports = function(RED) {
  class SendEmail {
    constructor(config) {
      RED.nodes.createNode(this, config);
      this.config = config;

      const {
        baseUrl,
        apiKey,
        sender,
        recipient,
        subject,
        body,
        template,
        outputMap,
        outputs,
        variables,
        region,
      } = this.config;

      this.onCallback = (msg) => {
        const { event } = msg;
        const args = Array(outputs).fill(null);
        const outputFor = JSON.parse(outputMap);
        args[outputFor[`${event}`]] = msg;
        this.send(args);
      };

      this.on('input', async (msg, send, done) => {
        try {
          const mailgun = new Mailgun(formData);

          const to = msg.recipient ? msg.recipient : recipient;
          if (!to || to === '') {
            throw 'No recipient specified';
          }

          const from = msg.sender ? msg.sender : sender;
          if ((!sender || sender === '') && !msg.sender) {
            throw 'No sender specified';
          }

          const vars = {};
          variables.forEach(({ key, value }) => {
            if (key !== '' && value !== '') {
              vars[key] = value;
            }
          });

          let data = {
            from: `${this.id} <${from}>`, // This allows extraction of the node-id and perform routing based on the response.
            to,
            subject,
            text: body,
            'v:nextResponse': JSON.stringify(this._path),
            'h:X-Mailgun-Variables':
              Object.keys(vars).length !== 0 ? JSON.stringify(vars) : undefined, // This will be passed back on events and enables routing of events to sender node.
          };
          if (template && template !== '') {
            data = {
              ...data,
              template,
            };
          }

          const url = region === 'EU' ? 'https://api.eu.mailgun.net' : undefined;

          const mg = mailgun.client({ username: 'api', key: apiKey, url });
          mg.messages
            .create(baseUrl, data)
            .then((res) => {
              if (res.status !== 200) {
                this.warn(`Email with id: ${res.id} failed`);
              }
            })
            .catch((reason) => {
              throw reason;
            });
        } catch (err) {
          this.error(err);
        }

        const message = {
          ...msg,
          recipient: msg.recipient || recipient,
          sender: msg.sender || sender, 
          variables
        };

        const args = Array(outputs).fill(null);
        const outputFor = JSON.parse(outputMap);
        args[outputFor['default']] = message;
        send(args);
        done();
      });
    }
  }

  RED.nodes.registerType('sinch-send-email', SendEmail);
};
