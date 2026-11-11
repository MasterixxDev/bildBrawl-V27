const database = require("../db/PlayerManager");

class Notifications {
    constructor(account) {
        this.account = account;
    }

    encode(stream) {
        const messages = this.account.notifications || [];
        
        if (messages.length === 0) {
            stream.writeVInt(0);
        } else {
            stream.writeVInt(messages.length);
            
            for (let i = 0; i < messages.length; i++) {
                const item = messages[i];
                
                stream.writeVInt(item.NotificationID);
                stream.writeInt(i);
                stream.writeBoolean(item.NotificationRead || false);
                stream.writeInt(item.NotificationTime || Math.floor(Date.now() / 1000));
                stream.writeString(item.NotificationText || '');

                if (item.NotificationID === 81) {
                    stream.writeVInt(item.NotificationType || 0);
                } 
                else if (item.NotificationID === 82) {
                    stream.writeString(item.SenderName || '');
                    stream.writeVInt(100);
                    stream.writeVInt(28000000 + (item.SenderThumbnail || 0));
                    stream.writeVInt(43000000 + (item.SenderNameColor || 0));
                } 
                else if (item.NotificationID === 74) {
                    stream.writeVInt(item.Tickets || 0);
                    stream.writeVInt(item.Gems || 0);
                } 
                else if (item.NotificationID === 79) {
                    const brawlersCount = item.Brawlers ? item.Brawlers.length : 0;
                    stream.writeVInt(brawlersCount);
                    
                    for (let brawler = 0; brawler < brawlersCount; brawler++) {
                        stream.writeVInt(16000000 + (item.Brawlers[brawler] || 0));
                        stream.writeVInt(item.TrophiesPlus ? item.TrophiesPlus[brawler] || 0 : 0);
                        stream.writeVInt(item.TrophiesMinus ? item.TrophiesMinus[brawler] || 0 : 0);
                        stream.writeVInt(item.Starpoints ? item.Starpoints[brawler] || 0 : 0);
                    }
                }
                else if (item.NotificationID === 89) { // Кристаллы
                    stream.writeVInt(0);
                    stream.writeVInt(item.Gems || 0);
                }
                else if (item.NotificationID === 94) { // Скин
                    //stream.writeVInt(1);
                    stream.writeVInt(29000000 + (item.SkinID || 0));
                }
            }
        }
    }

    static async createDefaultMessages() {
        return [
            {
                'NotificationID': 81,
                'NotificationRead': false,
                'NotificationTime': Math.floor(Date.now() / 1000),
                'NotificationText': 'Добро пожаловать в Jevil Brawl!',
                'NotificationType': 0
            }
        ];
    }

    static async addCustomMessage(account, text, notificationType = 0) {
        if (!account.notifications) {
            account.notifications = [];
        }
        
        const notification = {
            'NotificationID': 81,
            'NotificationRead': false,
            'NotificationTime': Math.floor(Date.now() / 1000),
            'NotificationText': text,
            'NotificationType': notificationType
        };
        
        account.notifications.push(notification);
        await database.replaceValue(account.token, "notifications", account.notifications);
        
        return account.notifications;
    }

    static async addClubMessage(account, senderName, text, thumbnail = 0, nameColor = 0) {
        if (!account.notifications) {
            account.notifications = [];
        }
        
        const notification = {
            'NotificationID': 82,
            'NotificationRead': false,
            'NotificationTime': Math.floor(Date.now() / 1000),
            'NotificationText': text,
            'SenderName': senderName,
            'SenderThumbnail': thumbnail,
            'SenderNameColor': nameColor
        };
        
        account.notifications.push(notification);
        await database.replaceValue(account.token, "notifications", account.notifications);
        
        return account.notifications;
    }

    static async addSkinReward(account, skinId, text = "Получите бесплатный скин!") {
        if (!account.notifications) {
            account.notifications = [];
        }
        
        const notification = {
            'NotificationID': 94,
            'NotificationRead': false,
            'NotificationTime': Math.floor(Date.now() / 1000),
            'NotificationText': text,
            'SkinID': skinId
        };
        
        account.notifications.push(notification);
        await database.replaceValue(account.token, "notifications", account.notifications);
        
        return account.notifications;
    }

    static async addGemsReward(account, gemsAmount, text = "Бонусные гемы!") {
        if (!account.notifications) {
            account.notifications = [];
        }
        
        const notification = {
            'NotificationID': 89,
            'NotificationRead': false,
            'NotificationTime': Math.floor(Date.now() / 1000),
            'NotificationText': text,
            'Gems': gemsAmount
        };
        
        account.notifications.push(notification);
        await database.replaceValue(account.token, "notifications", account.notifications);
        
        return account.notifications;
    }

    static async hasNotifications(account) {
        return account.notifications && account.notifications.length > 0;
    }

    static async getNotificationCount(account) {
        return account.notifications ? account.notifications.length : 0;
    }

    static async clearNotifications(account) {
        account.notifications = [];
        await database.replaceValue(account.token, "notifications", []);
    }

    static async initializeDefaultNotifications(account) {
        if (!account.notifications || account.notifications.length === 0) {
            account.notifications = await this.createDefaultMessages();
            await database.replaceValue(account.token, "notifications", account.notifications);
        }
        return account.notifications;
    }
}

module.exports = Notifications;