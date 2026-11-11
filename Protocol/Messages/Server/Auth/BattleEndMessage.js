const PiranhaMessage = require("../../../PiranhaMessage");
const ByteStream = require("../../../../ByteStream");
const PlayerDisplayData = require("../../Wrappers/PlayerDisplayData");
const database = require("../../../../db/PlayerManager");
const {
  calculateShowdown,
  calculateDuoShowdown,
  calculateGemGrab
} = require("./TrophiesData");

class BattleEndMessage extends PiranhaMessage {
  constructor(session, battle_result, playerArray, rank, account, game, vip, mapID) {
    super(session);
    this.id = 23456;
    this.session = session;
    this.version = 1;
    this.battle_result = battle_result;
    this.playerArray = playerArray;
    this.rank = rank;
    this.account = account;
    this.game = game;
    this.vip = vip;
    this.mapID = mapID;
    this.stream = new ByteStream();
    this.newTokensDoublerValue = 0;
  }

  async encode() {
    const Brawler = this.account.Brawlers.find(brawler => brawler.id === this.account.BrawlerID);
    
    if (!Brawler) {
      console.error(`Brawler with ID ${this.account.BrawlerID} not found!`);
      return;
    }

    Brawler.trophies = parseInt(Brawler.trophies) || 0;

    let tokenGained = 0;
    let trophyChange = 0;
    let experienceGained = 0;
    let trioWins = 0;
    let soloWins = 0;
    let duoWins = 0;
    let doubledTokens = 0;
    let isShowdown = false;
    let isGemGrab = false;
    
    let remainingTokensDoubler = this.account.TokensDoubler || 0;

    if (this.game === 1) {
      tokenGained += Math.floor(Math.random() * 50);
      trophyChange = calculateGemGrab(Math.round(Brawler.trophies), this.battle_result);
      isGemGrab = true;
    } else if (this.game === 5) {
      tokenGained += Math.floor(Math.random() * 60);
      trophyChange = calculateDuoShowdown(Math.round(Brawler.trophies), this.rank);
      isShowdown = true;
    } else if (this.game === 2) {
      tokenGained += Math.floor(Math.random() * 40);
      trophyChange = calculateShowdown(Math.round(Brawler.trophies), this.rank);
      isShowdown = true;
    }

    if (trophyChange === null || trophyChange === undefined) {
      trophyChange = 0;
    }

    if (this.vip) {
      tokenGained += Math.floor(Math.random() * 50);
      trophyChange += 8;
    }

    if (trophyChange > 0) {
      if (this.game === 2) {
        soloWins = 1;
      } else if (this.game === 5) {
        duoWins = 1;
      } else {
        trioWins = 1;
      }
    }

    if (remainingTokensDoubler > 0 && tokenGained > 0) {
      doubledTokens = Math.min(tokenGained, remainingTokensDoubler);
      remainingTokensDoubler -= doubledTokens;
    }

    if (this.vip) {
      tokenGained *= 2;
    }

    const totalTokens = tokenGained + doubledTokens;

    this.account.BPToken = (this.account.BPToken || 0) + totalTokens;
    this.account.Experience = (this.account.Experience || 0) + experienceGained;
    this.account.TrioWINS = (this.account.TrioWINS || 0) + trioWins;
    this.account.SoloWINS = (this.account.SoloWINS || 0) + soloWins;
    this.account.TokensDoubler = remainingTokensDoubler;
    Brawler.trophies = Math.round(Brawler.trophies) + trophyChange;

    // ===== ЛОГИКА КВЕСТОВ =====
    if (this.account.quests && this.account.quests.length > 0) {
      const completedQuests = [];
      let rewardEarned = 0;

      for (const quest of this.account.quests) {
        let progressAdd = 0;

        const brawlerMatch = quest.BrawlerID === -1 || quest.BrawlerID === this.account.BrawlerID;
        let gameMatch = false;

        if (quest.gamemode === -1) {
          gameMatch = true;
        } else if (quest.gamemode === 6 && isShowdown) {
          gameMatch = true;
        } else if (quest.gamemode === 0 && isGemGrab) {
          gameMatch = true;
        }

        if (brawlerMatch && gameMatch) {
          if (trophyChange > 0) {
            progressAdd = 1;
          }
        }

        if (progressAdd > 0) {
          quest.goal = (quest.goal || 0) + progressAdd;

          if (quest.goal >= quest.target) {
            completedQuests.push(quest);
            rewardEarned += quest.reward || 0;
          }
        }
      }

      this.account.quests = this.account.quests.filter(q => !completedQuests.includes(q));

      if (rewardEarned > 0) {
        this.account.BPToken = (this.account.BPToken || 0) + rewardEarned;
        this.account.Experience = (this.account.Experience || 0) + rewardEarned;
      }
    }

    this.stream.writeVInt(this.game);
    this.stream.writeVInt((this.game === 2 || this.game === 5) ? this.rank : this.battle_result);
    this.stream.writeVInt(tokenGained);
    this.stream.writeVInt(trophyChange);
    this.stream.writeVInt(0);

    this.stream.writeVInt(doubledTokens);
    this.stream.writeVInt(0);
    this.stream.writeVInt(remainingTokensDoubler);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);

    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(16);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);

    const ingame = this.game === 5 ? 1 : this.playerArray.length;
    this.stream.writeVInt(1 + ingame);
    this.stream.writeVInt(1);

    this.stream.writeDataReference(16, this.account.BrawlerID);
    this.stream.writeDataReference(29, this.account.SkinID);
    this.stream.writeVInt(Brawler.trophies - trophyChange);
    this.stream.writeVInt(Brawler.trophies);
    this.stream.writeVInt(Brawler.level + 1);
    this.stream.writeBoolean(true);
    this.stream.writeInt(0);
    this.stream.writeInt(this.account.lowID);
    new PlayerDisplayData(this.stream, this.account.Name, this.account.Thumbnail, this.account.Namecolor).encode();

    for (let i = 0; i < ingame; i++) {
      this.stream.writeVInt(this.playerArray[i]['Team'] === 1 ? 2 : 0);
      this.stream.writeDataReference(16, this.playerArray[i]['brawlerID']);
      this.stream.writeDataReference(29, this.playerArray[i]['skinID'] || 0);
      this.stream.writeVInt(Brawler.trophies * 0.50);
      this.stream.writeVInt(Brawler.trophies * 0.50);
      this.stream.writeVInt(Brawler.level);
      this.stream.writeBoolean(false);
      new PlayerDisplayData(this.stream, this.playerArray[i]['name'], 0, 0).encode();
    }

    let experience = Math.floor(Math.random() * 40);
    this.stream.writeVInt(1);
    this.stream.writeVInt(this.battle_result);
    this.stream.writeVInt(experience);
    
    this.stream.writeVInt(0);

    this.stream.writeVInt(2);
    this.stream.writeVInt(1);
    this.stream.writeVInt(Brawler.trophies - trophyChange);
    this.stream.writeVInt(Brawler.trophies);
    this.stream.writeVInt(5);
    this.stream.writeVInt(this.account.Experience - experience);
    this.stream.writeVInt(this.account.Experience - experience);

    this.stream.writeDataReference(28, 0);
    this.stream.writeBoolean(false);

    try {
      const db = database.getDB();
      const accountsCollection = db.collection("acc");
      
      await accountsCollection.updateOne(
        { lowID: this.account.lowID },
        {
          $set: {
            BPToken: this.account.BPToken,
            Experience: this.account.Experience + experience,
            TrioWINS: this.account.TrioWINS,
            SoloWINS: this.account.SoloWINS,
            TokensDoubler: this.account.TokensDoubler,
            Brawlers: this.account.Brawlers,
            quests: this.account.quests
          }
        }
      );
    } catch (error) {
      console.error("Database update error:", error);
    }
  }
}

module.exports = BattleEndMessage;