let STORE;

exports.getStore = () => {
  // eslint-disable-next-line global-require
  const { Store } = require('./storage.internal');
  if (STORE) {
    if (Object.getPrototypeOf(STORE) !== Store.prototype) {
      Object.setPrototypeOf(STORE, Store.prototype);
    }
  } else {
    STORE = new Store();
    STORE.loadFromDisk().catch((error) => {
      console.error(`Initial loadFromDisk failed`, error);
    });

    const tryWrite = () => {
      STORE.writeToDisk()
        .then((didWrite) => {
          if (didWrite) {
            console.log('Wrote factoids to disk');
          }
          setTimeout(tryWrite, 15e3);
        })
        .catch((error) => {
          console.error(`Failure in STORE.writeToDisk():`, error);
          setTimeout(tryWrite, 15e3);
        });
    };

    setTimeout(tryWrite, 15e3);
  }

  return STORE;
};
