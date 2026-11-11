const PiranhaMessage = require('../PiranhaMessage');
const ByteStream = require("../../ByteStream");
const database = require('../../db/PlayerManager');
const LoginFailedMessage = require('../Messages/Server/Auth/LoginFailedMessage');

class LogicPurchaseHeroLvlUpMaterialCommand extends PiranhaMessage {
    constructor(bytes, session) {
        super(bytes);
        this.session = session;
        this.commandID = 521;
        this.version = 0;
        this.stream = new ByteStream(bytes);
    }

    decode() {
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
        this.GoldType = this.stream.readVInt();
    }

    async process() {
        const account = await database.getAccount(this.session.player);
        
        let Gold = 0;
        let GemsCost = 0;
        
        if (this.GoldType === 0) {
            Gold = 150;
            GemsCost = 20;
        } else if (this.GoldType === 1) {
            Gold = 400;
            GemsCost = 50;
        } else if (this.GoldType === 2) {
            Gold = 1200;
            GemsCost = 140;
        } else if (this.GoldType === 3) {
            Gold = 2600;
            GemsCost = 280;
        }
        
        if (account.Gems < GemsCost) {
            console.log(`[521] ❌ Недостаточно гемов! Нужно: ${GemsCost}, есть: ${account.Gems}`);
            return new LoginFailedMessage(
                this.session,
                `❌ Недостаточно гемов! Нужно: ${GemsCost}, есть: ${account.Gems}`,
                1
            ).send();
        }
        
        account.Gems -= GemsCost;
        account.Gold += Gold;
        
        console.log(`[521] 💎 Списано ${GemsCost} гемов (осталось ${account.Gems})`);
        console.log(`[521] 🪙 Добавлено ${Gold} золота (стало ${account.Gold})`);
        
        await database.replaceValue(account.token, 'Gems', account.Gems);
        await database.replaceValue(account.token, 'Gold', account.Gold);
    }
}

module.exports = LogicPurchaseHeroLvlUpMaterialCommand;
