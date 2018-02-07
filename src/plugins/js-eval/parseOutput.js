const parseOutput = (inputText) => {
  console.log(inputText);
  const parts = inputText.split('%%%%%');

  let text = '';
  const meta = { items: [] };

  let state = null;
  parts.forEach((part, i) => {
    const typeIndex = i % 3;
    const type = ['raw', 'position', 'value'][typeIndex];
    if (type === 'raw') {
      text += part;
    } else if (type === 'position') {
      state = { type: 'value', pos: part, value: null };
    } else if (type === 'value') {
      state.value = part;
      meta.items.push(state);
      state = null;
    }
  });

  return { text, meta };
};

module.exports = parseOutput;
