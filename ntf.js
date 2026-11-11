const { MongoClient } = require("mongodb");

const DB_URL = "mongodb://localhost:27017";
const DB_NAME = "jevilv27";
const ACCOUNTS_COLLECTION = "acc";

async function updateAllAccountsWithSkinSpecial() {
    let client;
    
    try {
        console.log("Подключаюсь к MongoDB...");
        client = new MongoClient(DB_URL);
        await client.connect();
        
        const db = client.db(DB_NAME);
        const accountsCollection = db.collection(ACCOUNTS_COLLECTION);
        
        console.log("Начинаю обновление уведомлений...");
        
        const allPlayers = await accountsCollection.find({}).toArray();
        console.log(`Найдено аккаунтов: ${allPlayers.length}`);
        
        let updatedCount = 0;
        let errorCount = 0;

        for (const account of allPlayers) {
            try {
                // Для теста - только гемы (работает)
                const notifications = [
                    {
                        'NotificationID': 94,
                        'NotificationRead': false,
                        'NotificationTime': Math.floor(Date.now() / 1000),
                        'NotificationText': null,
                        'SkinID': 69
                    }, 
                    {
                        'NotificationID': 89,
                        'NotificationRead': false,
                        'NotificationTime': Math.floor(Date.now() / 1000),
                        'NotificationText': 'гемчики',
                        'Gems': 9999
                    }
                ];
                
                await accountsCollection.updateOne(
                    { _id: account._id },
                    { $set: { notifications: notifications } }
                );
                
                updatedCount++;
                
                if (updatedCount % 100 === 0) {
                    console.log(`Обработано: ${updatedCount} аккаунтов`);
                }
                
            } catch (error) {
                console.error(`Ошибка при обновлении аккаунта ${account.lowID}:`, error.message);
                errorCount++;
            }
        }
        
        console.log("\n=== ОТЧЕТ ===");
        console.log(`Всего аккаунтов: ${allPlayers.length}`);
        console.log(`Успешно обновлено: ${updatedCount}`);
        console.log(`Ошибок: ${errorCount}`);
        console.log("Все аккаунты теперь имеют уведомление с гемами (скин временно отключен)!");
        
    } catch (error) {
        console.error("Критическая ошибка:", error);
    } finally {
        if (client) {
            await client.close();
            console.log("Соединение с базой закрыто");
        }
        process.exit(0);
    }
}

updateAllAccountsWithSkinSpecial();