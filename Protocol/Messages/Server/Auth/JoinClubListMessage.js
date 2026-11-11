const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")
const database = require("../../../../db/PlayerManager")

class JoinClubListMessage extends PiranhaMessage {
  constructor(session, clubs) {
    super(session)
    this.id = 24304 // 0x5ef0
    this.session = session
    this.clubs = clubs || []
    this.version = 1
  }

  async encode() {
    this.stream = new ByteStream()
    
    this.stream.writeVInt(this.clubs.length);
    
    for (const club of this.clubs) {
      this.stream.writeInt(0x0); // HighID
      this.stream.writeInt(club.clubID); // LowID
      this.stream.writeString(club.Name); // Name
      this.stream.writeVInt(0x8); // Badge type
      this.stream.writeVInt(club.BadgeID); // Badge ID
      this.stream.writeVInt(club.Type); // Type
      this.stream.writeVInt(club.members.length); // Members count
      this.stream.writeVInt(club.Trophies); // Trophies
      this.stream.writeVInt(club.Trophiesneeded); // Trophies needed
      this.stream.writeVInt(0x0); // Unknown
      this.stream.writeString('RU'); // Region
      this.stream.writeVInt(club.members.length); // Online members
      this.stream.writeVInt(0) //family club 
    }
    
    console.log(`JoinClubListMessage отправлен`);
  }
}

module.exports = JoinClubListMessage