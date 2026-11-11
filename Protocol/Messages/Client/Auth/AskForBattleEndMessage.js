const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")
const BattleEndMessage = require('../../Server/Auth/BattleEndMessage')
const database = require("../../../../db/PlayerManager")
const fs = require('fs').promises;

class AskForBattleEndMessage extends PiranhaMessage {
  constructor (bytes, session) {
    super(session)
    this.session = session
    this.id = 14110
    this.version = 0
    this.stream = new ByteStream(bytes)
    this.nicknames = ["t.me/Jevil_Brawl"];
  }

  async decode () {
    this.battle_result = this.stream.readVInt();
    this.stream.readVInt();
    this.rank = this.stream.readVInt();
    this.mapID = this.stream.readDataReference()[1];

    this.playersAmount = this.stream.readVInt();
    this.fields = [];

    this.stream.readVInt(); // Brawler CsvID
    this.stream.readVInt(); // Selected Brawler
    this.stream.readVInt(); // Skin CsvID
    this.stream.readVInt(); // Selected Skin
    this.stream.readVInt(); // red or blue
    this.stream.readVInt();
    this.EndName = this.stream.readString(); // your name
    
    for (let j = 1; j < this.playersAmount; j++) {
      this.filds = {}

      const k = Math.floor(Math.random() * this.nicknames.length);
      this.filds.name = this.nicknames[k];
      this.nicknames.splice(k, 0x1);

      this.stream.readVInt();
      this.filds.brawlerID = this.stream.readVInt();
      this.filds.skinID = this.stream.readVInt();
      
      if(this.fields.length >= 2){
        this.filds.Team = 1;
        this.stream.readVInt();
      }else{
        this.filds.Team = this.stream.readVInt();
      }
      
      this.stream.readVInt(); //Unknown
      this.stream.readString() //Name
      this.fields.push(this.filds)
    }
  }

  async process () {
    this.session.trophiesnew = 0;
    this.session.tokengained = 0;

    const account = await database.getAccount(this.session.player);

    let game;
    if (this.playersAmount === 10 && this.fields[0] && this.fields[0].Team === 0) {
        game = 5; // Duo Showdown
    
    } else if (this.playersAmount === 6) {
        game = 1; // 3x3
    } else if (this.playersAmount === 10) {
        game = 2; // Solo Showdown
    } else {
        game = 1; // По умолчанию 3x3
    }

    let vip = account.Vip === 1;

    this.playerArray = this.fields.map((field, index) => ({
      id: index + 1,
      name: field.name,
      brawlerID: field.brawlerID,
      skinID: field.skinID || 0,
      Team: field.Team || 0
    }));

    if (this.playerArray.length < this.playersAmount - 1) {
      const availableNicknames = [...this.nicknames];
      
      function getRandomUniqueNickname() {
        if (availableNicknames.length === 0) {
          return "BotPlayer";
        }
        const randomIndex = Math.floor(Math.random() * availableNicknames.length);
        return availableNicknames.splice(randomIndex, 1)[0];
      }

      for (let i = this.playerArray.length; i < this.playersAmount - 1; i++) {
        const playerRecord = {
          id: i + 1,
          name: getRandomUniqueNickname(),
          brawlerID: Math.floor(Math.random() * 26),
          skinID: 0,
          Team: i % 2 // Чередование команд
        };
        this.playerArray.push(playerRecord);
      }
    }

    new BattleEndMessage(
      this.session, 
      this.battle_result, 
      this.playerArray, 
      this.rank, 
      account, 
      game, 
      vip, 
      this.mapID
    ).send();

    await database.replaceValue(this.session.player, "lastGame", new Date());
  }
}

module.exports = AskForBattleEndMessage