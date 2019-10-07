/* eslint-disable no-underscore-dangle */
const fs = require('fs');
const path = require('path');
const { promisify, inspect } = require('util');

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

  getText(key) {
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
      const change = cursor.changes.find((chg) => chg.live);
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
    const readPromise = this.#readPromise || this._loadFromDiskInternal();
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
      throw new Error(`Factoids may not be more than 400 characters long.`);
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
      throw new Error(`An alias named "${key}" already exists.`);
    }

    const current = entry.changes.find((change) => change.live);
    if (current && current.value === value) {
      throw new Error(`This is the same as the current value in "${key}".`);
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

  async writeToDisk() {
    if (!this.#writePromise) {
      this.#writePromise = Promise.resolve();
    }
    this.#writePromise = this.#writePromise.then(async () => {
      const promise = this._writeToDiskInternal();
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

  async _loadFromDiskInternal() {
    const map = new Map();
    const entries = JSON.parse(await readFile(FILE_PATH, 'utf-8'));
    for (const key of Object.keys(entries)) {
      map.set(key, entries[key]);
    }
    this._replaceAll(map);
    this.#dirty = false;
  }

  async _writeToDiskInternal() {
    if (!this.#dirty) {
      return false;
    }

    const output = JSON.stringify(this, null, 2);
    await writeFile(FILE_PATH, output);
    this.#dirty = false;

    return true;
  }
}

exports.Store = Store;
