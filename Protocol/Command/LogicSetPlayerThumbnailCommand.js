const PiranhaMessage = require('../PiranhaMessage');
const ByteStream = require("../../ByteStream");
const database = require('../../db/PlayerManager')

class LogicSetPlayerThumbnailCommand extends PiranhaMessage{
    constructor(bytes, session){
        super(bytes)
        this.session = session;
        this.commandID = 505
        this.version = 0
        this.stream = new ByteStream(bytes)

    }

    decode(self){
        for (let i of Array(10).keys()){this.stream.readVInt()}   
        this.session.Thumbnail = this.stream.readVInt()
    }
    
    async process() {
        const account = await database.getAccount(this.session.player)
        
        await database.replaceValue(account.token, 'Thumbnail', this.session.Thumbnail);
    }
}

module.exports = LogicSetPlayerThumbnailCommand;