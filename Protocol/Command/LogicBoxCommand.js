const PiranhaMessage = require('../PiranhaMessage');
const ByteStream = require("../../ByteStream");
const database = require("../../db/PlayerManager");
const Cards = require('../../CSVParser/Cards');

class LogicBoxCommand extends PiranhaMessage {
    constructor(session, box, account, count = 1, isClaim = false, level = 0, road = 6) {
        super(session);
        this.id = 24111;
        this.session = session;
        this.version = 1;
        this.stream = new ByteStream();
        this.account = account;
        this.box = box;
        this.items = [];
        this.count = count;
        this.isClaim = isClaim;
        this.level = level;
        this.road = road;
        this.pendingBrawler = null;
    }

    generateItems() {
        const newItem = [];
        let Gold;
        let brawlerPoints;
        let gems = 0;
        let brawler = -1;
        let randomBrawlerID;
        let newBrawler = false;

        const unlockedBrawlers = this.account.Brawlers.filter(
            brawler => brawler.unlocked === true && brawler.points < 1440 && brawler.level < 8
        );
        const blockedBrawlers = this.account.Brawlers.filter(brawler => brawler.unlocked === false);
        const newbrawler = Math.floor(Math.random() * 100);

        // Шанс получить нового бравлера
        if (blockedBrawlers.length !== 0) {
            if (newbrawler >= 88) {
                let randomIndex = Math.floor(Math.random() * blockedBrawlers.length);
                const brawleraID = blockedBrawlers[randomIndex].id;
                let blockB = [8, 0, 1, 2, 7, 3, 9, 14, 22, 27, 30];

                const targetBrawler = this.account.Brawlers.find(brawler => brawler.id === brawleraID);
                if (targetBrawler && targetBrawler.unlocked === false && !blockB.includes(brawleraID)) {
                    newBrawler = true;
                    this.pendingBrawler = { type: 1, ammount: 1, brawler: brawleraID };
                    targetBrawler.unlocked = true;
                    database.replaceValue(this.session.player.token, 'Brawlers', this.account.Brawlers);
                }
            }
        }

        switch (this.box) {
            case 10: // Обычный ящик
                // Золото
                Gold = Math.floor(Math.random() * (55) + 21);
                newItem.push({ type: 7, ammount: Gold, brawler: -1 });
                this.account.Gold += Gold;
                database.replaceValue(this.session.player.token, 'Gold', this.account.Gold);

                // Очки силы для 2 бравлеров
                for (let i = 0; i < 2; i++) {
                    if (unlockedBrawlers.length > 0) {
                        brawlerPoints = Math.floor(Math.random() * (55) + 32);
                        const randomIndex = Math.floor(Math.random() * unlockedBrawlers.length);
                        randomBrawlerID = unlockedBrawlers[randomIndex].id;
                        unlockedBrawlers.splice(randomIndex, 1);
                        newItem.push({ type: 6, ammount: brawlerPoints, brawler: randomBrawlerID });
                        const targetBrawler = this.account.Brawlers.find(brawler => brawler.id === randomBrawlerID);
                        if (targetBrawler) {
                            targetBrawler.points += brawlerPoints;
                            database.replaceValue(this.session.player.token, 'Brawlers', this.account.Brawlers);
                        }
                    }
                }

                // Звездная сила для 9 уровня
                const BrawlerOf9LVL = this.account.Brawlers.filter(brawler => brawler.level >= 8 && brawler.skill == 0);
                if (BrawlerOf9LVL.length > 0) {
                    const changeOfGive = Math.floor(Math.random() * 100);
                    if (changeOfGive > 80) {
                        let randomIndex = Math.floor(Math.random() * BrawlerOf9LVL.length);
                        const brawleraID = BrawlerOf9LVL[randomIndex].id;
                        const spg = Cards.getBrawlerSkills(4, brawleraID)[0];
                        if (spg !== undefined) {
                            const targetBrawler = this.account.Brawlers.find(brawler => brawler.id === brawleraID);
                            if (targetBrawler) {
                                targetBrawler.skill = spg;
                                database.replaceValue(this.session.player.token, 'Brawlers', this.account.Brawlers);
                                newItem.push({ type: 4, ammount: 1, brawler: spg });
                            }
                        }
                    }
                }

                // Новый бравлер
                if (newBrawler && this.pendingBrawler) {
                    newItem.push(this.pendingBrawler);
                    this.pendingBrawler = null;
                }

                // ГЕМЫ — ОКРУГЛЯЕМ!
                if (!newBrawler) {
                    const dropGems = Math.floor(Math.random() * 100);
                    if (dropGems >= 90) {
                        const gemsToAdd = Math.floor(Gold / 15);
                        if (gemsToAdd > 0) {
                            const oldGems = this.account.Gems || 0;
                            this.account.Gems += gemsToAdd;
                            console.log(`[BOX] 💎 Добавлено ${gemsToAdd} гемов (было ${oldGems}, стало ${this.account.Gems})`);
                            database.replaceValue(this.session.player.token, 'Gems', this.account.Gems);
                            newItem.push({ type: 8, ammount: gemsToAdd, brawler: -1 });
                        }
                    }
                }
                break;

            case 11: // Мега-ящик
                Gold = Math.floor(Math.random() * (480 - 120) + 120);
                newItem.push({ type: 7, ammount: Gold, brawler: -1 });
                this.account.Gold += Gold;
                database.replaceValue(this.session.player.token, 'Gold', this.account.Gold);

                for (let i = 0; i < 6; i++) {
                    if (unlockedBrawlers.length > 0) {
                        brawlerPoints = Math.floor(Math.random() * (55) + 144);
                        const randomIndex = Math.floor(Math.random() * unlockedBrawlers.length);
                        randomBrawlerID = unlockedBrawlers[randomIndex].id;
                        unlockedBrawlers.splice(randomIndex, 1);
                        newItem.push({ type: 6, ammount: brawlerPoints, brawler: randomBrawlerID });
                        const targetBrawler = this.account.Brawlers.find(brawler => brawler.id === randomBrawlerID);
                        if (targetBrawler) {
                            targetBrawler.points += brawlerPoints;
                            database.replaceValue(this.session.player.token, 'Brawlers', this.account.Brawlers);
                        }
                    }
                }

                const BrawlerOf9LVL2 = this.account.Brawlers.filter(brawler => brawler.level >= 8 && brawler.skill == 0);
                if (BrawlerOf9LVL2.length > 0) {
                    const changeOfGive2 = Math.floor(Math.random() * 100);
                    if (changeOfGive2 > 67) {
                        let randomIndex = Math.floor(Math.random() * BrawlerOf9LVL2.length);
                        const brawleraID = BrawlerOf9LVL2[randomIndex].id;
                        const spg = Cards.getBrawlerSkills(4, brawleraID)[0];
                        if (spg !== undefined) {
                            const targetBrawler = this.account.Brawlers.find(brawler => brawler.id === brawleraID);
                            if (targetBrawler) {
                                targetBrawler.skill = spg;
                                database.replaceValue(this.session.player.token, 'Brawlers', this.account.Brawlers);
                                newItem.push({ type: 4, ammount: 1, brawler: spg });
                            }
                        }
                    }
                }

                if (newBrawler && this.pendingBrawler) {
                    newItem.push(this.pendingBrawler);
                    this.pendingBrawler = null;
                }

                // ГЕМЫ — ОКРУГЛЯЕМ!
                const dropGems2 = Math.floor(Math.random() * 100);
                if (dropGems2 >= 60) {
                    const gemsToAdd2 = Math.floor(Gold / 14);
                    if (gemsToAdd2 > 0) {
                        const oldGems2 = this.account.Gems || 0;
                        this.account.Gems += gemsToAdd2;
                        console.log(`[BOX] 💎 Добавлено ${gemsToAdd2} гемов (было ${oldGems2}, стало ${this.account.Gems})`);
                        database.replaceValue(this.session.player.token, 'Gems', this.account.Gems);
                        newItem.push({ type: 8, ammount: gemsToAdd2, brawler: -1 });
                    }
                }
                break;

            case 12: // Большой ящик
                Gold = Math.floor(Math.random() * (68) + 27);
                newItem.push({ type: 7, ammount: Gold, brawler: -1 });
                this.account.Gold += Gold;
                database.replaceValue(this.session.player.token, 'Gold', this.account.Gold);

                for (let i = 0; i < 4; i++) {
                    if (unlockedBrawlers.length > 0) {
                        brawlerPoints = Math.floor(Math.random() * (55) + 64);
                        const randomIndex = Math.floor(Math.random() * unlockedBrawlers.length);
                        randomBrawlerID = unlockedBrawlers[randomIndex].id;
                        unlockedBrawlers.splice(randomIndex, 1);
                        newItem.push({ type: 6, ammount: brawlerPoints, brawler: randomBrawlerID });
                        const targetBrawler = this.account.Brawlers.find(brawler => brawler.id === randomBrawlerID);
                        if (targetBrawler) {
                            targetBrawler.points += brawlerPoints;
                            database.replaceValue(this.session.player.token, 'Brawlers', this.account.Brawlers);
                        }
                    }
                }

                const BrawlerOf9LVL3 = this.account.Brawlers.filter(brawler => brawler.level >= 8 && brawler.skill == 0);
                if (BrawlerOf9LVL3.length > 0) {
                    const changeOfGive3 = Math.floor(Math.random() * 100);
                    if (changeOfGive3 > 72) {
                        let randomIndex = Math.floor(Math.random() * BrawlerOf9LVL3.length);
                        const brawleraID = BrawlerOf9LVL3[randomIndex].id;
                        const spg = Cards.getBrawlerSkills(4, brawleraID)[0];
                        if (spg !== undefined) {
                            const targetBrawler = this.account.Brawlers.find(brawler => brawler.id === brawleraID);
                            if (targetBrawler) {
                                targetBrawler.skill = spg;
                                database.replaceValue(this.session.player.token, 'Brawlers', this.account.Brawlers);
                                newItem.push({ type: 4, ammount: 1, brawler: spg });
                            }
                        }
                    }
                }

                if (newBrawler && this.pendingBrawler) {
                    newItem.push(this.pendingBrawler);
                    this.pendingBrawler = null;
                }

                // ГЕМЫ — ОКРУГЛЯЕМ!
                const dropGems3 = Math.floor(Math.random() * 100);
                if (dropGems3 >= 80) {
                    const gemsToAdd3 = Math.floor(Gold / 15);
                    if (gemsToAdd3 > 0) {
                        const oldGems3 = this.account.Gems || 0;
                        this.account.Gems += gemsToAdd3;
                        console.log(`[BOX] 💎 Добавлено ${gemsToAdd3} гемов (было ${oldGems3}, стало ${this.account.Gems})`);
                        database.replaceValue(this.session.player.token, 'Gems', this.account.Gems);
                        newItem.push({ type: 8, ammount: gemsToAdd3, brawler: -1 });
                    }
                }
                break;
        }

        this.items.push(...newItem);
        return newItem;
    }

    async encode() {
        this.stream.writeVInt(203);
        this.stream.writeVInt(1);
        this.stream.writeVInt(this.count);

        for (let i = 0; i < this.count; i++) {
            this.stream.writeVInt(this.box);
            const items = this.generateItems();
            this.stream.writeVInt(items.length);

            for (const item of items) {
                console.log(`[BOX] Предмет: тип=${item.type}, количество=${item.ammount}, бравлер=${item.brawler}`);
                this.stream.writeVInt(item.ammount);

                if (item.brawler !== -1) {
                    this.stream.writeDataReference(16, item.brawler);
                } else {
                    this.stream.writeVInt(0);
                }
                this.stream.writeVInt(item.type);
                this.stream.writeVInt(0);
                this.stream.writeVInt(0);

                if (item.type === 4) {
                    this.stream.writeDataReference(23, item.brawler);
                } else {
                    this.stream.writeVInt(0);
                }
                this.stream.writeVInt(0);
            }
        }

        if (this.isClaim) {
            this.stream.writeVInt(0);

            if (this.road === 6) {
                this.stream.writeVInt(6);
                this.stream.writeVInt(this.account.TrophyRoadTier + 1);
            } else if (this.road === 9) {
                this.stream.writeVInt(9);
                this.stream.writeVInt(this.level);
            } else if (this.road === 10) {
                this.stream.writeVInt(10);
                this.stream.writeVInt(this.level);
            }

            this.stream.writeVInt(0);
            this.stream.writeVInt(0);
        } else {
            for (let i = 0; i < 13; i++) {
                this.stream.writeVInt(0);
            }
        }
    }
}

module.exports = LogicBoxCommand;
