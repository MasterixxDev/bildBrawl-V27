const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")

class ClubMemberEntry extends PiranhaMessage {
  constructor (session) {
    super(session)
    this.id = 24308
    this.session = session
    this.version = 0
    this.stream = new ByteStream()
  }

  async encode () {
    this.stream.writeVInt(0);
    this.stream.writeInt(1);
    this.stream.writeInt(0);
    this.stream.writeInt(1);
    this.stream.writeString("шарлотан");
    this.stream.writeVInt(100);
    this.stream.writeVInt(28000000);
    this.stream.writeVInt(43000000);
    this.stream.writeBoolean(false);
  }
}

module.exports = ClubMemberEntry