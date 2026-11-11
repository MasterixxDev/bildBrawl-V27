const PiranhaMessage = require('../PiranhaMessage');
const ByteStream = require("../../ByteStream");
const database = require('../../db/PlayerManager');

class LogicShopCommand extends PiranhaMessage {
    constructor(session, account, items) {
        super(session);
        this.id = 24111;
        this.session = session;
        this.version = 1;
        this.stream = new ByteStream();
        this.account = account;
        this.items = items;
    }

    async encode() {
        this.stream.writeVInt(203);
        this.stream.writeVInt(0);
        this.stream.writeVInt(1);
        this.stream.writeVInt(100);
        
        this.stream.writeVInt(this.items.length);
        
        for (const item of this.items) {
            this.stream.writeVInt(item.multiplier);
            
            if (item.id === 1){
                // COINS
                this.stream.writeVInt(0);
                this.stream.writeVInt(7);
                this.stream.writeVInt(0);
                this.stream.writeVInt(0);
                this.account.Gold = this.account.Gold + item.multiplier;
                
            } else if (item.id === 9){
                // TOKENS DOUBLER
                this.stream.writeVInt(0);
                this.stream.writeVInt(2);
                this.stream.writeVInt(0);
                this.stream.writeVInt(0);
                // this.account.TokensDoubler = this.account.TokensDoubler + item.multiplier;
                
            } else if (item.id === 3){
                // BRAWLER UNLOCK
                this.stream.writeDataReference(16, item.dataRef[1]);
                this.stream.writeVInt(1);
                this.stream.writeVInt(0);
                
                const targetBrawler = this.account.Brawlers.find(brawler => brawler.id === item.dataRef[1]);
                if (targetBrawler) {
                    targetBrawler.unlocked = true;
                }
                
            } else if (item.id === 4){
                // SKIN
                this.stream.writeVInt(0);
                this.stream.writeVInt(9);
                this.stream.writeDataReference(29, item.skinID || 0);
                this.stream.writeVInt(0);
                
                if (!this.account.Skins) this.account.Skins = [];
                if (!this.account.Skins.includes(item.skinID)) {
                    this.account.Skins.push(item.skinID);
                }
                
            } else if (item.id === 8){
                // BRAWLER POINTS
                this.stream.writeDataReference(16, item.dataRef[1]);
                this.stream.writeVInt(6);
                this.stream.writeVInt(0);
                
                const targetBrawler = this.account.Brawlers.find(brawler => brawler.id === item.dataRef[1]);
                if (targetBrawler) {
                    targetBrawler.points = targetBrawler.points + item.multiplier;
                }
                
            } else if (item.id === 5){
                // SKILL (SPG)
                this.stream.writeVInt(0);
                this.stream.writeVInt(4);
                this.stream.writeVInt(0);
                this.stream.writeDataReference(23, item.dataRef[1]);
                
                if (!this.account.Skills) this.account.Skills = [];
                if (!this.account.Skills.includes(item.dataRef[1])) {
                    this.account.Skills.push(item.dataRef[1]);
                }
                
            } else if (item.id === 16){
                // GEMS
                this.stream.writeVInt(0);
                this.stream.writeVInt(8);
                this.stream.writeVInt(0);
                this.stream.writeVInt(0);
                this.account.Gems = this.account.Gems + item.multiplier;
            }
            
            this.stream.writeVInt(0);
        }

        // Заполняем оставшиеся поля
        for (let i = 0; i < 13; i++) {
            this.stream.writeVInt(0);
        }

        // Сохраняем все изменения в базе
        const updates = [];
        
        if (this.account.Gold !== undefined) {
            updates.push(database.replaceValue(this.session.player.token, 'Gold', this.account.Gold));
        }
        if (this.account.Gems !== undefined) {
            updates.push(database.replaceValue(this.session.player.token, 'Gems', this.account.Gems));
        }
        if (this.account.Brawlers) {
            updates.push(database.replaceValue(this.session.player.token, 'Brawlers', this.account.Brawlers));
        }
        if (this.account.Skills) {
            updates.push(database.replaceValue(this.session.player.token, 'Skills', this.account.Skills));
        }
        if (this.account.Skins) {
            updates.push(database.replaceValue(this.session.player.token, 'Skins', this.account.Skins));
        }

        await Promise.all(updates);
        
        console.log(`[ShopCommand] Processed ${this.items.length} items successfully`);
    }
}

module.exports = LogicShopCommand;