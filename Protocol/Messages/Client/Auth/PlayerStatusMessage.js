
const PiranhaMessage = require('../../../PiranhaMessage') // You should change it if you transfer this file in another subdirectory
const ByteStream = require("../../../../ByteStream")
const database = require("../../../../db/PlayerManager")

class PlayerStatusMessage extends PiranhaMessage {
  constructor (bytes, session) {
    super(session)
    this.session = session
    this.id = 14366
    this.version = 0
    this.stream = new ByteStream(bytes)
  }

  async decode () {
    this.Status = this.stream.readVInt()
  }

  async process () {
    database.replaceValue(this.session.lowID,'Status', this.Status)
  }
}

module.exports = PlayerStatusMessage
