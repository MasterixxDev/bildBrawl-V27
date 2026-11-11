const PiranhaMessage = require("../../../PiranhaMessage");
const ByteStream = require("../../../../ByteStream");
const LoginOKMessage = require("../../Server/Auth/LoginOKMessage");
const OwnHomeDataMessage = require("../../Server/Auth/OwnHomeDataMessage");
const database = require("../../../../db/PlayerManager");
const Shop = require('../../../../Logic/Shop');
const LoginFailedMessage = require("../../Server/Auth/LoginFailedMessage");
const QuestManager = require("../../../../Logic/QuestManager");

const MyClubMessage = require("../../Server/Auth/MyClubMessage");
const AllianceStreamMessage = require("../../Server/Auth/AllianceStreamMessage");

const crypto = require("crypto");

class LoginMessage extends PiranhaMessage {
    constructor(bytes, session) {
        super(session);
        this.session = session;
        this.id = 10101;
        this.version = 0;
        this.stream = new ByteStream(bytes);
    }

    async decode() {
        this.stream.readInt();
        this.session.player.lowID = this.stream.readInt();
        this.session.player.token = this.stream.readString();
    }

    async process() {
        let account;

        if (!this.session.player.token || this.session.player.token === "") {
            this.session.player.token = crypto
                .randomBytes(Math.ceil(36 / 2))
                .toString("hex")
                .slice(0, 36);
            account = await database.createAccount(this.session.player);
        } else {
            account = await database.getAccount(this.session.player);
        }

        if (!account) {
            return new LoginFailedMessage(
                this.session,
                `Ваш аккаунт ненайден, нужно переустановить игру!\nYour account is not found, you need to reinstall the game!`,
                18
            ).send();
        }

        // Автоматическое добавление недостающих полей
        account = await this.addMissingFields(account);

        Object.assign(this.session.player, account);
        
        this.session.player.lowID = account.lowID;
        this.session.player.token = account.token;
        
        this.session.player.ClubID = account.ClubID || 0;
        this.session.player.ClubRole = account.ClubRole || 0;

        console.log(`Вход игрока: ${account.Name}, LowID: ${account.lowID}, ClubID: ${account.ClubID}`);

        // Проверка VIP статуса
        await this.checkVipStatus(account);

        // ============================================================
        // 🎯 КВЕСТЫ — НЕ ЛОМАЕМ ВХОД
        // ============================================================
        try {
            // Проверяем, что поле quests существует
            if (!account.quests) {
                account.quests = [];
                await database.replaceValue(account.token, 'quests', account.quests);
                console.log(`[QUESTS] 🆕 Создано поле quests для ${account.Name}`);
            }
            
            // Если квестов нет — генерируем
            if (account.quests.length === 0) {
                account.quests = QuestManager.generateDailyQuests(account);
                await database.replaceValue(account.token, 'quests', account.quests);
                console.log(`[QUESTS] 🆕 Сгенерированы квесты для ${account.Name}`);
            } else {
                // Проверяем, не пора ли обновить квесты
                const updated = await QuestManager.refreshDailyQuests(account);
                if (updated !== account.quests) {
                    account.quests = updated;
                    console.log(`[QUESTS] 🔄 Обновлены квесты для ${account.Name}`);
                }
            }
        } catch (error) {
            // Если квесты сломались — НЕ ЛОМАЕМ ВХОД!
            console.error('[QUESTS] Ошибка (игнорируем):', error.message);
        }
        // ============================================================

        new LoginOKMessage(this.session).send();
        
        if (account.Shop.length === 0 || account.Shop[0].EndDate === undefined || Math.floor((new Date(account.Shop[0].EndDate) - new Date()) / 1000) <= 0) {
            account.Shop = new Shop().generateShop(account);
            await database.replaceValue(this.session.player.token, 'Shop', account.Shop);
        }

        new OwnHomeDataMessage(this.session, account).send();

        if (account.ClubID !== 0) {
            const db = database.getDB();
            let gettingClub = await database.getClub(db, account.ClubID);
            
            if (gettingClub === null) {
                await database.replaceValue(this.session.player.token, 'ClubID', 0);
                this.session.player.ClubID = 0;
                this.session.player.ClubRole = 0;
            } else if (!gettingClub.members.some(member => member.lowID === account.lowID)) {
                await database.replaceValue(this.session.player.token, 'ClubID', 0);
                this.session.player.ClubID = 0;
                this.session.player.ClubRole = 0;
            } else {
                this.session.ClubRole = account.ClubRole;
                this.session.ClubID = account.ClubID;
                
                const clubData = {
                    clubID: gettingClub.clubLowID,
                    Name: gettingClub.clubName,
                    Trophies: gettingClub.clubtrophies || 0,
                    Description: gettingClub.clubdescription || "",
                    BadgeID: gettingClub.clubbadgeID || 1,
                    Region: gettingClub.clubregion || "RU",
                    members: gettingClub.members,
                    data: {
                        Type: gettingClub.clubtype || 1,
                        Trophiesneeded: gettingClub.clubtrophiesneeded || 0,
                        FriendlyFamily: gettingClub.clubfriendlyfamily || 0,
                        Description: gettingClub.clubdescription || ""
                    }
                };

                const clubMessages = await database.getClubMessages(account.ClubID, 150);
                
                await new MyClubMessage(this.session, clubData, false).send();
                await new AllianceStreamMessage(this.session, clubMessages).send();
                
                console.log(`Клубные пакеты отправлены для: ${gettingClub.clubName}, сообщений: ${clubMessages.length}`);
            }
        }
        
        if (this.session.player.ClubID === 0) {
            new MyClubMessage(this.session, null, true).send();
        }
    }

    /**
     * Проверка VIP статуса
     */
    async checkVipStatus(account) {
        if (account.vip === 1 && account.vipEndDate) {
            const now = new Date();
            const vipEnd = new Date(account.vipEndDate);
            
            if (vipEnd < now) {
                await database.replaceValue(this.session.player.token, 'vip', 0);
                await database.replaceValue(this.session.player.token, 'vipEndDate', null);
                this.session.player.vip = 0;
                
                const vipEndNotif = {
                    NotificationID: 81,
                    NotificationRead: false,
                    NotificationTime: Math.floor(Date.now() / 1000),
                    NotificationText: '❌ Ваш VIP статус истек. Вы можете приобрести его снова в донат магазине.',
                    NotificationType: 0
                };
                
                account.notifications.push(vipEndNotif);
                await database.replaceValue(this.session.player.token, 'notifications', account.notifications.slice(-50));
                console.log(`VIP истек для ${account.Name}`);
            } else {
                const timeLeft = vipEnd - now;
                const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
                
                if (daysLeft <= 4 && (!account.vipLastChecked || new Date(account.vipLastChecked).getDate() !== now.getDate())) {
                    let notificationText = '';
                    
                    if (daysLeft === 4) {
                        notificationText = `⚠️ Ваш VIP статус истекает через 4 дня. Не упустите привилегии!`;
                    } else if (daysLeft === 3) {
                        notificationText = `⚠️ VIP статус истекает через 3 дня. Продлите его в донат магазине!`;
                    } else if (daysLeft === 2) {
                        notificationText = `⏰ VIP истекает через 2 дня! Успейте продлить!`;
                    } else if (daysLeft === 1) {
                        notificationText = `🚨 VIP заканчивается ЗАВТРА! Последний шанс продлить!`;
                    } else if (timeLeft <= 60 * 60 * 1000) {
                        notificationText = `🔥 VIP истекает через 1 час! Срочно продлите!`;
                    }
                    
                    if (notificationText) {
                        const vipWarningNotif = {
                            NotificationID: 81,
                            NotificationRead: false,
                            NotificationTime: Math.floor(Date.now() / 1000),
                            NotificationText: notificationText,
                            NotificationType: 0
                        };
                        
                        account.notifications.push(vipWarningNotif);
                        await database.replaceValue(this.session.player.token, 'notifications', account.notifications.slice(-50));
                        console.log(`Отправлено VIP предупреждение для ${account.Name}: ${daysLeft} дней осталось`);
                    }
                    
                    await database.replaceValue(this.session.player.token, 'vipLastChecked', now);
                }
            }
        }
    }

    /**
     * Добавление недостающих полей
     */
    async addMissingFields(account) {
        const defaultAccount = {
            Trophies: 0,
            TrophyRoadTier: 0,
            Experience: 0,
            Thumbnail: 0,
            Namecolor: 0,
            TokensDoubler: 0,
            BattleTokens: 0,
            Tickets: 0,
            Starpoints: 0,
            BigBoxTokens: 0,
            Gold: 0,
            boxTokens: 0,
            Gems: 0,
            BrawlerID: 0,
            SkinID: 0,
            AuthorCode: "",
            Name: "Player",
            ClubID: 0,
            ClubRole: 0,
            TrioWINS: 0,
            SoloWINS: 0,
            Vip: 0,
            vipEndDate: null,
            vipLastChecked: null,
            Status: "",
            Shop: [],
            Skins: [],
            Brawlers: await this.getBrawlerArray(),
            Box: 0,
            BigBox: 0,
            BrawlPass: 0,
            BPToken: 0,
            BPPaidProgress: 1,
            BPFreeProgress: 1,
            claimedBPRewards: {
                paid: [],
                free: []
            },
            notifications: [],
            achievements: {
                unlocked: [],
                progress: {},
                lastChecked: new Date()
            },
            totalBattles: 0,
            totalWins: 0,
            quests: [] // ← ДОБАВЛЯЕМ ПОЛЕ ДЛЯ КВЕСТОВ
        };

        let updated = false;
        const updates = {};

        for (const [key, defaultValue] of Object.entries(defaultAccount)) {
            if (account[key] === undefined || account[key] === null) {
                account[key] = defaultValue;
                updates[key] = defaultValue;
                updated = true;
                console.log(`Добавлено поле ${key}`);
            }
        }

        if (updated && Object.keys(updates).length > 0) {
            try {
                await database.updateAccountFields(this.session.player.token, updates);
                console.log(`Обновлены поля для аккаунта ${account.Name}: ${Object.keys(updates).join(', ')}`);
            } catch (error) {
                console.error("Ошибка при обновлении полей аккаунта:", error);
            }
        }

        return account;
    }

    async getBrawlerArray() {
        const Cards = require("../../../../CSVParser/Cards");
        const UnlockCards = Cards.getBrawlersUnlocks();
        const unlockCardsArray = Object.values(UnlockCards);
        
        const arrays = [];
        for (let i = 0; i < 37; i++) {
            let unlock = i === 0 ? true : false;
            arrays.push({
                id: i,
                cardID: unlockCardsArray[i],
                skill: 0,
                unlocked: unlock,
                level: 0,
                points: 0,
                trophies: 0,
            });
        }
        return arrays;
    }
}

module.exports = LoginMessage;
