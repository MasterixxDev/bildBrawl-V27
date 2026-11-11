const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")
const JoinClubListMessage = require('../../Server/Auth/JoinClubListMessage') // Исправлено здесь
const database = require("../../../../db/PlayerManager")

class AskForJoinListClub extends PiranhaMessage {
  constructor (bytes, session) {
    super(session)
    this.session = session
    this.id = 14303
    this.version = 0
    this.stream = new ByteStream(bytes)
  }

  async decode () {
  
    const clubs = await database.getClubList();
    new JoinClubListMessage(this.session, clubs).send() // Теперь JoinClubListMessage определен
  }
}

module.exports = AskForJoinListClub // Также исправьте экспорт