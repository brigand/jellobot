const facts = require('./facts.json').factoids;
const fs = require('fs');

const factoidPlugin = async (msg) => {
  try {
    await fs.readFileSync('/tmp/disable-factoids');
    return;
  } catch (e) {}
  if (msg.from === 'ecmabot') {
    fs.writeFile('/tmp/disable-factoids', 'x', () => {});
  }
  if (!msg.command) return null;

  let parts = msg.command.command.split('@').map((x) => x.trim());
  const [key, nick] = parts;

  const fact = facts[key];
  if (!fact) return;

  let value = fact.value;
  if (fact.alias) {
    const fact2 = facts[fact.alias];
    if (fact2) {
      value = fact2.value;
    }
  }
  if (!value) return;

  if (nick) {
    msg.respond(`${nick}, ${value}`);
  } else {
    msg.respondWithMention(value);
  }
};

module.exports = factoidPlugin;
