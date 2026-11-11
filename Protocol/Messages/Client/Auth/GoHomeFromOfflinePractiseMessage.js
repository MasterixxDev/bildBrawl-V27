

const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")
const OwnHomeDataMessage = require('../../Server/Auth/OwnHomeDataMessage')
const database = require("../../../../db/PlayerManager")

class GoHomeFromOfflinePractiseMessage extends PiranhaMessage {
  constructor (bytes, session) {
    super(session)
    this.session = session
    this.id = 14109
    this.version = 0
    this.stream = new ByteStream(bytes)
  }

  async decode () {
    //idk
  }

  async process () {
    const account = await database.getAccount(this.session.player)
    new OwnHomeDataMessage(this.session, account).send();
  }
}

module.exports = GoHomeFromOfflinePractiseMessage
