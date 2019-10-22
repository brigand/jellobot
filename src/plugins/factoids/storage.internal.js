/* eslint-disable no-underscore-dangle */
const fs = require('fs');
const path = require('path');
const { promisify, inspect } = require('util');
const { RespondWithMention } = require('../../errors');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const FILE_PATH = path.join(__dirname, 'factoids.json');

function toKey(key) {
  return (key && key.toLowerCase()) || null;
}

class Store {
  #items = new Map();

  #loaded = false;

  #readPromise = null;

  #writePromise = null;

  #dirty = false;

  constructor(parent = null) {
    if (parent) {
      const { items, loaded, dirty } = parent._getFields();
      if (items) this.#items = items;
      if (loaded != null) this.#loaded = loaded;
      if (dirty != null) this.#dirty = dirty;
    }
  }

  _getFields() {
    return {
      items: this.#items,
      loaded: this.#loaded,
      dirty: this.#dirty,
    };
  }

  _replaceAll(items) {
    this.#items = items;
  }

  set(key, entry) {
    this.#items.set(toKey(key), entry);
    this.#dirty = true;
    return this;
  }

  getTextLive(key) {
    return this.getTextWhere(key, (change) => change.live);
  }

  getTextDraft(key) {
    let hitLive = false;
    return this.getTextWhere(key, (change) => {
      if (change.live) {
        hitLive = true;
        return false;
      } else if (hitLive) {
        return false;
      } else {
        return true;
      }
    });
  }

  getTextWhere(key, filter) {
    const MAX_ALIAS_DEPTH = 5;
    let cursor = { type: 'alias', value: toKey(key) };

    for (
      let i = 0;
      i < MAX_ALIAS_DEPTH && cursor && cursor.type === 'alias';
      i += 1
    ) {
      cursor = this.#items.get(cursor.value) || null;
    }

    if (cursor && cursor.type === 'alias') {
      throw new Error(`Alias depth exceeded when looking up a factoid.`);
    }

    if (cursor && cursor.type === 'factoid') {
      const change = cursor.changes.find(filter);
      return (change && change.value) || null;
    }

    return null;
  }

  toJSON() {
    const obj = {};
    for (const [key, entry] of this.#items) {
      obj[key] = entry;
    }
    return obj;
  }

  needsLoadFromDisk() {
    return !this.#loaded;
  }

  async loadFromDisk() {
    const readPromise = this.#readPromise || this.#loadFromDiskInternal();
    this.#readPromise = readPromise;

    await readPromise;

    this.#loaded = true;
    if (this.#readPromise === readPromise) {
      this.#readPromise = null;
    }
  }

  update(key, { editor, value, live }) {
    if (!this.#loaded) {
      throw new Error(
        `Must wait for loadFromDisk to complete before calling .update`,
      );
    }

    if (value != null && value.length > 400) {
      throw new RespondWithMention(
        `factoids may not be more than 400 characters long.`,
      );
    }

    const entry = this.#items.has(key)
      ? { ...this.#items.get(key) }
      : {
          type: 'factoid',
          popularity: 0,
          editors: [],
          changes: [],
        };

    if (entry && entry.type === 'alias') {
      throw new RespondWithMention(`an alias named "${key}" already exists.`);
    }

    const currentIndex = entry.changes.findIndex((change) => change.live);
    const current = entry.changes[currentIndex];
    if (current && current.value === value) {
      throw new RespondWithMention(
        `this is the same as the current value in "${key}".`,
      );
    }

    if (!live) {
      const draft = currentIndex === 0 ? null : entry.changes[0];
      if (draft && draft.value === value) {
        throw new RespondWithMention(
          `this exact change to "${key}" has already been proposed.`,
        );
      }
    }

    const editor2 = toKey(editor);

    if (!entry.editors.includes(editor2)) {
      entry.editors = entry.editors.concat([editor2]);
    }
    entry.changes = [
      {
        date: new Date().toISOString(),
        editor: editor2,
        value,
        live,
      },
    ].concat(entry.changes);

    this.#items.set(toKey(key), entry);
    this.#dirty = true;
  }

  publishDraft(key) {
    const key2 = toKey(key);

    const entry = this.#items.get(key2);

    if (!entry) {
      throw new RespondWithMention(
        `I couldn't find "${key}" - neither a draft nor live factoid.`,
      );
    }

    const liveIndex = entry.changes.findIndex((item) => item.live);
    const draftIndex = entry.changes.findIndex((item) => !item.live);

    if (draftIndex === -1) {
      throw new RespondWithMention(`I couldn't find any drafts for "${key}".`);
    }

    if (liveIndex !== -1 && liveIndex < draftIndex) {
      throw new RespondWithMention(
        `The latest draft is older than the live change for "${key}".`,
      );
    }

    entry.changes[draftIndex] = { ...entry.changes[draftIndex], live: true };

    return { deleted: !this.getTextLive() };
  }

  async writeToDisk() {
    if (!this.#writePromise) {
      this.#writePromise = Promise.resolve();
    }
    this.#writePromise = this.#writePromise.then(async () => {
      const promise = this.#writeToDiskInternal();
      const updated = await promise.catch((error) => {
        console.error(`Failed to write to disk. ${inspect(error, { depth: 7 })}`);
      });
      if (this.#writePromise === promise) {
        this.#writePromise = null;
      }
      return updated || false;
    });

    return this.#writePromise;
  }

  #loadFromDiskInternal = async function loadFromDiskInternal() {
    const map = new Map();
    const entries = JSON.parse(await readFile(FILE_PATH, 'utf-8'));
    for (const key of Object.keys(entries)) {
      map.set(key, entries[key]);
    }
    this._replaceAll(map);
    this.#dirty = false;
  };

  #writeToDiskInternal = async function writeToDiskInternal() {
    if (!this.#dirty) {
      return false;
    }

    const output = JSON.stringify(this, null, 2);
    await writeFile(FILE_PATH, output);
    this.#dirty = false;

    return true;
  };
}

exports.Store = Store;
