const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")
const database = require("../../../../db/PlayerManager")
const MyClubMessage = require("../../Server/Auth/MyClubMessage")
const AllianceResponseMessage = require("../../Server/Auth/AllianceResponseMessage")

class ChangeClubSettingsMessage extends PiranhaMessage {
  constructor(bytes, session) {
    super(session)
    this.session = session
    this.id = 14316 // 0x37ec
    this.version = 0
    this.stream = new ByteStream(bytes)
  }

  async decode() {
    this.description = this.stream.readString()
    this.inf2 = this.stream.readVInt()
    this.badgeID = this.stream.readVInt()
    this.inf4 = this.stream.readVInt()
    this.regionID = this.stream.readVInt()
    this.type = this.stream.readVInt()
    this.requiredTrophies = this.stream.readVInt()
    this.FriendlyFamily = this.stream.readVInt()
  }

  async process() {
    const player = this.session.player

    // Проверяем права доступа (только лидер и заместители могут менять настройки)
    if (player.ClubRole === 1 || player.ClubRole === 0 || player.ClubRole === 3) {
      console.log(`Игрок ${player.Name} не имеет прав для изменения настроек клуба. Роль: ${player.ClubRole}`)
      return
    }

    try {
      const db = database.getDB()
      const club = await database.getClub(db, player.ClubID)

      if (!club) {
        console.log("Клуб не найден")
        return
      }

      // Обновляем настройки клуба
      const updatedClub = await database.clubUpdate(db, player.ClubID, {
        'Description': this.description,
        'BadgeID': this.badgeID,
        'Type': this.type,
        'Trophiesneeded': this.requiredTrophies,
        'FriendlyFamily': this.FriendlyFamily
      })

      // Подготавливаем данные клуба
      const clubData = {
        clubID: updatedClub.clubLowID,
        Name: updatedClub.clubName,
        Trophies: updatedClub.clubtrophies || 0,
        Description: updatedClub.clubdescription || "",
        BadgeID: updatedClub.clubbadgeID || 1,
        Region: updatedClub.clubregion || "RU",
        members: updatedClub.members,
        data: {
            Type: updatedClub.clubtype || 1,
            Trophiesneeded: updatedClub.clubtrophiesneeded || 0,
            FriendlyFamily: updatedClub.clubfriendlyfamily || 0,
            Description: updatedClub.clubdescription || ""
        }
      }

      // Отправляем пакеты
      new MyClubMessage(this.session, clubData, false).send()
      new AllianceResponseMessage(this.session, 10).send() // 0xa = 10

      console.log(`Настройки клуба "${club.clubName}" обновлены игроком ${player.Name}`)

    } catch (error) {
      console.error("Ошибка при изменении настроек клуба:", error)
    }
  }
}

module.exports = ChangeClubSettingsMessage