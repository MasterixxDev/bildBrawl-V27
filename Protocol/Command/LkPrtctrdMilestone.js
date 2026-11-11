const PiranhaMessage = require('../PiranhaMessage')
const ByteStream = require("../../ByteStream")
const database = require("../../db/PlayerManager")
const deliveryItems = require('./deliveryItems')
const deliveryItemsBP = require('./deliveryItemsBP')
const LogicBoxCommand = require('./LogicBoxCommand')
const LogicShopCommand = require('../Command/LogicShopCommand')

const milestones  = require('../../CSVParser/milestones');

const fs = require('fs');

const BRAWLER_NAME_TO_ID = {
    "Shaman": 8,
    "Gunslinger": 1,
    "BullDude": 2,
    "Mechanic": 7,
    "RocketGirl": 3,
    "TntDude": 9,
    "BowDude": 14,
    "ClusterBombDude": 22,
    "Arcade": 27,
    "Mummy": 30,
};

class LkPrtctrdMilestone extends PiranhaMessage{
    constructor(bytes, session){
        super(bytes)
        this.session = session;
        this.commandID = 517
        this.version = 0        
        this.stream = new ByteStream(bytes);
    }

    decode(self){
        console.log("[517] START DECODE")
        for (let i of Array(9).keys()){this.stream.readVInt()}   
        
        this.Road = this.stream.readVInt()
        this.stream.readVInt()
        this.Brawler = this.stream.readVInt()
        console.log("[517] DECODE COMPLETE - Road:", this.Road, "Brawler:", this.Brawler)
    }

    async process(){
        console.log("[517] START PROCESS - Road:", this.Road)
        function GetQuantityFromLevel(AllLevels,AllQuantities,ThisLevel){
            return AllQuantities[AllLevels.indexOf(ThisLevel)]
        }
        const account = await database.getAccount(this.session.player)
        console.log("[517] Account loaded - TrophyRoadTier:", account.TrophyRoadTier, "Trophies:", account.Trophies)
        
        if(this.Road === 6){
            console.log("[517] Processing Road 6")
            const findProgress = milestones.findProgress(account.TrophyRoadTier-1)
            console.log("[517] Find Progress:", findProgress)
            if(findProgress > account.Trophies){
                console.log("[517] Progress check failed")
            }
            this.Level = account.TrophyRoadTier-1
            console.log("[517] Current Level:", this.Level)
            
            if (global.ListAwards.Gold.Indexes.includes(this.Level)){
                console.log("[517] Giving Gold for level", this.Level)
                var Amount = GetQuantityFromLevel(global.ListAwards.Gold.Indexes, global.ListAwards.Gold.Amount, this.Level)
                new deliveryItems(this.session,100,7,Amount,-1,this.Level+1,6).send()
                await database.replaceValue(this.session.player.token, 'Gold', account.Gold + Amount)
            }
            if (global.ListAwards.Box.Indexes.includes(this.Level)){
                console.log("[517] Giving Box for level", this.Level)
                new LogicBoxCommand(this.session,10,account,1,true,this.Level+1,6).send()
            }
            if (global.ListAwards.BigBox.Indexes.includes(this.Level)){
                console.log("[517] Giving BigBox for level", this.Level)
                new LogicBoxCommand(this.session,12,account,1,true,this.Level+1,6).send()
            }
            if (global.ListAwards.MegaBox.Indexes.includes(this.Level)){
                console.log("[517] Giving MegaBox for level", this.Level)
                new LogicBoxCommand(this.session,11,account,1,true,this.Level+1,6).send()
            }
            if (global.ListAwards.TokenDoubler.Indexes.includes(this.Level)){
                console.log("[517] Giving TokenDoubler for level", this.Level)
                var Amount = GetQuantityFromLevel(global.ListAwards.TokenDoubler.Indexes, global.ListAwards.TokenDoubler.Amount, this.Level)
                new deliveryItems(this.session,100,2,Amount,-1,this.Level+1,6).send()
                await database.replaceValue(this.session.player.token, 'TokensDoubler', account.TokensDoubler + Amount)
            }
            if (global.ListAwards.PowerPoints.Indexes.includes(this.Level)){
                console.log("[517] Giving PowerPoints for level", this.Level, "Brawler ID:", this.Brawler)
                var Amount = GetQuantityFromLevel(global.ListAwards.PowerPoints.Indexes, global.ListAwards.PowerPoints.Amount, this.Level)
                new deliveryItems(this.session,100,6,Amount,this.Brawler,this.Level+1,6).send()
                const targetBrawler = account.Brawlers.find(brawler => brawler.id === this.Brawler);
                console.log("[517] Target Brawler for PowerPoints:", targetBrawler)
                if (targetBrawler !== undefined){
                    targetBrawler.points = targetBrawler.points + Amount;
                    await database.replaceValue(this.session.player.token, 'Brawlers', account.Brawlers);    
                }
            }
            if (global.ListAwards.Tickets.Indexes.includes(this.Level)){
                console.log("[517] Giving Tickets for level", this.Level)
                var Amount = GetQuantityFromLevel(global.ListAwards.Tickets.Indexes, global.ListAwards.Tickets.Amount, this.Level)
                new deliveryItems(this.session,100,3,Amount,-1,this.Level+1,6).send()
                await database.replaceValue(this.session.player.token, 'Tickets', account.Tickets + Amount)
            }
            if (global.ListAwards.toDoNothing.Indexes.includes(this.Level)){
                console.log("[517] Nothing to give for level", this.Level)
            }
            if (global.ListAwards.Brawlers.Indexes.includes(this.Level)){
                console.log("[517] Giving Brawler for level", this.Level)
                var Character = GetQuantityFromLevel(global.ListAwards.Brawlers.Indexes, global.ListAwards.Brawlers.Amount, this.Level)
                console.log("[517] Brawler Character ID from list:", Character)
                
                if (Character === -1 || typeof Character === 'string') {
                    const brawlerCodename = findProgress.PrimaryLvlUpRewardData;
                    Character = BRAWLER_NAME_TO_ID[brawlerCodename] || -1;
                    console.log("[517] Converted brawler:", brawlerCodename, "->", Character)
                }
                
                const targetBrawler = account.Brawlers.find(brawler => brawler.id === Character);
                console.log("[517] Target Brawler found:", targetBrawler)
                
                if (targetBrawler) {
                    if (!targetBrawler.unlocked){
                        console.log("[517] Unlocking brawler")
                        targetBrawler.unlocked = true;
                        new deliveryItems(this.session,100,1,1,Character,this.Level+1,6).send()
                        await database.replaceValue(this.session.player.token, 'Brawlers', account.Brawlers)
                    }
                    else{
                        console.log("[517] Brawler already unlocked, giving box instead")
                        new LogicBoxCommand(this.session,10,account,1,true,this.Level+1,6).send()
                    }
                } else {
                    console.log("[517] ERROR: Brawler not found with ID:", Character)
                    new LogicBoxCommand(this.session,10,account,1,true,this.Level+1,6).send()
                }
            }
            console.log("[517] Updating TrophyRoadTier to:", account.TrophyRoadTier + 1)
            await database.replaceValue(this.session.player.token, 'TrophyRoadTier', account.TrophyRoadTier + 1)
            console.log("[517] PROCESS COMPLETE")
            
        }else if(this.Road === 9){
            console.log("[517] Processing Paid Brawl Pass")
            
            const PAID_BP_REWARDS = {
                2: [11, 1],     // Level 2: Mega Box (был 1)
                3: [12, 1],     // Level 3: Big Box (был 2)
                4: [7, 100],    // Level 4: Gold (был 3)
                5: [12, 1],     // Level 5: Big Box (был 4)
                6: [7, 100],    // Level 6: Gold (был 5)
                7: [11, 1],     // Level 7: Mega Box (был 6)
                8: [6, 50],     // Level 8: PowerPoints (был 7)
                9: [12, 1],     // Level 9: Big Box (был 8)
                10: [7, 100],    // Level 10: Gold (был 9)
                11: [12, 1],    // Level 11: Big Box (был 10)
                12: [11, 1],    // Level 12: Mega Box (был 11)
                13: [7, 100],   // Level 13: Gold (был 12)
                14: [12, 1],    // Level 14: Big Box (был 13)
                15: [6, 100],   // Level 15: PowerPoints (был 14)
                16: [7, 200],   // Level 16: Gold (был 15)
                17: [1, 1, 35], // Level 17: Brawler Gale (был 16)
                18: [12, 1],   // Level 18: Gold (был 17)
                19: [12, 1],    // Level 19: PowerPoints (был 18)
                20: [6, 100],  // Level 20: Brawler Gunslinger (был 19)
                21: [12, 1],    // Level 21: Mega Box (был 20)
                22: [12, 1],   // Level 22: Gold (был 21)
                23: [7, 200],    // меняем
                24: [12, 1],    // 3
                25: [11, 1],   // Level 25: Gold (был 24)
                26: [12, 1],    // Level 26: PowerPoints (был 25)
                27: [6, 100],    // Level 27: Big Box (был 26)
                28: [12, 1],   //1 сдвинул
                29: [12, 1],   // мегабокс
                30: [12, 1],  // Level 30: Brawler BullDude (был 29)
                31: [6, 300], //
                32: [12, 1],   // меняю остановилс
                33: [7, 500],   // Level 33: PowerPoints (был 32)
                34: [12, 1],    // Level 34: Box (был 33)
                35: [11, 1],   // Level 35: Gold (был 34)
                36: [12, 1],   // Level 36: PowerPoints (был 35)
                37: [12, 1],    // Level 37: Big Box (был 36)
                38: [12, 1],   // 3
                39: [11, 1],   // Level 39: PowerPoints (был 38)
                40: [12, 1],  // Level 40: Brawler RocketGirl (был 39)
                41: [6, 500],    // Level 41: Mega Box (был 40)
                42: [12, 1],   // Level 42: Gold (был 41)
                43: [12, 1],   // Level 43: PowerPoints (был 42)
                44: [12, 1],    // Level 44: Box (был 43)
                45: [8, 1, 180],   // Level 45: Gold (был 44)
                46: [12, 1],   // Level 46: PowerPoints (был 45)
                47: [8, 1, 182],    // Level 47: Big Box (был 46)
                48: [7, 800],   // Level 48: Gold (был 47)
                49: [6, 160],   // Level 49: PowerPoints (был 48)
                50: [1, 1, 8],  // Level 50: Brawler Shaman (был 49)
                51: [11, 1],    // Level 51: Mega Box (был 50)
                52: [7, 850],   // Level 52: Gold (был 51)
                53: [6, 170],   // Level 53: PowerPoints (был 52)
                54: [10, 1],    // Level 54: Box (был 53)
                55: [7, 900],   // Level 55: Gold (был 54)
                56: [6, 180],   // Level 56: PowerPoints (был 55)
                57: [12, 1],    // Level 57: Big Box (был 56)
                58: [7, 950],   // Level 58: Gold (был 57)
                59: [6, 190],   // Level 59: PowerPoints (был 58)
                60: [1, 1, 9],  // Level 60: Brawler TntDude (был 59)
                61: [11, 1],    // Level 61: Mega Box (был 60)
                62: [7, 1000],  // Level 62: Gold (был 61)
                63: [6, 200],   // Level 63: PowerPoints (был 62)
            };

            if(account.BrawlPass === 1) {
                let currentLevel = account.BPPaidProgress || 0;
                currentLevel += 1; // Увеличиваем уровень для выдачи награды
                
                console.log("[517] Giving Paid Brawl Pass reward for level", currentLevel)
                
                const reward = PAID_BP_REWARDS[currentLevel];
                if(reward) {
                    const [rewardType, amount, extraData] = reward;
                    
                    switch(rewardType) {
                        case 1: 
                            console.log("[517] Giving Brawler ID:", extraData)
                            new deliveryItemsBP(this.session, 100, 1, 1, extraData, currentLevel, 9).send();
                            let brawlerExists = false;
                            
                            for (let i = 0; i < account.Brawlers.length; i++) {
                                if (account.Brawlers[i].id === extraData) {
                                    brawlerExists = true;
                                    if (!account.Brawlers[i].unlocked) {
                                        account.Brawlers[i].unlocked = true;
                                        console.log("[517] Brawler unlocked:", extraData);
                                    } else {
                                        console.log("[517] Brawler already unlocked:", extraData);
                                    }
                                    break;
                                }
                            }
                            
                            if (!brawlerExists) {
                                account.Brawlers.push({
                                    id: extraData,
                                    unlocked: true,
                                    points: 0,
                                    level: 1
                                });
                                console.log("[517] New brawler added to account:", extraData);
                            }
                            
                            await database.replaceValue(this.session.player.token, 'Brawlers', account.Brawlers);
                            console.log("[517] Brawlers array saved to database");
                            break;
                            
                        case 5:
                            console.log("[517] Giving Gems:", amount)
                            new deliveryItemsBP(this.session, 100, 5, amount, -1, currentLevel, 9).send();
                            const currentGems = account.Gems || 0;
                            await database.replaceValue(this.session.player.token, 'Gems', currentGems + amount);
                            break;
                            
                        case 6: 
                            console.log("[517] Giving PowerPoints:", amount, "for brawler:", this.Brawler)
                            new deliveryItemsBP(this.session, 100, 6, amount, this.Brawler, currentLevel, 9).send();
                            if(this.Brawler !== -1) {
                                const targetBrawler = account.Brawlers.find(b => b.id === this.Brawler);
                                if(targetBrawler) {
                                    targetBrawler.points += amount;
                                    await database.replaceValue(this.session.player.token, 'Brawlers', account.Brawlers);
                                }
                            }
                            break;
                            
                        case 7: // Gold
                            console.log("[517] Giving Gold:", amount)
                            new deliveryItemsBP(this.session, 100, 7, amount, -1, currentLevel, 9).send();
                            await database.replaceValue(this.session.player.token, 'Gold', account.Gold + amount);
                            break;
                            
                        case 8: // Skin
                            console.log("[517] Giving Skin ID:", extraData)
                            new deliveryItemsBP(this.session, 100, 8, 1, extraData, currentLevel, 9).send();
                            
                            // Получаем текущий массив скинов
                            const currentSkins = account.Skins || [];
                            
                            // Проверяем, есть ли уже этот скин
                            if (!currentSkins.includes(extraData)) {
                                // Добавляем скин в массив
                                currentSkins.push(extraData);
                                // Сохраняем обновленный массив
                                await database.replaceValue(this.session.player.token, 'Skins', currentSkins);
                                console.log("[517] Skin added to account:", extraData);
                            } else {
                                console.log("[517] Skin already exists:", extraData);
                            }
                            break;
                            
                        case 10: // Box
                            console.log("[517] Giving Box")
                            new LogicBoxCommand(this.session, 10, account, 1, true, currentLevel, 9).send();
                            break;
                            
                        case 11: // Mega Box
                            console.log("[517] Giving Mega Box")
                            new LogicBoxCommand(this.session, 11, account, 1, true, currentLevel, 9).send();
                            break;
                            
                        case 12: // Big Box
                            console.log("[517] Giving Big Box")
                            new LogicBoxCommand(this.session, 12, account, 1, true, currentLevel, 9).send();
                            break;
                    }
                    
                    await database.replaceValue(this.session.player.token, 'BPPaidProgress', currentLevel);
                    console.log("[517] Paid Brawl Pass progress updated to:", currentLevel);
                }
            }
            
        }else if(this.Road === 10){
            console.log("[517] Processing Free Brawl Pass")
            
            let currentLevel = account.BPFreeProgress || 0;
            currentLevel += 1;
            
            console.log("[517] Giving Free Brawl Pass reward for level", currentLevel)
            
            const FREE_BP_REWARDS = {
                1: [14, 1],     // Level 1: Big Box
                2: [14, 1],     // Level 2: Big Box
                3: [6, 1],      // Level 3: Box
                4: [14, 1],     // Level 4: Big Box
                5: [8, 10, 999],    // Level 5: Gems, 10 (используем тип 8 для анимации как у скина)
                6: [14, 1],     // Level 6: Big Box
                7: [6, 1],      // Level 7: Box
                8: [14, 1],     // Level 8: Big Box
                9: [6, 1],      // Level 9: Box
                10: [14, 1],    // Level 10: Big Box
                11: [6, 1],     // Level 11: Box
                12: [10, 1],    // Level 12: Mega Box
                13: [12, 50],   // Level 13: PowerPoints, 50
                14: [14, 1],    // Level 14: Big Box
                15: [6, 1],     // Level 15: Box
                16: [14, 1],    // Level 16: Big Box
                17: [8, 20, 999],   // Level 17: Gems, 20 (используем тип 8 для анимации как у скина)
                18: [14, 1],    // Level 18: Big Box
                19: [6, 1],     // Level 19: Box
                20: [14, 1],    // Level 20: Big Box
                21: [1, 50],    // Level 21: Gold, 50
                22: [10, 1],    // Level 22: Mega Box
                23: [6, 1],     // Level 23: Box
                24: [14, 1],    // Level 24: Big Box
                25: [8, 10, 999],   // Level 25: Gems, 10 (используем тип 8 для анимации как у скина)
                26: [14, 1],    // Level 26: Big Box
                27: [6, 1],     // Level 27: Box
                28: [14, 1],    // Level 28: Big Box
                29: [12, 50],   // Level 29: PowerPoints, 50
                30: [6, 1],     // Level 30: Box
                31: [14, 1],    // Level 31: Big Box
                32: [10, 1],    // Level 32: Mega Box
                33: [1, 100],   // Level 33: Gold, 100
                34: [14, 1],    // Level 34: Big Box
                35: [6, 1],     // Level 35: Box
                36: [14, 1],    // Level 36: Big Box
                37: [8, 20, 999],   // Level 37: Gems, 20 (используем тип 8 для анимации как у скина)
                38: [6, 1],     // Level 38: Box
                39: [14, 1],    // Level 39: Big Box
                40: [6, 1],     // Level 40: Box
                41: [12, 75],   // Level 41: PowerPoints, 75
                42: [10, 1],    // Level 42: Mega Box
                43: [6, 1],     // Level 43: Box
                44: [14, 1],    // Level 44: Big Box
                45: [8, 10, 999],   // Level 45: Gems, 10 (используем тип 8 для анимации как у скина)
                46: [6, 1],     // Level 46: Box
                47: [10, 1],    // Level 47: Mega Box
                48: [14, 1],    // Level 48: Big Box
                49: [1, 200],   // Level 49: Gold, 200
                50: [6, 1],     // Level 50: Box
                51: [14, 1],    // Level 51: Big Box
                52: [10, 1],    // Level 52: Mega Box
                53: [8, 20, 999],   // Level 53: Gems, 20 (используем тип 8 для анимации как у скина)
                54: [14, 1],    // Level 54: Big Box
                55: [6, 1],     // Level 55: Box
                56: [12, 100],  // Level 56: PowerPoints, 100
                57: [10, 1],    // Level 57: Mega Box
                58: [14, 1],    // Level 58: Big Box
                59: [1, 500],   // Level 59: Gold, 500
                60: [14, 1],    // Level 60: Big Box
                61: [10, 1],    // Level 61: Mega Box
                62: [12, 500],  // Level 62: PowerPoints, 500
            };

            const reward = FREE_BP_REWARDS[currentLevel];
            if(reward) {
                const [rewardType, amount, extraData] = reward;
                
                switch(rewardType) {
                    case 1: // Gold
                        console.log("[517] Giving Gold:", amount)
                        new deliveryItemsBP(this.session, 100, 7, amount, -1, currentLevel, 10).send();
                        await database.replaceValue(this.session.player.token, 'Gold', account.Gold + amount);
                        break;
                        
                    case 6: // Box
                        console.log("[517] Giving Box")
                        new LogicBoxCommand(this.session, 10, account, 1, true, currentLevel, 10).send();
                        break;
                        
                    case 8: // Gems с анимацией как у скина
                        console.log("[517] Giving Gems with skin animation:", amount)
                        // Отправляем с анимацией как у скина, но выдаем гемы
                        new deliveryItemsBP(this.session, 100, 8, amount, 999, currentLevel, 10).send();
                        const currentGems = account.Gems || 0;
                        await database.replaceValue(this.session.player.token, 'Gems', currentGems + amount);
                        break;
                        
                    case 10: // Mega Box
                        console.log("[517] Giving Mega Box")
                        new LogicBoxCommand(this.session, 11, account, 1, true, currentLevel, 10).send();
                        break;
                        
                    case 12: // PowerPoints
                        console.log("[517] Giving PowerPoints:", amount, "for brawler:", this.Brawler)
                        new deliveryItemsBP(this.session, 100, 6, amount, this.Brawler, currentLevel, 10).send();
                        if(this.Brawler !== -1) {
                            const targetBrawler = account.Brawlers.find(b => b.id === this.Brawler);
                            if(targetBrawler) {
                                targetBrawler.points += amount;
                                await database.replaceValue(this.session.player.token, 'Brawlers', account.Brawlers);
                            }
                        }
                        break;
                        
                    case 14: // Big Box
                        console.log("[517] Giving Big Box")
                        new LogicBoxCommand(this.session, 12, account, 1, true, currentLevel, 10).send();
                        break;
                }
                
                await database.replaceValue(this.session.player.token, 'BPFreeProgress', currentLevel);
                console.log("[517] Free Brawl Pass progress updated to:", currentLevel);
            }
        }
    }
}
module.exports = LkPrtctrdMilestone