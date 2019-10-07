const fs = require('fs');
const { promisify, inspect } = require('util');
const slugify = require('slugify');
const { RespondWithMention } = require('../../errors');
const text = require('../../utils/text');
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

class Command {
  type = '';

  arg = null;

  constructor(command) {
    const learn = command.match(/learn\s+([^=]+[^=\s])\s*=\s*(.*)$/);

    if (learn) {
      const [, key, value] = learn;
      this.type = 'learn';
      this.arg = { key, value };
      return;
    }

    const forget = command.match(/forget\s+([^=]+[^=\s])\s*$/);
    if (forget) {
      const [, key] = forget;
      this.type = 'forget';
      this.arg = { key };
      return;
    }

    const publish = command.match(/publish\s+([^=]+[^=\s])\s*$/);
    if (publish) {
      const [, key] = publish;
      this.type = 'publish';
      this.arg = { key };
      return;
    }

    this.type = 'factoid';
    this.arg = { key: command.trim() };
  }

  match(matchers) {
    const has = Object.prototype.hasOwnProperty;
    if (has.call(matchers, this.type)) {
      return matchers[this.type](this.arg);
    } else {
      return matchers.default();
    }
  }

  log(msg) {
    const log = this.type === 'factoid' ? msg.vlog : msg.log;
    log(`type=${inspect(this.type)} arg=${inspect(this.arg)}`);
    return this;
  }
}

const factoidPlugin = async (msg) => {
  if (!msg.command) return null;
  if (await checkAndSaveDisabled(msg)) {
    return;
  }

  const command = text.validate(msg.command.command).trim();

  const STORE = getStore();

  if (STORE.needsLoadFromDisk()) {
    await STORE.loadFromDisk();
  }

  const moderators = (msg.selfConfig && msg.selfConfig.moderators) || [];
  const live = moderators.includes(msg.from);

  new Command(command).log(msg).match({
    factoid({ key }) {
      const content = STORE.getTextLive(key);

      if (content) {
        msg.respondWithMention(content);
      }
    },
    learn({ key, value }) {
      if (key.length > 50) {
        msg.respondWithMention(
          `is anyone going to remember a ${key.length} character trigger? Try something shorter (max 50)`,
        );
        return;
      }

      STORE.update(key, { editor: msg.from, value, live });
      if (live) {
        msg.respondWithMention(
          `got it. I'll remember this for when "!${key}" is used.`,
        );
      } else {
        msg.respondWithMention(`change proposed to "${key}"`);
      }
    },
    forget({ key }) {
      const current = STORE.getText(key);

      if (current == null) {
        throw new RespondWithMention(
          `The factoid for "${key}" never existed or was already deleted.`,
        );
      } else {
        STORE.update(key, { editor: msg.from, value: null, live });
        if (live) {
          msg.respondWithMention(`I won't respond to "${key}" anymore.`);
        } else {
          msg.respondWithMention(`I'll make a note that you want "${key}" removed.`);
        }
      }
    },
    publish({ key }) {
      if (!live) {
        // Something to grep in logs.
        msg.log(`Code: 7e01ece9. !publish attempt by ${inspect(msg.from)}`);

        throw new RespondWithMention(
          `only factoid moderators can publish a factoid.`,
        );
      }

      STORE.publishDraft(key);
    },
  });
};

module.exports = factoidPlugin;
