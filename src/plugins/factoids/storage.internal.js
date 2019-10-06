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
  constructor() {
    this._items = new Map();
    this._loaded = false;
    this._readPromise = null;
    this._writePromise = null;
    this._dirty = false;
  }

  _replaceAll(items) {
    this._items = items;
  }

  set(key, entry) {
    this._items.set(key.toLowerCase(), entry);
    this._dirty = true;
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
      cursor = this._items.get(cursor.value) || null;
    }

    if (cursor && cursor.type === 'alias') {
      throw new Error(`Alias depth exceeded when looking up a factoid.`);
    }

    if (cursor && cursor.type === 'factoid') {
      return cursor.value;
    }

    return null;
  }

  toJSON() {
    const obj = {};
    for (const [key, entry] of this._items) {
      obj[key] = entry;
    }
    return obj;
  }

  needsLoadFromDisk() {
    return !this._loaded;
  }

  async loadFromDisk() {
    const readPromise = this._readPromise || this._loadFromDiskInternal();
    this._readPromise = readPromise;

    await readPromise;

    this._loaded = true;
    if (this._readPromise === readPromise) {
      this._readPromise = null;
    }
  }

  update(key, { editor, value }) {
    if (!this._loaded) {
      throw new Error(
        `Must wait for loadFromDisk to complete before calling .update`,
      );
    }

    if (value.length > 400) {
      throw new Error(`Factoids may not be more than 400 characters long.`);
    }

    let entry = this._items.get(key);

    if (entry && entry.type === 'alias') {
      throw new Error(`An alias named "${key}" already exists.`);
    }

    if (entry.value === value) {
      throw new Error(`This is the same as the current value in "${key}".`);
    }

    if (entry) {
      const editor2 = toKey(editor);
      if (!entry.editors.includes(editor2)) {
        entry.editors.push(editor2);
      }
      entry.changes.unshift({
        date: new Date().toISOString(),
        editor,
        value,
        previous: entry.value,
      });
      entry.value = value;
    } else {
      entry = {
        type: 'factoid',
        value,
        creator: editor,
        date: new Date().toISOString(),
        popularity: 0,
        editors: [],
        changes: [],
      };
    }

    this._items.set(key, entry);
    this._dirty = true;
  }

  async writeToDisk() {
    if (!this._writePromise) {
      this._writePromise = Promise.resolve();
    }
    this._writePromise = this._writePromise.then(async () => {
      const promise = this._writeToDiskInternal();
      const updated = await promise.catch((error) => {
        console.error(`Failed to write to disk. ${inspect(error, { depth: 7 })}`);
      });
      if (this._writePromise === promise) {
        this._writePromise = null;
      }
      return updated || false;
    });

    return this._writePromise;
  }

  async _loadFromDiskInternal() {
    const map = new Map();
    const entries = JSON.parse(await readFile(FILE_PATH, 'utf-8'));
    for (const key of Object.keys(entries)) {
      map.set(key, entries[key]);
    }
    this._replaceAll(map);
    this._dirty = false;
  }

  async _writeToDiskInternal() {
    if (!this._dirty) {
      return false;
    }

    const output = JSON.stringify(this, null, 2);
    await writeFile(FILE_PATH, output);
    this._dirty = false;

    return true;
  }
}

exports.Store = Store;
