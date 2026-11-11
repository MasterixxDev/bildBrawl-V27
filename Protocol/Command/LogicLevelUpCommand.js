const PiranhaMessage = require('../PiranhaMessage')
const ByteStream = require("../../ByteStream")
const database = require("../../db/PlayerManager")

class LogicLevelUpCommand extends PiranhaMessage{
    constructor(bytes, session){
        super(bytes)
        this.session = session;
        this.commandID = 520
        this.version = 0        
        this.stream = new ByteStream(bytes);

    }

    decode(self){
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.brawlerID = this.stream.readVInt()

    }

    async process(){
        const account = await database.getAccount(this.session.player)
        const targetBrawler = account.Brawlers.find(brawler => brawler.id === this.brawlerID);
        const goldCostPerLevel = [0, 20, 35, 75, 140, 290, 480, 800, 1250];
        if (targetBrawler.level < goldCostPerLevel.length - 1) {
            const goldCost = goldCostPerLevel[targetBrawler.level + 1];
            targetBrawler.level = targetBrawler.level + 1
            database.replaceValue(this.session.player.token, 'Gold', account.Gold - goldCost);// Give
            database.replaceValue(this.session.player.token, 'Brawlers', account.Brawlers);// Give
        }
} 
}
module.exports = LogicLevelUpCommand