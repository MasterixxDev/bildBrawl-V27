const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")

const AllianceResponseMessage = require("../../Server/Auth/AllianceResponseMessage");
const database = require("../../../../db/PlayerManager")
const MyClubMessage = require("../../Server/Auth/MyClubMessage");

class LeaveClubMessage extends PiranhaMessage {
  constructor (bytes, session) {
    super(session)
    this.session = session
    this.id = 14308
    this.version = 1
    this.stream = new ByteStream(bytes)
  }

  async decode () {
    // not decode
  }
  
  async process () {
    const player = this.session.player;
    
    try {
      if (!player.ClubID || player.ClubID === 0) {
        console.log("Игрок не в клубе");
        return;
      }

      const db = database.getDB();
      const club = await database.getClub(db, player.ClubID);

      if (!club) {
        console.log("Клуб не найден");
        return;
      }

      // Удаляем игрока из members клуба
      const initialMemberCount = club.members.length;
      club.members = club.members.filter(member => member.lowID !== player.lowID);
      
      // Пересчитываем трофеи клуба
      club.clubtrophies = club.members.reduce((sum, m) => sum + (m.trophies || 0), 0);

      if (club.members.length === 0) {
        // Если клуб пустой - удаляем его
        const clubsCollection = db.collection("clubs");
        await clubsCollection.deleteOne({ clubLowID: player.ClubID });
        console.log(`Клуб ${club.clubName} (ID: ${player.ClubID}) удален, так как он пустой`);
      } else {
        // Обновляем клуб в базе
        const clubsCollection = db.collection("clubs");
        await clubsCollection.updateOne(
          { clubLowID: player.ClubID },
          { 
            $set: { 
              members: club.members,
              clubtrophies: club.clubtrophies
            } 
          }
        );
        console.log(`Игрок ${player.Name} вышел из клуба ${club.clubName}. Осталось участников: ${club.members.length}`);
      }

      // Обновляем данные игрока
      await database.replaceValue(player.token, 'ClubID', 0);
      await database.replaceValue(player.token, 'ClubRole', 0);
      
      // Обновляем сессию
      player.ClubID = 0;
      player.ClubRole = 0;

      // Отправляем пакеты
      new AllianceResponseMessage(this.session, 80).send();
      new MyClubMessage(this.session, null, true).send();

      console.log(`Игрок ${player.Name} успешно вышел из клуба`);

    } catch (error) {
      console.error("Ошибка при выходе из клуба:", error);
    }
  }
}

module.exports = LeaveClubMessage