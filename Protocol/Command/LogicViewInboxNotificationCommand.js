const PiranhaMessage = require('../PiranhaMessage');
const ByteStream = require("../../ByteStream");
const database = require("../../db/PlayerManager");
const LogicDeliveryNotification = require('./LogicDeliveryNotification');

class LogicViewInboxNotificationCommand extends PiranhaMessage {
    constructor(bytes, session) {
        super(bytes);
        this.session = session;
        this.commandID = 528;
        this.version = 0;
        this.stream = new ByteStream(bytes);
    }

    decode() {
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
        this.index = this.stream.readVInt();
    }

    async process() {
        const account = await database.getAccount(this.session.player);
        const foundNotification = account.notifications?.[this.index];
        
        if (!foundNotification) {
            console.log(`[NOTIF] Уведомление с индексом ${this.index} не найдено`);
            return;
        }

        if (foundNotification.NotificationRead) {
            console.log(`[NOTIF] Уведомление уже прочитано`);
            return;
        }

        console.log(`[NOTIF] Обработка нотифа: ID=${foundNotification.NotificationID}`);

        switch (foundNotification.NotificationID) {
            case 89: { // Кристаллы
                const gemsAmount = foundNotification.Gems || 0;
                if (gemsAmount > 0) {
                    const oldGems = account.Gems || 0;
                    account.Gems = oldGems + gemsAmount;
                    await database.replaceValue(account.token, 'Gems', account.Gems);
                    console.log(`[NOTIF] 💎 Начислено ${gemsAmount} гемов (было ${oldGems}, стало ${account.Gems})`);

                    setTimeout(() => {
                        try {
                            new LogicDeliveryNotification(this.session, undefined, undefined, gemsAmount).send();
                        } catch (e) {
                            console.error('[NOTIF] Ошибка отправки анимации:', e);
                        }
                    }, 100);
                }
                break;
            }

            case 94: { // Скин
                const skinId = foundNotification.SkinID;
                if (skinId !== undefined && skinId !== null) {
                    if (!account.Skins) {
                        account.Skins = [];
                    }
                    if (!account.Skins.includes(skinId)) {
                        account.Skins.push(skinId);
                        await database.replaceValue(account.token, 'Skins', account.Skins);
                        console.log(`[NOTIF] 🎨 Скин ${skinId} добавлен`);

                        setTimeout(() => {
                            try {
                                new LogicDeliveryNotification(this.session, skinId, undefined, undefined).send();
                            } catch (e) {
                                console.error('[NOTIF] Ошибка отправки анимации скина:', e);
                            }
                        }, 100);
                    } else {
                        console.log(`[NOTIF] Скин ${skinId} уже есть`);
                    }
                }
                break;
            }

            case 81: { // Обычное уведомление
                console.log(`[NOTIF] 📨 Обычное уведомление: ${foundNotification.NotificationText}`);
                break;
            }

            default: {
                console.log(`[NOTIF] Неизвестный тип: ${foundNotification.NotificationID}`);
                break;
            }
        }

        foundNotification.NotificationRead = true;
        await database.replaceValue(account.token, 'notifications', account.notifications);
        console.log(`[NOTIF] ✅ Нотиф отмечен как прочитанный`);
    }
}

module.exports = LogicViewInboxNotificationCommand;
