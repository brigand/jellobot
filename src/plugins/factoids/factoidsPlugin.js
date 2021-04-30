const fs = require('fs');
const facts = require('./facts.json').factoids;

function parseMsg(msg) {
  if (!msg.command) {
    return { key: null, nick: null };
  }
  const [key, nick] = msg.command.command.split('@').map((x) => x.trim());
  return { key, nick: nick || null };
}

const factoidPlugin = async (msg) => {
  if (msg.from === 'ecmabot') {
    fs.writeFile('/tmp/disable-factoids', 'x', () => {});
  }

  const value = await factoidPlugin.messageToFactoid(msg);
  const { nick } = parseMsg(msg);

  if (!value) return;

  if (nick) {
    msg.respond(`${nick}, ${value}`);
  } else {
    msg.respondWithMention(value);
  }
};

factoidPlugin.messageToFactoid = async (msg) => {
  try {
    await fs.readFileSync('/tmp/disable-factoids');
    return null;
  } catch (e) {
    // do nothing
  }

  if (!msg.command) return null;

  const { key } = parseMsg(msg);

  const fact = facts[key];
  if (!fact) return;

  if (fact.alias) {
    const fact2 = facts[fact.alias];
    if (fact2) {
      return fact2.value;
    }
  }

  return fact.value;
};

module.exports = factoidPlugin;
