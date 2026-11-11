const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")
const PlayerProfileMessage = require('../../Server/Auth/PlayerProfileMessage')
const database = require("../../../../db/PlayerManager")

class GetPlayerProfileMessage extends PiranhaMessage {
  constructor (bytes, session) {
    super(session)
    this.session = session
    this.id = 14113
    this.version = 0
    this.stream = new ByteStream(bytes)
  }

  async decode () {
    this.lowID = this.stream.readLong()[1]
  }

  async process () {
    let account = await database.getIDAccount(this.lowID)
    let obtainedViaGetIDAccount = true
    
    if (!account) {
      account = await database.getAccount(this.session.player)
      this.session.player.lowID = account.lowID
      obtainedViaGetIDAccount = false
    }

    // Загружаем клуб прямо здесь
    let clubData = null
    if (account.ClubID > 0) {
      try {
        clubData = await database.getClubByID(account.ClubID)
        console.log(`[Profile] Loaded club: ${clubData ? clubData.clubName : 'not found'}`)
      } catch (error) {
        console.error("[Profile] Error loading club:", error)
        clubData = null
      }
    }

    new PlayerProfileMessage(this.session, account, clubData, obtainedViaGetIDAccount).send()
  }
}

module.exports = GetPlayerProfileMessage