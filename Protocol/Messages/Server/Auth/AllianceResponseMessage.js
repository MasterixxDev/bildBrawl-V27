const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")

class AllianceResponseMessage extends PiranhaMessage {
  constructor(session, type) {
    super(session)
    this.id = 24333
    this.session = session
    this.version = 1
    this.type = type
  }

  async encode() {
    this.stream = new ByteStream()
    this.stream.writeVInt(this.type)
    console.log(`AllianceResponseMessage отправлен с типом: ${this.type}`)
  }
}

module.exports = AllianceResponseMessage