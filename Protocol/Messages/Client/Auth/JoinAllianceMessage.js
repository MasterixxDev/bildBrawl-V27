const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")

const AllianceResponseMessage = require("../../Server/Auth/AllianceResponseMessage");
const database = require("../../../../db/PlayerManager")

const MyClubMessage = require("../../Server/Auth/MyClubMessage");

class JoinAllianceMessage extends PiranhaMessage {
  constructor (bytes, session) {
    super(session)
    this.session = session
    this.id = 14305
    this.version = 0
    this.stream = new ByteStream(bytes)
  }

  async decode () {
    this.stream.readInt() // HighID
    this.clubID = this.stream.readInt() // LowID
  }
  
  async process () {
    const account = await database.getAccount(this.session.player)

    if (account.ClubID > 0 && account.ClubID !== this.clubID) {
      try {
        console.log(`Выход из старого клуба ${account.ClubID}`)
        await database.leaveClub(database.getDB(), account.ClubID, this.session.player.lowID)
        await database.replaceValue(this.session.player.token, 'ClubID', 0)
        await database.replaceValue(this.session.player.token, 'ClubRole', 0)
      } catch (error) {
        console.log(`Ошибка выхода: ${error.message}`)
        new AllianceResponseMessage(this.session, 42).send()
        return
      }
    }

    if (account.ClubID === this.clubID) {
      new AllianceResponseMessage(this.session, 40).send()
      
      const club = await database.getClub(database.getDB(), this.clubID)
      if (club) {
        new MyClubMessage(this.session, club, false).send()
      }
      return
    }

    try {
      const club = await database.getClub(database.getDB(), this.clubID)
      if (!club) {
        new AllianceResponseMessage(this.session, 42).send()
        return
      }

      if (this.session.player.Trophies < club.clubtrophiesneeded) {
        new AllianceResponseMessage(this.session, 42).send()
        return
      }

      if (club.members.length >= 100) {
        new AllianceResponseMessage(this.session, 42).send()
        return
      }

      const db = database.getDB()
      const clubsCollection = db.collection('clubs')
      
      const newMember = {
        lowID: this.session.player.lowID,
        role: 1,
        trophies: this.session.player.Trophies,
        name: this.session.player.Name,
        experience: this.session.player.Experience,
        icon: this.session.player.Thumbnail,
        nameColor: this.session.player.Namecolor,
        state: 2
      }

      await clubsCollection.updateOne(
        { clubLowID: this.clubID },
        { 
          $push: { members: newMember },
          $inc: { clubtrophies: this.session.player.Trophies }
        }
      )

      await database.replaceValue(this.session.player.token, 'ClubID', this.clubID)
      await database.replaceValue(this.session.player.token, 'ClubRole', 1)

      // Получаем обновленный клуб
      const updatedClub = await database.getClub(database.getDB(), this.clubID)

      new AllianceResponseMessage(this.session, 40).send()
      new MyClubMessage(this.session, updatedClub, false).send()


    } catch (error) {
      console.log(`Ошибка вступления: ${error.message}`)
      new AllianceResponseMessage(this.session, 42).send()
    }
  }
}

module.exports = JoinAllianceMessage