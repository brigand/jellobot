const fs = require('fs');
const { promisify } = require('util');
const slugify = require('slugify');
const { getStore } = require('./storage.persistent');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function checkAndSaveDisabled(msg) {
  const safeTo = slugify(msg.channel);

  const disableFile = `/tmp/disable-factoids${safeTo}`;

  const disabled = await readFile(disableFile).then(() => true, () => false);

  if (!disabled && msg.from === 'ecmabot') {
    await writeFile(disableFile, 'delete to enable', () => {});
  }

  if (disabled) {
    console.log(`Factoids are disabled in ${msg.channel} due to an ecmabot message.`);
    console.log(`    Delete ${disableFile} to reset this.`);
  }

  return disabled;
}

const factoidPlugin = async (msg) => {
  if (!msg.command) return null;
  if (await checkAndSaveDisabled(msg)) {
    return;
  }

  const { command } = msg.command;

  const STORE = getStore();

  if (STORE.needsLoadFromDisk()) {
    await STORE.loadFromDisk();
  }

  const learnMatch = command.match(
    /learn\s+([a-zA-Z0-9_ -]{2,}[a-zA-Z0-9_-])\s*=\s*(.*)$/,
  );

  if (learnMatch) {
    const [, key, value] = learnMatch;
    if (key.length > 50) {
      msg.respondWithMention(
        `Is anyone going to remember a ${key.length} character trigger? Try something shorter (max 50)`,
      );
      return;
    }
    STORE.update(key, { editor: msg.from, value });
    msg.respondWithMention(`Learned "${key}"`);
    return;
  }

  const text = STORE.getText(command);

  if (text) {
    msg.respondWithMention(text);
  }
};

module.exports = factoidPlugin;
