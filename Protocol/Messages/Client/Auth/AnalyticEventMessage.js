const PiranhaMessage = require('../../../PiranhaMessage') // You should change it if you transfer this file in another subdirectory
const ByteStream = require("../../../../ByteStream")

class AnalyticEventMessage extends PiranhaMessage {
  constructor (bytes, session) {
    super(session)
    this.session = session
    this.id = 10110
    this.version = 0
    this.stream = new ByteStream(bytes)
  }

  async decode () {
    this.Type = this.stream.readString()
    this.Event = this.stream.readString()
  }

  async process () {
    if (this.Type !== "Economy"){
        console.log(`Type ${this.Type} || Event ${this.Event}`)
    }
  }
}

module.exports = AnalyticEventMessage
