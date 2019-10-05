const rngPlugin = async ({ command, handling = () => {}, respondWithMention }) => {
  if (!command) return;

  const m = command.command.match(/^(?:pick|choose|which)[: ](\S[^#?]*)/); // allow to pass comments after # or ?

  if (m) {
    const args = m[1].trim().split(/(?:or|[\s,])+/i); // split by stop words
    const match = args[Math.floor(Math.random() * args.length)];
    handling();
    respondWithMention(`Hmm... how about "${match}"`);
  }
};

module.exports = rngPlugin;
