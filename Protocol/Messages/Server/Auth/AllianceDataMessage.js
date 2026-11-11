const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")
const Alliance = require("../../../../Utils/Entry/Alliance");

class AllianceDataMessage extends PiranhaMessage {
  constructor(session, club, members) {
    super(session)
    this.id = 24301
    this.session = session
    this.version = 1
    this.club = club
    this.members = members
  }

  async encode() {
    this.stream = new ByteStream()
    
    const isInClub = this.session.player.ClubID === this.club.clubLowID;
    this.stream.writeBoolean(isInClub);
    
    new Alliance().encode(this.stream, this.club, this.members);
  }
}

module.exports = AllianceDataMessage;