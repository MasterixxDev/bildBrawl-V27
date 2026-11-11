// Logic/QuestGenerator.js

const database = require("../db/PlayerManager");

class QuestGenerator {
    static QUEST_CONFIG = {
        MAX_QUESTS: 8,
        REWARDS: {
            500: { wins: 8, kills: 8 },
            250: { wins: 5, kills: 5 },
            100: { wins: 3, kills: 3 }
        },
        ALLOWED_MODES: [2, 6], // ТОЛЬКО 2 (Showdown) и 6 (Duo Showdown)
    };

    constructor(account) {
        this.account = account;
    }

    generateQuests(unlockedHeroes, count = 3) {
        const brawlers = unlockedHeroes || this.getUnlockedBrawlers();
        return this.generateDailyQuests(brawlers);
    }

    generateDailyQuests(unlockedBrawlers) {
        const quests = [];
        const brawlers = unlockedBrawlers || this.getUnlockedBrawlers();
        
        if (!brawlers || brawlers.length === 0) {
            return this.generateModeOnlyQuests();
        }

        // 8 квестов: 2x500, 2x250, 4x100
        const questPool = [
            { reward: 500, count: 2 },
            { reward: 250, count: 2 },
            { reward: 100, count: 4 }
        ];

        for (const pool of questPool) {
            for (let i = 0; i < pool.count; i++) {
                quests.push(this.generateSingleQuest(pool.reward, brawlers));
            }
        }

        return this.shuffleArray(quests);
    }

    generateSingleQuest(reward, unlockedBrawlers) {
        const config = QuestGenerator.QUEST_CONFIG;
        const missionType = Math.random() < 0.5 ? 1 : 2;
        
        const quest = {
            MissionType: missionType,
            goal: 0,
            target: 0,
            reward: reward,
            BrawlerID: -1,
            gamemode: -1
        };

        if (missionType === 1) {
            // Квест на победы в режиме (только 2 или 6)
            quest.gamemode = config.ALLOWED_MODES[Math.floor(Math.random() * config.ALLOWED_MODES.length)];
            quest.target = this.getTargetByReward(reward, 'wins');
        } else {
            // Квест на убийства на персонаже
            const brawler = this.getRandomUnlockedBrawler(unlockedBrawlers);
            if (brawler) {
                quest.BrawlerID = brawler.id;
                quest.target = this.getTargetByReward(reward, 'kills');
            } else {
                quest.BrawlerID = -1;
                quest.target = this.getTargetByReward(reward, 'kills');
            }
        }

        return quest;
    }

    getRandomUnlockedBrawler(unlockedBrawlers) {
        if (!unlockedBrawlers || unlockedBrawlers.length === 0) return null;
        const available = unlockedBrawlers.filter(b => b && b.unlocked === true);
        if (available.length === 0) return null;
        return available[Math.floor(Math.random() * available.length)];
    }

    getUnlockedBrawlers() {
        if (!this.account || !this.account.Brawlers) return [];
        return this.account.Brawlers.filter(b => b.unlocked === true);
    }

    getTargetByReward(reward, type) {
        const config = QuestGenerator.QUEST_CONFIG;
        const rewardKey = Object.keys(config.REWARDS).find(key => parseInt(key) === reward);
        if (!rewardKey) return 0;
        return type === 'wins' ? config.REWARDS[rewardKey].wins : config.REWARDS[rewardKey].kills;
    }

    generateModeOnlyQuests() {
        const quests = [];
        const config = QuestGenerator.QUEST_CONFIG;
        const rewards = [500, 500, 250, 250, 100, 100, 100, 100];
        
        for (const reward of rewards) {
            quests.push({
                MissionType: 1,
                goal: 0,
                target: this.getTargetByReward(reward, 'wins'),
                reward: reward,
                BrawlerID: -1,
                gamemode: config.ALLOWED_MODES[Math.floor(Math.random() * config.ALLOWED_MODES.length)]
            });
        }
        return this.shuffleArray(quests);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    async refreshDailyQuests(account) {
        this.account = account;
        const today = new Date().toDateString();
        const lastReset = account.lastQuestReset ? new Date(account.lastQuestReset).toDateString() : null;

        if (!account.quests || account.quests.length === 0 || today !== lastReset) {
            const newQuests = this.generateDailyQuests(this.getUnlockedBrawlers());
            account.quests = newQuests;
            account.lastQuestReset = new Date();
            await database.replaceValue(account.token, 'quests', newQuests);
            await database.replaceValue(account.token, 'lastQuestReset', account.lastQuestReset);
            return newQuests;
        }

        const completed = account.quests.filter(q => q.goal >= q.target);
        if (completed.length > 0) {
            const active = account.quests.filter(q => q.goal < q.target);
            const newQuests = this.generateDailyQuests(this.getUnlockedBrawlers());
            const replacement = newQuests.slice(0, completed.length);
            account.quests = [...active, ...replacement];
            await database.replaceValue(account.token, 'quests', account.quests);
        }

        return account.quests;
    }

    static checkQuestProgress(account, battleResult) {
        if (!account || !battleResult) return false;

        const { gameMode, brawlerId, kills = 0, won = false } = battleResult;
        let updated = false;

        for (const quest of (account.quests || [])) {
            if (!quest || quest.target <= 0 || quest.goal >= quest.target) continue;

            let progress = 0;

            if (quest.MissionType === 1) {
                if (quest.gamemode === gameMode && won) progress = 1;
            } else if (quest.MissionType === 2) {
                if (quest.BrawlerID === brawlerId || quest.BrawlerID === -1) {
                    progress = Math.max(0, kills || 0);
                }
            }

            if (progress > 0) {
                quest.goal = (quest.goal || 0) + progress;
                updated = true;
            }
        }

        return updated;
    }
}

module.exports = QuestGenerator;