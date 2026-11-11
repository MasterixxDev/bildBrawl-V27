const database = require('./db/PlayerManager');
const AchievementManager = require('./db/AchievementManager');

async function checkAllPlayersAchievements() {
    try {
        console.log('[ACHIEVEMENTS] 🔍 Проверка ачивок...');
        
        // Получаем всех игроков через правильный метод
        const allPlayers = await database.getAllPlayers();
        
        if (!allPlayers || allPlayers.length === 0) {
            console.log('[ACHIEVEMENTS] ❌ Нет игроков в базе');
            return;
        }
        
        let totalNew = 0;
        
        for (const player of allPlayers) {
            try {
                const newAchievements = await AchievementManager.checkAchievements(
                    player.lowID,
                    player
                );
                if (newAchievements && newAchievements.length > 0) {
                    totalNew += newAchievements.length;
                    console.log(`[ACHIEVEMENTS] 🏆 Игрок ${player.Name} получил ${newAchievements.length} ачивок!`);
                }
            } catch (e) {
                console.error(`[ACHIEVEMENTS] Ошибка для ${player.Name}:`, e.message);
            }
        }
        
        if (totalNew > 0) {
            console.log(`[ACHIEVEMENTS] 📊 Всего выдано ${totalNew} новых ачивок`);
        }
    } catch (error) {
        console.error('[ACHIEVEMENTS] Критическая ошибка:', error);
    }
}

// Запускаем сразу при старте
async function init() {
    try {
        console.log('[ACHIEVEMENTS] 🔌 Подключение к MongoDB...');
        await database.connectToDB();
        console.log('[ACHIEVEMENTS] ✅ Подключено к MongoDB');
        
        console.log('[ACHIEVEMENTS] 🚀 Запущен планировщик ачивок (каждую минуту)');
        
        // Первый запуск сразу
        await checkAllPlayersAchievements();
        
        // Затем каждую минуту
        setInterval(checkAllPlayersAchievements, 60000);
    } catch (error) {
        console.error('[ACHIEVEMENTS] ❌ Ошибка инициализации:', error);
        process.exit(1);
    }
}

init();
