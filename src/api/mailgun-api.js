const Mailgun = require("mailgun.js");
const formData = require("form-data");

const GetNode = require("../utils/get-node");

const receivedEmailNodes = [];

/*
 * Called by Received Email node on deploy
 */

const registerReceivedEmailNode = (receivedEmailNode) => {
  receivedEmailNodes.push(receivedEmailNode);
};

const registerCallback = (RED) => {
  RED.httpNode.post("/mailgun/events-email", async (req, res) => {
    res.sendStatus(200);
    try {
      /*
       * First check if there is a Send Email node waiting for a response
       */
      const { body } = req;
      const { recipient, sender, subject, timestamp } = body;
      const payload = body["stripped-text"];

      const eventData = body["event-data"];
      if (eventData) {
        const variables = eventData["user-variables"];
        if (
          typeof variables !== "undefined" &&
          typeof variables.nextResponse !== "undefined"
        ) {
          const nextResponse = JSON.parse(variables.nextResponse);
          const getNode = GetNode(RED);
          const awaitingNode = getNode(nextResponse);
          if (awaitingNode) {
            awaitingNode.onCallback(eventData);
          }
        }
        /*
         * If not check if inbound email info is present and if there is one or more Receive Email node in the flow
         */
      } else if (recipient && sender && timestamp && payload) {
        const msg = {
          recipient: sender,
          sender: recipient,
          subject,
          timestamp,
          payload,
        };

        if (receivedEmailNodes.length > 0) {
          receivedEmailNodes.forEach((reNode) => {
            reNode.onInboundEmail(msg);
          });
        }
      } else {
        console.log("There is no node to handle incoming email event.");
      }
    } catch (error) {
      console.log("Invalid request to events-email endpoint: ", error);
    }
  });
};

const registerTemplates = (RED) => {
  RED.httpNode.post("/external/mailgun/templates", async (req, res) => {
    const mailgun = new Mailgun(formData);
    const { baseUrl, apiKey } = req.body;
    if (!baseUrl || !apiKey) {
      return res.sendStatus(400);
    }

    const mg = mailgun.client({ username: "api", key: apiKey });
    try {
      const response = await mg.domains.domainTemplates.list(baseUrl);
      if (response && response.items) {
        res.send(response.items);
      } else {
        res.send([]);
      }
    } catch (error) {
      if (error.status) {
        return res.sendStatus(error.status);
      }
      return res.sendStatus(500);
    }
  });
};

module.exports = {
  registerReceivedEmailNode,
  registerTemplates,
  registerCallback,
};
