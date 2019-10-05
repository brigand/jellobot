const { factoids } = require('./src/plugins/factoids/facts.json');

const USER = process.env[2];
if (!USER) {
  console.error(`Expected $1 to be the user to search for`);
}
const items = [];
let current = 0;
let previous = 0;

for (const [factoid, { changes }] of Object.entries(factoids)) {
  if (!changes) {
    continue;
  }
  for (const change of changes) {
    if (!change.editor) {
      continue;
    }
    if (change.editor.toLowerCase().startsWith(USER.toLowerCase())) {
      const latest = change === changes[changes.length - 1];
      if (latest) {
        current += 1;
      } else {
        previous += 1;
      }
      const label = latest ? '(current)' : '(previous)';
      items.push(`${factoid} ${label}: ${change['new-value']}`);
    }
  }
}

console.log(items.join('\n\n'));
console.error(
  `\nUser ${USER} has the latest version of ${current} factoid(s) and ${previous} non-latest entries`,
);
