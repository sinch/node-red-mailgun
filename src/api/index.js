const { registerCallback, registerTemplates } = require('./mailgun-api');

module.exports = function(RED) {
  registerCallback(RED);
  registerTemplates(RED);
};
