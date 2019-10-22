const fs = require('fs');
const { promisify, inspect } = require('util');
const slugify = require('slugify');
const { RespondWithMention } = require('../../errors');
const text = require('../../utils/text');
const { getStore } = require('./storage.persistent');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function checkAndSaveDisabled(msg) {
  if (!msg.channel) {
    return false;
  }

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
  console.log({ self: msg.selfConfig });
  const isModerator = moderators.includes(msg.from);

  new Command(command).log(msg).match({
    factoid({ key }) {
      const content = STORE.getTextLive(key);

      if (content) {
        msg.handling({ type: 'factoid', key });
        msg.respondWithMention(content);
      }
    },
    learn({ key, value }) {
      msg.handling({ type: 'learn', key, value });
      if (key.length > 50) {
        msg.respondWithMention(
          `is anyone going to remember a ${key.length} character trigger? Try something shorter (max 50)`,
        );
        return;
      }

      STORE.update(key, { editor: msg.from, value, live: false });

      msg.respondWithMention(`I'll record the proposed change to ${inspect(key)}`);
    },
    forget({ key }) {
      msg.handling({ type: 'forget', key });
      const current = STORE.getTextLive(key);

      if (current == null) {
        throw new RespondWithMention(
          `The factoid for "${key}" never existed or was already deleted.`,
        );
      } else {
        STORE.update(key, { editor: msg.from, value: null, live: false });

        msg.respondWithMention(`I'll make a note that you want "${key}" removed.`);
      }
    },
    publish({ key }) {
      msg.handling({ type: 'publish', key });

      if (!msg.pm) {
        throw new RespondWithMention(
          `the !publish command can only be used in a private message`,
        );
      }

      if (!isModerator) {
        // Something to grep in logs.
        msg.log(`Code: 7e01ece9. !publish attempt by ${inspect(msg.from)}`);

        throw new RespondWithMention(
          `only factoid moderators can publish a factoid.`,
        );
      }

      const { deleted } = STORE.publishDraft(key);

      if (deleted) {
        msg.respondWithMention(`done. The factoid has been deleted, as proposed.`);
      } else {
        msg.respondWithMention(
          `done. Everyone will now see the previous draft when "!${key}" is used.`,
        );
      }
    },
  });
};

module.exports = factoidPlugin;
