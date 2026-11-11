const AllianceHeader = require("./AllianceHeader");
const AllianceMember = require("./AllianceMember");

class Alliance {
  encode(stream, club, members) {
    console.log("Alliance.encode: данные клуба", {
      name: club.Name || club.clubName,
      id: club.clubID || club.clubLowID,
      hasData: !!club.data
    });
    
    new AllianceHeader().encode(stream, club);
    stream.writeString(club.data?.Description || club.clubdescription || "");
    stream.writeVInt(members.length);
    
    const currentTime = new Date();
    members.forEach(member => {
      new AllianceMember().encode(stream, member, currentTime);
    });
  }
}

module.exports = Alliance;