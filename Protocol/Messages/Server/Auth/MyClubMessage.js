const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")

class MyClubMessage extends PiranhaMessage {
  constructor(session, club, leave = false) {
    super(session)
    this.id = 24399
    this.session = session
    this.leave = leave
    this.version = 1
    this.club = club
  }

  async encode() {
    this.stream = new ByteStream()
    
    if (this.leave === false && this.club) {

      const membersCount = this.club.members ? this.club.members.length : 0;

      // НАХОДИМ РОЛЬ ИГРОКА ИЗ МАССИВА УЧАСТНИКОВ
      let playerRole = 1; // роль по умолчанию (участник)
      
      if (this.club.members) {
        const member = this.club.members.find(m => m.lowID === this.session.player.lowID);
        if (member) {
          playerRole = member.role;
          console.log(`[MyClubMessage] Found role ${playerRole} for player ${this.session.player.lowID}`);
        } else {
          console.log(`[MyClubMessage] Player ${this.session.player.lowID} not found in club members`);
        }
      }

      this.stream.writeVInt(membersCount);
      this.stream.writeVInt(1);
      this.stream.writeVInt(25);
      
      // ИСПОЛЬЗУЕМ РОЛЬ ИЗ МАССИВА УЧАСТНИКОВ
      this.stream.writeVInt(playerRole);

      // Club info
      this.stream.writeInt(0); // HighID
      this.stream.writeInt(this.club.clubID || this.club.clubLowID); // LowID
      this.stream.writeString(this.club.Name || this.club.clubName); // Name

      // Badge
      this.stream.writeVInt(8);
      this.stream.writeVInt(this.club.BadgeID || this.club.clubbadgeID || 1);

      // Club settings
      this.stream.writeVInt(this.club.data?.Type || this.club.clubtype || 1);
      this.stream.writeVInt(membersCount);

      // Club trophies
      this.stream.writeVInt(this.club.Trophies || this.club.clubtrophies || 0);
      this.stream.writeVInt(this.club.data?.Trophiesneeded || this.club.clubtrophiesneeded || 0);
      this.stream.writeVInt(0);

      this.stream.writeString(this.club.Region || this.club.clubregion || "RU");
      this.stream.writeVInt(0);
      this.stream.writeVInt(this.club.data?.FriendlyFamily || this.club.clubfriendlyfamily || 0);

      console.log(`MyClubMessage отправлен: ${this.club.Name || this.club.clubName}, роль игрока: ${playerRole}`);
    } else {
      this.stream.writeVInt(0);
      this.stream.writeVInt(0);
    }
  }
}

module.exports = MyClubMessage;