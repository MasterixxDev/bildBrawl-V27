const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")

const MyClubMessage = require("../../Server/Auth/MyClubMessage");
const AllianceResponseMessage = require("../../Server/Auth/AllianceResponseMessage");
const AllianceDataMessage = require("../../Server/Auth/AllianceDataMessage");
const database = require("../../../../db/PlayerManager")

class CreateClubMessage extends PiranhaMessage {
  constructor (bytes, session) {
    super(session)
    this.session = session
    this.id = 14301
    this.version = 0
    this.stream = new ByteStream(bytes)
  }

  async decode () {
    this.Name = this.stream.readString();
    this.Description = this.stream.readString();
    this.BadgeIdentifier = this.stream.readVInt();
    this.BadgeID = this.stream.readVInt();
    this.RegionIdentifier = this.stream.readVInt();
    this.RegionID = this.stream.readVInt();
    this.Type = this.stream.readVInt();
    this.Trophiesneeded = this.stream.readVInt();
    this.FriendlyFamily = this.stream.readVInt();
  }
  
  async process () {
    const player = this.session.player;
    
    try {
        const db = database.getDB();
        const account = await database.getAccount(player);
        
        if (!account) {
            console.error("Данные игрока не найдены");
            return;
        }

        const newClub = await database.createClub(db, {
            name: this.Name,
            badgeID: this.BadgeID,
            type: this.Type,
            trophiesNeeded: this.Trophiesneeded,
            region: this.getRegionString(this.RegionID),
            description: this.Description,
            leader: {
                lowID: account.lowID,
                trophies: account.Trophies || 0,
                name: account.Name || account.name || 'Player',
                exp: account.Experience || 0,
                icon: account.Thumbnail || 0,
                nameColor: account.Namecolor || 0
            }
        });

        await database.replaceValue(this.session.player.token, 'ClubID', newClub.clubLowID);
        await database.replaceValue(this.session.player.token, 'ClubRole', 2);
        player.ClubID = newClub.clubLowID;
        player.ClubRole = 2;

        const clubData = {
            ...newClub,
            data: {
                Type: this.Type,
                Trophiesneeded: this.Trophiesneeded,
                FriendlyFamily: this.FriendlyFamily,
                Description: this.Description
            }
        };

        new MyClubMessage(this.session, clubData, false).send();
        new AllianceDataMessage(this.session, clubData, newClub.members).send();
        new AllianceResponseMessage(this.session, 20).send();

    } catch (error) {
        console.error("Ошибка:", error);
    }
  }

  getRegionString(regionID) {
    const regions = {
      0: "RU",
      1: "EU", 
      2: "US",
      3: "AS",
    };
    return regions[regionID] || "RU";
  }
}

module.exports = CreateClubMessage