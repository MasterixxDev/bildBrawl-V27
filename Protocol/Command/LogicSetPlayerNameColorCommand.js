const PiranhaMessage = require('../PiranhaMessage');
const ByteStream = require("../../ByteStream");
const database = require('../../db/PlayerManager');
const LoginFailedMessage = require("../Messages/Server/Auth/LoginFailedMessage");

class LogicSetPlayerNameColorCommand extends PiranhaMessage {
    constructor(bytes, session) {
        super(bytes);
        this.session = session;
        this.commandID = 527;
        this.version = 0;
        this.stream = new ByteStream(bytes);
    }

    decode(self) {
        for (let i of Array(10).keys()) {
            this.stream.readVInt();
        }
        this.session.Namecolor = this.stream.readVInt();
    }

    async process() {
        const account = await database.getAccount(this.session.player);
        
        if (account.Vip === 0 && (this.session.Namecolor >= 11 && this.session.Namecolor <= 17)) {
            
            this.session.Namecolor = 1; 
            await database.replaceValue(account.token, 'Namecolor', this.session.Namecolor);
            
            return new LoginFailedMessage(this.session, "У тебя нет VIP! Купи VIP, чтобы использовать этот цвет.", 1).send();
        }

        await database.replaceValue(account.token, 'Namecolor', this.session.Namecolor);
    }
}

module.exports = LogicSetPlayerNameColorCommand;