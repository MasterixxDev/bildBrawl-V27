const database = require("./db/PlayerManager");
const SeasonReset = require("./Utils/seasonReset");

async function manualSeasonReset() {
    try {
        console.log('🔄 Подключаемся к базе данных...');
        await database.connectToDB();
        
        console.log('🎮 Запуск РУЧНОГО сброса сезона...');
        const seasonReset = new SeasonReset(); // УБРАТЬ ЭТУ СТРОКУ ИЗ checkseason КОМАНДЫ
        await seasonReset.resetAllPlayersSeason();
        await seasonReset.updateLastResetTime();
        
        console.log('✅ Ручной сброс сезона успешно завершен!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка при ручном сбросе сезона:', error);
        process.exit(1);
    }
}

// Запускаем сразу при выполнении скрипта
manualSeasonReset();