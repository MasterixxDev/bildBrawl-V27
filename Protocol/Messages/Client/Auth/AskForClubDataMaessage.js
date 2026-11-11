const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")
const database = require("../../../../db/PlayerManager")
const AllianceDataMessage = require('../../Server/Auth/AllianceDataMessage')

class AskForClubDataMessage extends PiranhaMessage {
  constructor (bytes, session) {
    super(session)
    this.session = session
    this.id = 14302
    this.version = 0
    this.stream = new ByteStream(bytes)
  }

  async decode () {
    this.stream.readInt();
    this.LowID = this.stream.readInt();
  }

  async process () {
    try {
      const db = database.getDB();
      const club = await database.getClub(db, this.LowID);
      
      if (!club) {
        return;
      }

      // Получаем данные всех участников клуба (как в рабочей версии)
      const membersData = await Promise.all(
        club.members.map(member => database.getIDAccount(member.lowID))
      );

      // Подготавливаем данные клуба в правильной структуре
      const clubData = {
        clubID: club.clubLowID,
        Name: club.clubName,
        Trophies: club.clubtrophies || 0,
        Description: club.clubdescription || "",
        BadgeID: club.clubbadgeID || 1,
        Region: club.clubregion || "RU",
        members: club.members,
        data: {
            Type: club.clubtype || 1,
            Trophiesneeded: club.clubtrophiesneeded || 0,
            FriendlyFamily: club.clubfriendlyfamily || 0,
            Description: club.clubdescription || ""
        }
      };

      // Отправляем AllianceDataMessage как в рабочей версии
      new AllianceDataMessage(this.session, clubData, membersData).send();
      console.log(`AllianceDataMessage отправлен для клуба: ${club.clubName}`);

    } catch (error) {
      console.error("Ошибка в AskForClubDataMessage:", error);
    }
  }
}

module.exports = AskForClubDataMessage