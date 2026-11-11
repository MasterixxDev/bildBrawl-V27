class AllianceMember {
  encode(stream, member, currentTime) {

    if (!member) {
      member = {
        Name: 'кокк',
        lowID: 27813,
        role: 1,
        Trophies: 28,
        Thumbnail: 0,
        Namecolor: 0
      };
    }
    
    stream.writeInt(member.highID || 0);
    stream.writeInt(member.lowID || 0);
    stream.writeVInt(member.role || 1);
    stream.writeVInt(member.Trophies || 28);
    
    stream.writeVInt(member.status || 2);
    stream.writeVInt(member.statusTimer || 0);
    stream.writeVInt(0); // Unknown
    
    this.encodePlayerDisplayData(stream, member);
    
  }
  
  encodePlayerDisplayData(stream, data) {
    const name = data.Name;
    
    stream.writeString(name);
    stream.writeVInt(100);
    stream.writeVInt(28000000 + (data.Thumbnail || 0));
    stream.writeVInt(43000000 + (data.Namecolor || 0));
    
  }
}

module.exports = AllianceMember;