/* eslint-disable max-classes-per-file */

class RespondWithMention extends Error {
  static TYPE = Symbol.for('jb::errors::RespondWithMention');

  type = RespondWithMention.TYPE;

  constructor(message) {
    super(message);
    this.original = message;
  }

  static is(error) {
    return !!error && error.type === RespondWithMention.TYPE;
  }
}

class Respond extends Error {
  static TYPE = Symbol.for('jb::errors::Respond');

  type = Respond.TYPE;

  constructor(message) {
    super(message);
    this.original = message;
  }

  static is(error) {
    return !!error && error.type === Respond.TYPE;
  }
}

exports.RespondWithMention = RespondWithMention;
exports.Respond = Respond;
