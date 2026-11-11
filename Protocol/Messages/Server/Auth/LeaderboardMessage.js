const PiranhaMessage = require("../../../PiranhaMessage");
const ByteStream = require("../../../../ByteStream");
const PlayerDisplayData = require('../../Wrappers/PlayerDisplayData');

class LeaderboardMessage extends PiranhaMessage {
  constructor (session, brawler, type, leaders) {
    super(session)
    this.id = 24403
    this.session = session
    this.brawler = brawler
    this.type = type
    this.leaders = leaders
    this.version = 1
    this.stream = new ByteStream()
  }

  async encode () {
    let x = 0;
    this.stream.writeVInt(this.type)// LeaderboardType

    if (this.type === 0){
      this.stream.writeVInt(0)
      this.stream.writeDataReference(16, this.brawler)
    } else {
      this.stream.writeVInt(0)
      this.stream.writeVInt(0)
    }

    this.stream.writeString("RU")// Region
    this.stream.writeVInt(this.leaders.length);

    if (this.type === 1) { // players
      this.leaders.forEach((leader, i) => {
        if (leader.lowID === this.session.player.lowID) {
          x = i + 1;
        }
        this.stream.writeVInt(0); // High ID
        this.stream.writeVInt(leader.lowID); // Low ID
        this.stream.writeVInt(1);
        this.stream.writeVInt(leader.Trophies); // Player Trophies
        this.stream.writeVInt(1);
        this.stream.writeString(""); // Club Name
        new PlayerDisplayData(this.stream, leader.Name, leader.Thumbnail, leader.Namecolor).encode();
        this.stream.writeVInt(0);
      });  
    } else if (this.type === 0) { // brawlers
      this.leaders.forEach((leader, i) => {
        if (leader.lowID === this.session.player.lowID) {
          x = i + 1;
        }
        this.stream.writeVInt(0);
        this.stream.writeVInt(leader.lowID); // Low ID
        this.stream.writeVInt(1);
        this.stream.writeVInt(leader.brawler.trophies);
        this.stream.writeVInt(1);
        this.stream.writeString("");
        new PlayerDisplayData(this.stream, leader.Name, leader.Thumbnail, leader.Namecolor).encode();
        this.stream.writeVInt(0);
      }); 
    } else if (this.type === 2) {
      this.leaders.forEach((club, i) => {
        if (this.session.player.ClubID === club.clubID) {
          x = i + 1;
        }
        this.stream.writeVInt(0);
        this.stream.writeVInt(club.clubID);
        this.stream.writeVInt(1);
        this.stream.writeVInt(club.Trophies);
        this.stream.writeVInt(2);
        this.stream.writeString(club.Name);
        this.stream.writeVInt(club.members.length);
        this.stream.writeDataReference(8, club.BadgeID);
        
      }); 
    }

    this.stream.writeVInt(this.session.player.Trophies || 0);
    this.stream.writeVInt(x);
    this.stream.writeVInt(this.type);
    this.stream.writeVInt(0);
    this.stream.writeString("RU");
  }
}

module.exports = LeaderboardMessage;