const { messageToFactoid } = require('../factoids/factoidsPlugin');

const rngPlugin = async (msg) => {
  const { command, handling = () => {}, respondWithMention } = msg;
  if (!command) return;

  const factoid = await messageToFactoid(msg);
  if (factoid) {
    return;
  }

  const m = command.command.match(/^(?:pick|choose|which)[: ](\S[^#?]*)/); // allow to pass comments after # or ?

  if (m) {
    const args = m[1].trim().split(/(?:or|[\s,])+/i); // split by stop words
    const match = args[Math.floor(Math.random() * args.length)];
    handling();
    respondWithMention(`Hmm... how about "${match}"`);
  }
};

module.exports = rngPlugin;
