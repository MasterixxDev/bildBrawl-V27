const fs = require('fs').promises;
const path = require('path');
const database = require("../db/PlayerManager");

class SeasonReset {
    constructor() {
        this.resetFile = path.join(__dirname, 'lastReset.txt');
    }

    async checkAndResetSeason() {
        try {
            const shouldReset = await this.shouldResetSeason();
            
            if (shouldReset) {
                console.log('🔄 Запуск автоматического сброса сезона...');
                await this.resetAllPlayersSeason();
                await this.updateLastResetTime();
                console.log('✅ Сброс сезона завершен');
            }
        } catch (error) {
            console.error('❌ Ошибка при проверке сброса сезона:', error);
        }
    }

    async shouldResetSeason() {
        try {
            const data = await fs.readFile(this.resetFile, 'utf8');
            const lastReset = parseInt(data);
            const twoWeeks = 14 * 24 * 60 * 60 * 1000;
            const currentTime = Date.now();

            return (currentTime - lastReset) >= twoWeeks;
        } catch (error) {
            return true;
        }
    }

    async updateLastResetTime() {
        await fs.writeFile(this.resetFile, Date.now().toString());
    }

    async resetAllPlayersSeason() {
        try {
            const allPlayers = await database.getAllPlayers();
            let resetCount = 0;
            let skippedCount = 0;

            for (const player of allPlayers) {
                const hasHighTrophies = this.hasBrawlerWithHighTrophies(player);
                
                if (hasHighTrophies) {
                    await this.resetPlayerSeason(player);
                    resetCount++;
                } else {
                    skippedCount++;
                }
            }

            console.log(`✅ Сброшен сезон для ${resetCount} игроков (${skippedCount} пропущено - нет бравлеров с 550+ трофеев)`);
        } catch (error) {
            console.error('Ошибка при сбросе сезона игроков:', error);
        }
    }

    hasBrawlerWithHighTrophies(player) {
        // Проверяем есть ли хотя бы один бравлер с 550+ трофеями
        if (!player.Brawlers || !Array.isArray(player.Brawlers)) {
            return false;
        }
        
        return player.Brawlers.some(brawler => {
            const trophies = brawler.trophies || 0;
            return trophies >= 550;
        });
    }

    async resetPlayerSeason(player) {
        let totalStarpoints = 0;
        let newAllTrophies = 0;
        let resetBrawlers = [];

        // Обрабатываем только бравлеров с 550+ трофеями
        if (player.Brawlers && Array.isArray(player.Brawlers)) {
            for (const brawler of player.Brawlers) {
                const brawlerTrophies = brawler.trophies || 0;
                
                if (brawlerTrophies >= 550) {
                    const resetData = this.calculateBrawlerReset(brawlerTrophies);
                    
                    // Обновляем трофеи бравлера
                    brawler.trophies = resetData.newTrophies;
                    newAllTrophies += resetData.newTrophies;
                    totalStarpoints += resetData.starpoints;
                    resetBrawlers.push({
                        id: brawler.id,
                        oldTrophies: brawlerTrophies,
                        newTrophies: resetData.newTrophies,
                        starpoints: resetData.starpoints
                    });
                } else {
                    // Бравлеры с <550 трофеями не сбрасываются
                    newAllTrophies += brawlerTrophies;
                }
            }

            // Создаем уведомление о конце сезона только если есть сброшенные бравлеры
            if (resetBrawlers.length > 0) {
                const seasonNotification = {
                    'NotificationID': 79,
                    'NotificationRead': false,
                    'NotificationTime': Math.floor(Date.now() / 1000),
                    'NotificationText': 'Сезон завершен! Получите награды.',
                    'Brawlers': resetBrawlers.map(b => b.id),
                    'TrophiesPlus': resetBrawlers.map(b => Math.floor(b.oldTrophies * 0.1)),
                    'TrophiesMinus': resetBrawlers.map(b => b.oldTrophies - b.newTrophies),
                    'Starpoints': resetBrawlers.map(b => b.starpoints)
                };

                // Добавляем уведомление
                if (!player.notifications) {
                    player.notifications = [];
                }
                player.notifications.unshift(seasonNotification);

                // Обновляем звездные очки и общие трофеи
                player.Starpoints = (player.Starpoints || 0) + totalStarpoints;
                player.Trophies = newAllTrophies;

                // Сохраняем изменения
                await database.replaceValue(player.token, "notifications", player.notifications);
                await database.replaceValue(player.token, "Brawlers", player.Brawlers);
                await database.replaceValue(player.token, "Starpoints", player.Starpoints);
                await database.replaceValue(player.token, "Trophies", player.Trophies);

                console.log(`📊 Игрок ${player.Name}: сброшено ${resetBrawlers.length} бравлеров, +${totalStarpoints} звездных очков`);
            }
        }

        return { starpoints: totalStarpoints, resetBrawlers: resetBrawlers.length };
    }

    calculateBrawlerReset(brawlerTrophies) {
        let newTrophies = brawlerTrophies;
        let starpoints = 0;

        if (brawlerTrophies >= 550 && brawlerTrophies <= 599) {
            newTrophies = 549;
            starpoints = 70;
        } else if (brawlerTrophies >= 600 && brawlerTrophies <= 649) {
            newTrophies = 599;
            starpoints = 90;
        } else if (brawlerTrophies >= 650 && brawlerTrophies <= 699) {
            newTrophies = 649;
            starpoints = 110;
        } else if (brawlerTrophies >= 700 && brawlerTrophies <= 749) {
            newTrophies = 699;
            starpoints = 130;
        } else if (brawlerTrophies >= 750 && brawlerTrophies <= 799) {
            newTrophies = 749;
            starpoints = 150;
        } else if (brawlerTrophies >= 800 && brawlerTrophies <= 849) {
            newTrophies = 799;
            starpoints = 170;
        } else if (brawlerTrophies >= 850 && brawlerTrophies <= 899) {
            newTrophies = 849;
            starpoints = 190;
        } else if (brawlerTrophies >= 900 && brawlerTrophies <= 949) {
            newTrophies = 899;
            starpoints = 210;
        } else if (brawlerTrophies >= 950 && brawlerTrophies <= 999) {
            newTrophies = 949;
            starpoints = 230;
        } else if (brawlerTrophies >= 1000 && brawlerTrophies <= 1049) {
            newTrophies = 999;
            starpoints = 250;
        } else if (brawlerTrophies >= 1050 && brawlerTrophies <= 1099) {
            newTrophies = 1049;
            starpoints = 260;
        } else if (brawlerTrophies >= 1100 && brawlerTrophies <= 1149) {
            newTrophies = 1099;
            starpoints = 270;
        } else if (brawlerTrophies >= 1150 && brawlerTrophies <= 1199) {
            newTrophies = 1149;
            starpoints = 280;
        } else if (brawlerTrophies >= 1200) {
            newTrophies = 1199;
            starpoints = 300;
        }

        return { newTrophies, starpoints };
    }
}

module.exports = SeasonReset;