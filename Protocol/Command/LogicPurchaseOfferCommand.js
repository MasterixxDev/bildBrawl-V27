const PiranhaMessage = require('../PiranhaMessage');
const ByteStream = require('../../ByteStream');
const database = require('../../db/PlayerManager');
const Shop = require('../../Logic/Shop');
const LogicBoxCommand = require('./LogicBoxCommand');
const LogicShopCommand = require('./LogicShopCommand');
const LoginFailedMessage = require('../Messages/Server/Auth/LoginFailedMessage');

class LogicPurchaseOfferCommand extends PiranhaMessage {
    constructor(bytes, session) {
        super(bytes);
        this.session = session;
        this.commandID = 519;
        this.version = 0;
        this.stream = new ByteStream(bytes);
    }

    decode() {
        for (let i = 0; i < 9; i++) {
            this.stream.readVInt();
        }
        this.offerID = this.stream.readVInt();
    }

    async process() {
        const account = await database.getAccount(this.session.player);
        const myShop = new Shop();
        
        if (!account.Shop || !Array.isArray(account.Shop)) {
            account.Shop = myShop.generateShop(account);
            await database.replaceValue(this.session.player.token, 'Shop', account.Shop);
        }
        
        const foundOffer = myShop.findItemByIndex(this.offerID, account.Shop);
        
        if (!foundOffer || foundOffer.claim === true) {
            console.log(`[519] ❌ Оффер ${this.offerID} не найден или уже получен`);
            return;
        }

        // === ПРОВЕРКА БАЛАНСА ===
        if (foundOffer.cost > 0) {
            let canAfford = false;
            
            if (foundOffer.type === 0) {
                if (account.Gems < foundOffer.cost) {
                    return new LoginFailedMessage(
                        this.session,
                        `❌ Недостаточно гемов! Нужно: ${foundOffer.cost}, есть: ${account.Gems}`,
                        1
                    ).send();
                }
                account.Gems -= foundOffer.cost;
                await database.replaceValue(this.session.player.token, 'Gems', account.Gems);
                
            } else if (foundOffer.type === 1) {
                if (account.Gold < foundOffer.cost) {
                    return new LoginFailedMessage(
                        this.session,
                        `❌ Недостаточно золота! Нужно: ${foundOffer.cost}, есть: ${account.Gold}`,
                        1
                    ).send();
                }
                account.Gold -= foundOffer.cost;
                await database.replaceValue(this.session.player.token, 'Gold', account.Gold);
                
            } else {
                // Авто-выбор: сначала золото, потом гемы
                if (account.Gold >= foundOffer.cost) {
                    account.Gold -= foundOffer.cost;
                    await database.replaceValue(this.session.player.token, 'Gold', account.Gold);
                } else if (account.Gems >= foundOffer.cost) {
                    account.Gems -= foundOffer.cost;
                    await database.replaceValue(this.session.player.token, 'Gems', account.Gems);
                } else {
                    return new LoginFailedMessage(
                        this.session,
                        `❌ Недостаточно ресурсов! Нужно: ${foundOffer.cost}`,
                        1
                    ).send();
                }
            }
        }

        // === ВЫДАЧА НАГРАДЫ ===
        const includesArray = foundOffer.includes;
        let responseCommand;

        if (includesArray.find(item => item.id === 6)) {
            responseCommand = new LogicBoxCommand(this.session, 10, account, includesArray[0].multiplier);
        } else if (includesArray.find(item => item.id === 10)) {
            responseCommand = new LogicBoxCommand(this.session, 11, account, includesArray[0].multiplier);
        } else if (includesArray.find(item => item.id === 14)) {
            responseCommand = new LogicBoxCommand(this.session, 12, account, includesArray[0].multiplier);
        } else {
            responseCommand = new LogicShopCommand(this.session, account, includesArray);
        }

        responseCommand.send();
        foundOffer.claim = true;
        await database.replaceValue(this.session.player.token, 'Shop', account.Shop);
        
        console.log(`[519] ✅ Оффер ${this.offerID} куплен`);
    }
}

module.exports = LogicPurchaseOfferCommand;
