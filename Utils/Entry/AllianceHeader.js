class AllianceHeader {
  encode(stream, club) {

    stream.writeInt(0); // HighID
    stream.writeInt(club.clubID || club.clubLowID); // LowID
    stream.writeString(club.Name || club.clubName); // Name
    
    stream.writeVInt(8); // Badge type
    stream.writeVInt(club.BadgeID || club.clubbadgeID || 1); // Badge ID
    
    const clubType = club.data ? club.data.Type : (club.Type || club.clubtype || 1);
    const trophiesNeeded = club.data ? club.data.Trophiesneeded : (club.Trophiesneeded || club.clubtrophiesneeded || 0);
    const friendlyFamily = club.data ? club.data.FriendlyFamily : (club.clubfriendlyfamily || 0);
    
    stream.writeVInt(clubType); // Club type
    stream.writeVInt(club.members ? club.members.length : 0); // Member count
    
    stream.writeVInt(club.Trophies || club.clubtrophies || 0); // Total trophies
    stream.writeVInt(trophiesNeeded); // Required trophies
    
    stream.writeVInt(0); // Unknown
    stream.writeString(club.Region || club.clubregion || "RU"); // Region
    stream.writeVInt(0); // Unknown
    stream.writeVInt(friendlyFamily); // Family friendly
  }
}

module.exports = AllianceHeader;