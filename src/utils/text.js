function validate(text) {
  const normal = text.normalize();
  const withoutDiacritics = normal.replace(/[\u0300-\u036f]/g, '');

  if (normal === withoutDiacritics) {
    return normal;
  } else {
    throw Object.assign(new Error(`Expected text to not have diacritics`), {
      code: 'JB::DIACRITICS',
    });
  }
}

Object.assign(module.exports, { validate });
