const PiranhaMessage = require('../PiranhaMessage');
const database = require('../../db/PlayerManager');
const LoginFailedMessage = require('../Messages/Server/Auth/LoginFailedMessage');

class LogicPurchaseBrawlPassCommand extends PiranhaMessage {
    constructor(bytes, session) {
        super(bytes);
        this.session = session;
        this.commandID = 534;
        this.version = 0;
    }

    decode() {}

    async process() {
        const account = await database.getAccount(this.session.player);
        
        if (account.Gems < 169) {
            console.log(`[534] ❌ Недостаточно гемов! Нужно: 169, есть: ${account.Gems}`);
            return new LoginFailedMessage(
                this.session,
                `❌ Недостаточно гемов! Нужно: 169, есть: ${account.Gems}`,
                1
            ).send();
        }
        
        account.Gems -= 169;
        account.BrawlPass = 1;
        account.BPPaidProgress = 1;
        
        console.log(`[534] 💎 Списано 169 гемов (осталось ${account.Gems})`);
        console.log(`[534] ✅ Brawl Pass активирован`);
        
        await database.replaceValue(this.session.player.token, 'Gems', account.Gems);
        await database.replaceValue(this.session.player.token, 'BrawlPass', account.BrawlPass);
        await database.replaceValue(this.session.player.token, 'BPPaidProgress', account.BPPaidProgress);
    }
}

module.exports = LogicPurchaseBrawlPassCommand;
