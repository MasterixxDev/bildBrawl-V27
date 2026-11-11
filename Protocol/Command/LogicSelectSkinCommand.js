const PiranhaMessage = require('../PiranhaMessage')
const ByteStream = require("../../ByteStream")
const database = require("../../db/PlayerManager")

const LoginFailedMessage = require("../Messages/Server/Auth/LoginFailedMessage");

class LogicSelectSkinCommand extends PiranhaMessage{
    constructor(bytes, session){
        super(bytes)
        this.session = session;
        this.commandID = 506
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
        this.skinID = this.stream.readVInt();
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.BrawlerID = this.stream.readVInt();
    }

    async process(){
        const account = await database.getAccount(this.session.player)
        const Brawler = account.Brawlers.find(brawler => brawler.id === this.BrawlerID);
        if(Brawler.unlocked){
            this.session.BrawlerID = this.BrawlerID
            await database.replaceValue(account.token, 'SkinID', this.skinID);
            await database.replaceValue(account.token, 'BrawlerID', this.BrawlerID);
        }else{
            return new LoginFailedMessage(this.session, `Произошла ошибка 506. Перезайдите в игру`, 1).send();

        }
    }
}
module.exports = LogicSelectSkinCommand