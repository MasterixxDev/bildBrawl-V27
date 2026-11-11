const PiranhaMessage = require('../PiranhaMessage');
const database = require('../../db/PlayerManager');
const LoginFailedMessage = require('../Messages/Server/Auth/LoginFailedMessage');

class LogicBrawlPassTokensCommand extends PiranhaMessage {
    constructor(bytes, session) {
        super(bytes);
        this.session = session;
        this.commandID = 536;
        this.version = 0;
    }

    decode() {}

    async process() {
        const account = await database.getAccount(this.session.player);
        
        if (account.Gems < 30) {
            console.log(`[536] ❌ Недостаточно гемов! Нужно: 30, есть: ${account.Gems}`);
            return new LoginFailedMessage(
                this.session,
                `❌ Недостаточно гемов! Нужно: 30, есть: ${account.Gems}`,
                1
            ).send();
        }

        const currentTokens = account.BPToken || 0;
        let tokensToAdd = 75;
        
        if (currentTokens >= 25850) tokensToAdd = 650;
        else if (currentTokens >= 19250) tokensToAdd = 600;
        else if (currentTokens >= 16500) tokensToAdd = 550;
        else if (currentTokens >= 6500) tokensToAdd = 500;
        else if (currentTokens >= 900) tokensToAdd = 400;
        else if (currentTokens >= 600) tokensToAdd = 300;
        else if (currentTokens >= 400) tokensToAdd = 200;
        else if (currentTokens >= 250) tokensToAdd = 150;
        else if (currentTokens >= 150) tokensToAdd = 100;
        
        account.Gems -= 30;
        account.BPToken = currentTokens + tokensToAdd;
        
        console.log(`[536] 💎 Списано 30 гемов (осталось ${account.Gems})`);
        console.log(`[536] 🎫 Добавлено ${tokensToAdd} токенов (стало ${account.BPToken})`);
        
        await database.replaceValue(this.session.player.token, 'BPToken', account.BPToken);
        await database.replaceValue(this.session.player.token, 'Gems', account.Gems);
    }
}

module.exports = LogicBrawlPassTokensCommand;
