let startedNickChangeAt = null;

module.exports = function changeNick(client, newNick, doGhost) {
  if (client.currentNick === newNick) {
    console.error(`setNick called with ${newNick} but we think the bot already has this nick`);
    return;
  }

  if (startedNickChangeAt && Date.now() < startedNickChangeAt + 30e3) {
    console.error(`Attempted to set nick again in a 30 second window`);
    return;
  }

  console.log(`Will change nick from ${client.currentNick} to ${newNick}`);

  startedNickChangeAt = Date.now();

  const actuallyChange = () => {
    client.send('NICK', newNick);
    // eslint-disable-next-line
    client.currentNick = newNick;
  };

  const handlePm = (nick, text) => {
    if (nick.toLowerCase() !== 'nickserv') return false;

    console.log(`in setNick, we received message ${JSON.stringify(text)} from nickserv. Changing our nick.`);
    // eslint-disable-next-line
    return true;
  };

  let cleanup = () => {};

  if (doGhost) {
    client.say('nickserv', `ghost ${newNick}`);

    // Attempt to ghost the nick, but if we don't get a response for 10 seconds
    // then go ahead and change the nick anyway.
    const timeout = new Promise(resolve => setTimeout(() => resolve(), 10e3));
    const gotPm = new Promise((resolve) => {
      cleanup = () => client.removeListener('pm', handlePm);
      client.on('pm', (nick, text) => {
        cleanup();
        if (handlePm(nick, text)) resolve();
      });
    });

    Promise.race([timeout, gotPm]).then(() => {
      cleanup();
      actuallyChange();
    });
  } else {
    actuallyChange();
  }
};
