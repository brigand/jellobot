const fs = require('fs');
const facts = require('./facts.json').factoids;

function parseMsg(msg) {
  if (!msg.command) {
    return { key: null, nick: null };
  }
  const [key, nick] = msg.command.command.split('@').map((x) => x.trim());

  const findParts = key.split(/^find[ ]*/);
  if (findParts.length > 1) {
    return { key: null, nick: nick || null, find: findParts[1] };
  }

  return { key, nick: nick || null, find: null };
}

const findCommand = (query) => {
  const DISPLAY_LIMIT = 5;
  const MATCH_LIMIT = DISPLAY_LIMIT + 1;
  const needle = query.toLowerCase();
  const points = Object.create(null);

  for (const [key, fact] of Object.entries(facts)) {
    const addPoints = (amount) => {
      points[key] = points[key] || 0;
      points[key] += amount;
    };
    const keyIsPrefix = key.toLowerCase().startsWith(needle);
    const matchesKey = key.toLowerCase().includes(needle);
    const matchesValue = fact.value && fact.value.toLowerCase().includes(needle);

    if (matchesKey) {
      addPoints(10);
    }
    if (keyIsPrefix) {
      addPoints(5);
    }
    if (matchesValue) {
      // A slight boost for popular factoids.
      addPoints(Math.log(fact.value.popularity || 1));
    }
  }

  const matches = Object.keys(points)
    .sort((a, b) => points[b] - points[a])
    .slice(0, MATCH_LIMIT);

  if (matches.length === 0) {
    return `I couldn't find any factoid triggers/messages with that text.`;
  }
  if (matches.length === 1) {
    const [first] = matches;
    if (!facts[first].value) {
      return `found !${first}`;
    }
    return `found !${first}: ${facts[first].value}`;
  }

  const andMore = matches.length === MATCH_LIMIT;
  const items = matches.slice(0, DISPLAY_LIMIT).map((k) => `!${k}`);
  const last = items.pop();
  const tail = andMore ? `and more` : `and ${last}`;
  const formatted = [...items, tail].join(', ');

  return `found ${formatted}`;
};

const factoidPlugin = async (msg) => {
  if (msg.from === 'ecmabot') {
    fs.writeFile('/tmp/disable-factoids', 'x', () => {});
  }

  const { nick, find } = parseMsg(msg);

  if (find) {
    const response = findCommand(find);
    if (nick) {
      msg.respond(`${nick}, ${response}`);
    } else {
      msg.respondWithMention(response);
    }
    return;
  }

  const value = await factoidPlugin.messageToFactoid(msg);

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

  const { key, find } = parseMsg(msg);
  if (find) {
    return { find };
  }

  // TODO: add hasOwnProperty check

  if (key === 'source') {
    return `I'm written in JS and my code can be found at https://github.com/brigand/jellobot`;
  }

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

factoidPlugin.parseMsg = parseMsg;

module.exports = factoidPlugin;
