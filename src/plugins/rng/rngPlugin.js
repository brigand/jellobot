
const rngPlugin = (msg) => {
  if (!msg.command) return Promise.resolve();
  const words = msg.command.command.split(' ');
  const command = words[0];
  const args = words.slice(1);

  if (command === 'pick' && args.length) {
    const match = args[Math.floor(Math.random() * args.length)];
    msg.handling();
    msg.respondWithMention(`Hmm... how about "${match}"`);
  }
};

module.exports = rngPlugin;

