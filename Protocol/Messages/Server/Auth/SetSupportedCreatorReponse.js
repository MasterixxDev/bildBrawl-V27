const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")

class SetSupportedCreatorReponse extends PiranhaMessage {
  constructor(session) {
    super(session);
    this.id = 28686;
    this.session = session;
    this.version = 0;
    this.stream = new ByteStream();
  }

  async encode() {
    this.stream.writeVInt(1);
    this.stream.writeString(this.session.AuthorCode);
  }
}

module.exports = SetSupportedCreatorReponse;
