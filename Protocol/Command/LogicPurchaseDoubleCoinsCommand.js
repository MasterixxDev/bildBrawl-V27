const PiranhaMessage = require('../PiranhaMessage');
const ByteStream = require("../../ByteStream");
const database = require('../../db/PlayerManager');
const LoginFailedMessage = require('../Messages/Server/Auth/LoginFailedMessage');

class LogicPurchaseDoubleCoinsCommand extends PiranhaMessage {
    constructor(bytes, session) {
        super(bytes);
        this.session = session;
        this.commandID = 509;
        this.version = 0;
        this.stream = new ByteStream(bytes);
    }

    decode() {}

    async process() {
        const account = await database.getAccount(this.session.player);
        
        if (account.Gems < 50) {
            console.log(`[509] ❌ Недостаточно гемов! Нужно: 50, есть: ${account.Gems}`);
            return new LoginFailedMessage(
                this.session,
                `❌ Недостаточно гемов! Нужно: 50, есть: ${account.Gems}`,
                1
            ).send();
        }
        
        account.Gems -= 50;
        account.TokensDoubler = (account.TokensDoubler || 0) + 1000;
        
        console.log(`[509] 💎 Списано 50 гемов (осталось ${account.Gems})`);
        console.log(`[509] 🎫 Добавлено 1000 удвоителей (стало ${account.TokensDoubler})`);
        
        await database.replaceValue(account.token, 'TokensDoubler', account.TokensDoubler);
        await database.replaceValue(account.token, 'Gems', account.Gems);
    }
}

module.exports = LogicPurchaseDoubleCoinsCommand;
