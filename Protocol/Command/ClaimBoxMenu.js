const PiranhaMessage = require('../PiranhaMessage');
const ByteStream = require("../../ByteStream");
const LogicBoxCommand = require('./LogicBoxCommand');
const database = require('../../db/PlayerManager');
const LoginFailedMessage = require('../Messages/Server/Auth/LoginFailedMessage');

class ClaimBoxMenu extends PiranhaMessage {
    constructor(bytes, session) {
        super(bytes);
        this.session = session;
        this.commandID = 500;
        this.version = 0;
        this.stream = new ByteStream(bytes);
    }

    decode() {
        this.a1 = this.stream.readVInt();
        this.a2 = this.stream.readVInt();
        this.a3 = this.stream.readVInt();
        this.a4 = this.stream.readVInt();
        this.a5 = this.stream.readVInt();
        this.a6 = this.stream.readVInt();
        this.a7 = this.stream.readVInt();
        this.a8 = this.stream.readVInt();
        this.a9 = this.stream.readVInt();
        this.a10 = this.stream.readVInt();
    }

    async process() {
        const account = await database.getAccount(this.session.player);
        let boxtype = 10;

        switch (this.a10) {
            case 5: // Box
                if (account.boxTokens < 100) {
                    return new LoginFailedMessage(this.session, `❌ Недостаточно токенов!`, 1).send();
                }
                account.boxTokens -= 100;
                await database.replaceValue(account.token, 'boxTokens', account.boxTokens);
                boxtype = 10;
                break;

            case 4: // BigBox
                if (account.BigBoxTokens < 10) {
                    return new LoginFailedMessage(this.session, `❌ Недостаточно больших токенов!`, 1).send();
                }
                account.BigBoxTokens -= 10;
                await database.replaceValue(account.token, 'BigBoxTokens', account.BigBoxTokens);
                boxtype = 12;
                break;

            case 3: // MEGA за гемы
                if (account.Gems < 80) {
                    return new LoginFailedMessage(this.session, `❌ Недостаточно гемов! Нужно: 80, есть: ${account.Gems}`, 1).send();
                }
                account.Gems -= 80;
                await database.replaceValue(account.token, 'Gems', account.Gems);
                boxtype = 11;
                break;

            case 1: // BigBox за гемы
                if (account.Gems < 30) {
                    return new LoginFailedMessage(this.session, `❌ Недостаточно гемов! Нужно: 30, есть: ${account.Gems}`, 1).send();
                }
                account.Gems -= 30;
                await database.replaceValue(account.token, 'Gems', account.Gems);
                boxtype = 12;
                break;
        }

        new LogicBoxCommand(this.session, boxtype, account, 1, false).send();
    }
}

module.exports = ClaimBoxMenu;
