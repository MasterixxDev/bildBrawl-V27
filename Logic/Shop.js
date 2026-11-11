const fs = require('fs');
const Character = require("../CSVParser/Characters")

class Shop {
    constructor() {
        //
    }

    loadShopArray() {
        try {
            const data = fs.readFileSync('./Logic/offers.json', 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading offers.json:', error.message);
            return [];
        }
    }

    getAllOffer() {
        return this.shoparray;
    }

    async giftAllPlayer(data){
        const offers = fs.readFileSync('./Logic/offers.json', 'utf8');
        const OffersParsed = JSON.parse(offers);
        const EndDate = new Date()
        EndDate.setDate(EndDate.getDate() + 1);
        EndDate.setHours(9, 0, 0, 0);

        data.EndDate = EndDate;
        OffersParsed.push(data)

        const jsonData = JSON.stringify(OffersParsed, null, 2);
        fs.writeFileSync('./Logic/offers.json', jsonData, 'utf8');
    }

    findItemByIndex(index, accountShop) {
        console.log(`[Shop] Searching for offer at index: ${index}`);
        console.log(`[Shop] Shop length: ${accountShop.length}`);
        
        if (!accountShop || !Array.isArray(accountShop)) {
            console.log(`[Shop] ERROR: Shop data is invalid`);
            return null;
        }
        
        // Детальный вывод всех офферов для отладки
        console.log(`[Shop] All offers in shop:`);
        accountShop.forEach((offer, idx) => {
            console.log(`[Shop] Index ${idx}: name="${offer.name}", type=${offer.type}, cost=${offer.cost}, claim=${offer.claim}`);
        });
        
        // Проверяем что индекс в пределах массива
        if (index >= 0 && index < accountShop.length) {
            const foundOffer = accountShop[index];
            console.log(`[Shop] ✅ Found offer at index ${index}:`, {
                name: foundOffer.name,
                type: foundOffer.type,
                cost: foundOffer.cost,
                claim: foundOffer.claim,
                includes: foundOffer.includes
            });
            return foundOffer;
        } else {
            console.log(`[Shop] ❌ Offer index ${index} out of range! Shop has ${accountShop.length} offers (0-${accountShop.length - 1})`);
            return null;
        }
    }

    shuffleArray(array) {
        let shuffledArray = array.slice(); // Create a copy of the array
        for (let i = shuffledArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]]; // Swap elements
        }
        return shuffledArray;
    }

    generateShop(player) {
        player.Shop = [];
        const EndDate = new Date()
        EndDate.setDate(EndDate.getDate() + 1);
        EndDate.setHours(9, 0, 0, 0);
        
        var unlockedBrawlers = player.Brawlers.filter(brawler => brawler.unlocked === true && brawler.points < 1440 && brawler.level < 8);
        var BrawlersONSkins = player.Brawlers.filter(brawler => brawler.unlocked === true);
        var BrawlerDailyShop = [];
        var skinofDay = [];

        const Random = Math.floor(Math.random() * 3);

        const commonProperties = {
            "name": "",
            "cost": 0,
            "EndDate": EndDate,
            "ShopDisplay": 1,
            "type": 0,
            "claim": false,
            "includes": [{"id": 0, "multiplier": 1, "dataRef": [0, 0], "skinID": 0}]
        };
        
        if (Random === 0) {
            commonProperties.includes[0].id = 1;
            commonProperties.includes[0].multiplier = Math.floor(Math.random() * 333);
        } else if (Random === 1) {
            commonProperties.includes[0].id = 6;
            commonProperties.cost = 0;
        } else if (Random === 2) {
            commonProperties.includes[0].id = 10;
            commonProperties.cost = 40;
        }
        player.Shop.push({ ...commonProperties });
        
        for (let i = 0; i < 5; i++) {
            if (unlockedBrawlers.length > 0) {
                let randomIndex = Math.floor(Math.random() * unlockedBrawlers.length);
                const bID = unlockedBrawlers[randomIndex].id;
                unlockedBrawlers.splice(randomIndex, 1);
                BrawlerDailyShop.push(bID);
            }
        }

        for (let i = 0; i < 6; i++) {
            if (BrawlersONSkins.length > 0) {
                let randomIndex2 = Math.floor(Math.random() * BrawlersONSkins.length);
                const bID2 = BrawlersONSkins[randomIndex2].id;
                BrawlersONSkins.splice(randomIndex2, 1);
                skinofDay.push(bID2);
            }
        }

        for (let id of BrawlerDailyShop) {
            let idk = Math.floor(Math.random() * 333)
            const commonProperties2 = {
                "name": " ",
                "cost": idk*2,
                "EndDate": EndDate,
                "ShopDisplay": 1,
                "type": 1,
                "claim": false,
                "includes": [
                    {
                        "id": 8,
                        "multiplier": idk,
                        "dataRef": [16, id],
                        "skinID": 0
                    }
                ]
            }
            player.Shop.push({ ...commonProperties2 });
        }

        let shuffledSkins = this.shuffleArray(global.skins);
        let skinCount = 0;
        let maxSkins = 5;

        for (let id of shuffledSkins) {
            if (skinCount >= maxSkins) break; // Останавливаемся после 5 скинов
            
            if (player.Skins && !player.Skins.includes(id.id)) {
                const brawler = Character.getBrawlerBySkinID(id.id);
                if (skinofDay.includes(brawler)) {
                    const Random = Math.floor(Math.random() * 3);
                    let oldcost = 0
                    if (Random === 1) oldcost = id.cost/2;
                    if (Random === 2) oldcost = id.cost/3;
                    const commonProperties2 = {
                        "name": "",
                        "cost": id.cost,
                        "EndDate": EndDate,
                        "ShopDisplay": 0,
                        "type": 0,
                        "OldPrice": oldcost,
                        "claim": false,
                        "includes": [
                            {
                                "id": 4,
                                "multiplier": 1,
                                "dataRef": [0, 0],
                                "skinID": id.id
                            }
                        ]
                    }
                    player.Shop.push({ ...commonProperties2 });
                    skinCount++; // Увеличиваем счетчик только когда добавляем скин
                }        
            }
        }

        var GiftAll = this.loadShopArray();
        GiftAll.forEach(e => {
            const currentDate = new Date().getDay();
            const endDate = new Date(e.EndDate).getDay();
            
            const timeDifference = endDate - currentDate;
            const dayDifference = timeDifference / (1000 * 60 * 60 * 24);
            
            if(dayDifference >= 0){
                e.EndDate = EndDate;
                player.Shop.push({ ...e });
            }
        });

        // Отладочная информация о сгенерированных офферах
        console.log(`[Shop] Generated ${player.Shop.length} offers for player:`);
        player.Shop.forEach((offer, index) => {
            console.log(`[Shop] Offer ${index}: "${offer.name}", type=${offer.type}, cost=${offer.cost}`);
        });

        return player.Shop;
    }

    encode(stream, account) {
        const currentTime = new Date();
        this.stream = stream;
        this.offers = account.Shop;
        
        console.log(`[Shop] Encoding ${this.offers.length} offers to client`);
        
        this.stream.writeVInt(this.offers.length);

        for(let offer of this.offers){
            this.stream.writeVInt(offer.includes.length);
            for(let item of offer.includes){
                this.stream.writeVInt(item.id);
                this.stream.writeVInt(item.multiplier);
                this.stream.writeDataReference(item.dataRef[0], item.dataRef[1]);
                this.stream.writeVInt(item.skinID);
            }
            this.stream.writeVInt(offer.type);
            this.stream.writeVInt(offer.cost);
            this.stream.writeVInt(Math.floor((new Date(offer.EndDate) - currentTime) / 1000)); // Timer
            this.stream.writeVInt(1); // Offer View | 0 = Absolutely "NEW", 1 = "NEW", 2 = Viewed
            this.stream.writeVInt(100);
            this.stream.writeBoolean(offer.claim); // purchased
            this.stream.writeBoolean(false);
            this.stream.writeVInt(offer.ShopDisplay); // [0 = Normal, 1 = Daily Deals]
            this.stream.writeVInt(offer.OldPrice || 0); // OldPrice
            this.stream.writeInt(0);
            this.stream.writeString(offer.name);
            this.stream.writeBoolean(false);
            this.stream.writeString("");
            this.stream.writeVInt(0);
            this.stream.writeBoolean(false);
        }
    }
}

module.exports = Shop;