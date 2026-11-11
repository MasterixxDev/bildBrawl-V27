const database = require('./PlayerManager');

class AchievementManager {
    /**
     * Проверка ачивок для игрока
     */
    static async checkAchievements(lowID, account) {
        try {
            const config = require('../Achievements/achievements.json');
            
            // Если у игрока нет поля achievements - создаем
            let achievements = account.achievements;
            if (!achievements) {
                achievements = await this.initializeAchievements(lowID);
            }

            const unlockedIds = achievements.unlocked || [];
            let newAchievements = [];
            let hasChanges = false;

            // Проходим по всем ачивкам из конфига
            for (const ach of config.achievements) {
                // Пропускаем уже выполненные
                if (unlockedIds.includes(ach.id)) continue;

                // Проверяем условие
                const completed = await this.checkCondition(account, ach);
                
                if (completed) {
                    console.log(`[ACHIEVEMENTS] ✅ Ачивка "${ach.name}" выполнена!`);

                    // Добавляем в выполненные
                    achievements.unlocked.push(ach.id);
                    
                    // Сохраняем прогресс
                    achievements.progress[ach.id] = {
                        completed: true,
                        timestamp: new Date(),
                        character: ach.character || null,
                        targetTrophies: ach.targetTrophies || null
                    };

                    // ТОЛЬКО НОТИФИКАЦИЯ - БЕЗ ПРЯМОГО НАЧИСЛЕНИЯ
                    await this.giveReward(account, ach.reward);

                    newAchievements.push({
                        id: ach.id,
                        name: ach.name,
                        description: ach.description,
                        reward: ach.reward
                    });

                    hasChanges = true;
                }
            }

            // Если есть изменения - сохраняем
            if (hasChanges) {
                achievements.lastChecked = new Date();
                await database.updateAchievements(lowID, achievements);
                console.log(`[ACHIEVEMENTS] 💾 Сохранено ${newAchievements.length} ачивок для ${account.Name}`);
            }

            return newAchievements;
        } catch (error) {
            console.error('[ACHIEVEMENTS] Ошибка проверки:', error);
            return [];
        }
    }

    /**
     * Проверка условия ачивки
     */
    static async checkCondition(account, ach) {
        // Трофейные ачивки
        if (ach.type === 'trophy') {
            const targetTrophies = ach.targetTrophies || 1250;
            const characterId = ach.character;
            
            const brawler = account.Brawlers?.find(b => b.id === characterId);
            if (!brawler) {
                return false;
            }

            const currentTrophies = brawler.trophies || 0;
            return currentTrophies >= targetTrophies;
        }

        return false;
    }

    /**
     * ВЫДАЧА НАГРАДЫ - ТОЛЬКО ЧЕРЕЗ НОТИФИКАЦИЮ
     */
    static async giveReward(account, reward) {
        try {
            console.log(`[ACHIEVEMENTS] 📦 Выдача награды через нотиф:`, JSON.stringify(reward));

            let notifications = account.notifications || [];

            // ГЕМЫ - только нотиф
            if (reward.gems && reward.gems > 0) {
                notifications.push({
                    NotificationID: 89,
                    NotificationRead: false,
                    NotificationTime: Math.floor(Date.now() / 1000),
                    NotificationText: `🏆 Достижение! +${reward.gems}💎`,
                    Gems: reward.gems
                });
                console.log(`[ACHIEVEMENTS] 📨 Нотиф с гемами +${reward.gems} добавлен`);
            }

            // ЗОЛОТО - можно сразу или тоже через нотиф
            if (reward.gold && reward.gold > 0) {
                // Вариант 1: сразу начисляем
                const oldGold = account.Gold || 0;
                const newGold = oldGold + reward.gold;
                await database.replaceValue(account.token, 'Gold', newGold);
                account.Gold = newGold;
                console.log(`[ACHIEVEMENTS] 🪙 Золото +${reward.gold} начислено сразу`);

                // Вариант 2: через нотиф (раскомментировать если нужно)
                // notifications.push({
                //     NotificationID: 81,
                //     NotificationRead: false,
                //     NotificationTime: Math.floor(Date.now() / 1000),
                //     NotificationText: `🏆 Достижение! +${reward.gold}🪙`,
                //     NotificationType: 0
                // });
            }

            // Сохраняем нотифы
            if (notifications.length > 0) {
                account.notifications = notifications;
                await database.replaceValue(account.token, 'notifications', account.notifications);
                console.log(`[ACHIEVEMENTS] 📨 ${notifications.length} нотифов сохранено`);
            }

            // Отправка в Telegram
            await this.sendTelegramNotification(account, reward);

            return true;
        } catch (error) {
            console.error('[ACHIEVEMENTS] Ошибка выдачи награды:', error);
            return false;
        }
    }

    /**
     * Отправка уведомления в Telegram
     */
    static async sendTelegramNotification(account, reward) {
        try {
            const fs = require('fs').promises;
            const tgaccPath = './Laser.Server/tgacc.json';
            
            let tgacc = [];
            try {
                const data = await fs.readFile(tgaccPath, 'utf8');
                tgacc = JSON.parse(data);
            } catch (e) {
                return;
            }

            const user = tgacc.find(a => a.lowID === account.lowID);
            if (!user) return;

            const bot = require('../bot');
            
            let message = `🎉 *НОВОЕ ДОСТИЖЕНИЕ!*\n\n`;
            message += `👤 *Игрок:* ${account.Name}\n\n`;
            
            if (reward.gems) {
                message += `💎 *Награда:* +${reward.gems} гемов (заберите в игре!)\n`;
            }
            if (reward.gold) {
                message += `🪙 *Награда:* +${reward.gold} золота\n`;
            }
            
            message += `\n👏 Продолжайте в том же духе!`;

            await bot.telegram.sendMessage(user.id, message, {
                parse_mode: 'Markdown'
            });
            console.log(`[ACHIEVEMENTS] ✅ Уведомление в Telegram для ${account.Name}`);

        } catch (error) {
            console.error('[ACHIEVEMENTS] Ошибка отправки в Telegram:', error);
        }
    }

    /**
     * Конвертация lowID в тег
     */
    static lowIdToTag(lowId) {
        const TagChar = ["0", "2", "8", "9", "P", "Y", "L", "Q", "G", "R", "J", "C", "U", "V"];
        const high = Math.floor(lowId / 256);
        const low = lowId % 256;
        let id = (high << 8) | low;
        let tag = '';
        while (id > 0) {
            tag = TagChar[id % TagChar.length] + tag;
            id = Math.floor(id / TagChar.length);
        }
        return tag || '0';
    }

    /**
     * Инициализация ачивок для нового игрока
     */
    static async initializeAchievements(lowID) {
        const config = require('../Achievements/achievements.json');
        const achievements = {
            unlocked: [],
            progress: {},
            lastChecked: new Date()
        };
        
        config.achievements.forEach(ach => {
            achievements.progress[ach.id] = {
                completed: false,
                timestamp: null,
                character: ach.character || null,
                targetTrophies: ach.targetTrophies || null
            };
        });
        
        await database.updateAchievements(lowID, achievements);
        return achievements;
    }
}

module.exports = AchievementManager;
