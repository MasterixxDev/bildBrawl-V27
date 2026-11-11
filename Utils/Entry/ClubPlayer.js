const PlayerDisplayData = require('./PlayerDisplayData');

class AllianceMember {
  encode(stream, member, currentTime) {
    stream.writeInt(member.highID || 0); // HighID
    stream.writeInt(member.lowID || 0); // LowID
    stream.writeVInt(member.role || 0); // ClubRole
    stream.writeVInt(member.trophies || 0); // Trophies
    
    // Player status and timer
    stream.writeVInt(member.status || 2); // Player state
    stream.writeVInt(member.statusTimer || 0); // State timer
    
    stream.writeVInt(0); // Unknown
    
    // Player display data using your existing class
    new PlayerDisplayData(
      stream, 
      member.name || 'Unknown',
      member.icon || 0,
      member.nameColor || 0
    ).encode();
  }
}

module.exports = AllianceMember;