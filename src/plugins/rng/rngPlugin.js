
const rngPlugin = async (msg) => {
  if (!msg.command) return;

  const m = msg.command.command.match(/(pick|choose) (\S.*)(#|$)/); // allow to pass comments after #

  if (m) {
    const args = m[1].split(/(?:or|[\s,|])+?/i); // split by stop words
    const match = args[Math.floor(Math.random() * args.length)];
    msg.handling();
    msg.respondWithMention(`Hmm... how about "${match}"`);
  }
};

module.exports = rngPlugin;

