const database = require("../db/PlayerManager");

class Quests {
    constructor(account) {
        this.account = account;
    }

    encode(stream) {
        this.stream = stream;

        const quests = this.account.quests || [];
        this.stream.writeVInt(quests.length);

        for (let i = 0; i < quests.length; i++) {
            const quest = quests[i]; 

            this.stream.writeVInt(0); //unk
            this.stream.writeVInt(0); //unk

            this.stream.writeVInt(quest.MissionType || 0); //mission type
            this.stream.writeVInt(quest.goal || 0); //quest goal
            this.stream.writeVInt(quest.target || 0); //skok raz убить, исцелить, выиграть

            this.stream.writeVInt(quest.reward || 0); //token reward!!!!
            this.stream.writeVInt(0); //unk
            this.stream.writeVInt(0); //unk

            this.stream.writeVInt(0); //quest timer

            this.stream.writeBoolean(false); // unknown
            this.stream.writeBoolean(false); // quest type. false - free pass, true - brawl pass

            this.stream.writeDataReference(16, quest.BrawlerID || 0) //brawlerID for quest

            this.stream.writeVInt(quest.gamemode || -1); //game mode variation
            this.stream.writeVInt(0); //unk
        }
    }
}

module.exports = Quests;