const ByteStream = require("../../../../ByteStream")
const PiranhaMessage = require('../../../PiranhaMessage')
const database = require("../../../../db/PlayerManager")

const SetNameCallback = require('../../Server/Auth/SetNameCallback')

class ChangeAvatarNameMessage extends PiranhaMessage {
  constructor (bytes, session, Name) {
    super(session)
    this.session = session
    this.Name = Name
    this.id = 10212
    this.version = 0
    this.stream = new ByteStream(bytes)
  }

  async decode () {
    this.Name = this.stream.readString()
  }

  async process () {
    console.log(this.Name)
    database.replaceValue(this.session.player.token, 'Name', this.Name)
    new SetNameCallback(this.session, this.Name).send()
  }
}

module.exports = ChangeAvatarNameMessage

