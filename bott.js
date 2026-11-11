const { Telegraf, session, Scenes: { BaseScene, Stage }, Markup } = require('telegraf');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const express = require('express');
const Character = require("./CSVParser/Characters");

const API_TOKEN = '8634247976:AAFdopNbhYG8j8ziGBT4F5VTmOW_sZblIiM';
const ADMIN_IDS = [6626580689, 7445599403];
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'jevilv26';
const COLLECTION_NAME = 'acc';
const TGACC_FILE = './Laser.Server/tgacc.json';
const fs = require('fs').promises;

// ============================================
// 📦 ПРАЙС НА ДОНАТ
// ============================================

const DONATE_PRICES = {
    gems: [
        { amount: 170, price: 45 },
        { amount: 360, price: 75 },
        { amount: 1500, price: 200 },
        { amount: 2000, price: 250 },
        { amount: 3000, price: 350 },
        { amount: 5000, price: 500 },
        { amount: 10000, price: 800 }
    ],
    vip: {
        price: 100,
        duration: '30 дней',
        rewards: {
            gems: 260,
            skin: 'Шелли'
        }
    }
};

class DonationBot {
    constructor() {
        this.bot = new Telegraf(API_TOKEN);
        this.client = null;
        this.db = null;
        this.accounts = null;
        this.skins = [];
        this.setupScenes();
        this.init();
        this.startWebhookServer();
    }

    setupScenes() {
        const buyScene = new BaseScene('buyScene');
        
        buyScene.enter(async (ctx) => {
            await ctx.reply(
                '🛒 Для покупки обратитесь к менеджеру:\n\n' +
                '👤 @Xperia9339\n\n' +
                '📌 Укажите:\n' +
                '• Ваш игровой тег\n' +
                '• Что хотите купить\n' +  
                '• Сумму доната',
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💬 Написать менеджеру', url: 'https://t.me/Xperia9339' }],
                            [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
                        ]
                    }
                }
            );
            await ctx.scene.leave();
        });

        this.stage = new Stage([buyScene]);
        this.bot.use(session());
        this.bot.use(this.stage.middleware());
    }

    async init() {
        try {
            console.log('🔄 Подключение к MongoDB...');
            this.client = new MongoClient(MONGODB_URI);
            await this.client.connect();
            this.db = this.client.db(DB_NAME);
            this.accounts = this.db.collection(COLLECTION_NAME);
            this.loadSkins();
            console.log('✅ Бот инициализирован');
            this.setupHandlers();
            this.startBot();
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }
    }

    loadSkins() {
        try {
            const parse = require("./CSVParser/CSVParser");
            const skinsData = parse("./CSVParser/CSV/csv_logic/skins.csv");
            this.skins = skinsData.map((skin, index) => ({
                id: index,
                cost: skin.Cost || 0,
                name: skin.Name || ''
            }));
            console.log(`✅ Загружено скинов: ${this.skins.length}`);
        } catch (error) {
            console.error('❌ Ошибка загрузки скинов:', error);
            this.skins = [];
        }
    }

    async loadTgacc() {
        try {
            const data = await fs.readFile(TGACC_FILE, 'utf8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    async saveTgacc(tgacc) {
        const dir = TGACC_FILE.split('/').slice(0, -1).join('/');
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(TGACC_FILE, JSON.stringify(tgacc, null, 2));
    }

    tagToLowId(tag) {
        if (!tag) return null;
        const cleanTag = tag.replace('#', '').trim().toUpperCase();
        const TagChar = ["0", "2", "8", "9", "P", "Y", "L", "Q", "G", "R", "J", "C", "U", "V"];
        let Id = 0;
        for (let c of cleanTag) {
            const index = TagChar.indexOf(c);
            if (index === -1) return null;
            Id = Id * TagChar.length + index;
        }
        return (Id - Id % 256) >> 8;
    }

    lowIdToTag(lowId) {
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

    isAdmin(userId) {
        return ADMIN_IDS.includes(userId);
    }

    getForbiddenSkinIds() {
        return [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,34,35,36,37];
    }

    async getAvailableSkin(account) {
        const unlockedBrawlers = account.Brawlers?.filter(b => b.unlocked === true).map(b => b.id) || [];
        if (unlockedBrawlers.length === 0) return null;

        const FORBIDDEN_SKIN_IDS = this.getForbiddenSkinIds();
        const availableSkins = [];
        
        for (const brawlerId of unlockedBrawlers) {
            const skinsForBrawler = this.skins.filter(skin => {
                const skinBrawler = Character.getBrawlerBySkinID(skin.id);
                return skinBrawler === brawlerId && skin.id < 999000 && !FORBIDDEN_SKIN_IDS.includes(skin.id);
            });
            const playerSkins = account.Skins || [];
            const newSkins = skinsForBrawler.filter(skin => !playerSkins.some(ps => ps.id === skin.id));
            availableSkins.push(...newSkins);
        }

        if (availableSkins.length === 0) return null;
        return availableSkins[Math.floor(Math.random() * availableSkins.length)].id;
    }

    async addSkinToAccount(account, skinId) {
        if (this.getForbiddenSkinIds().includes(skinId)) return false;
        const playerSkins = account.Skins || [];
        if (playerSkins.some(s => s.id === skinId)) return false;
        playerSkins.push({ id: skinId, skin: skinId });
        await this.accounts.updateOne({ lowID: account.lowID }, { $set: { Skins: playerSkins } });
        return true;
    }

    async giveShellySkin(account) {
        const SHELLY_SKIN_ID = 5;
        const playerSkins = account.Skins || [];
        if (playerSkins.some(s => s.id === SHELLY_SKIN_ID)) return false;
        playerSkins.push({ id: SHELLY_SKIN_ID, skin: SHELLY_SKIN_ID });
        await this.accounts.updateOne({ lowID: account.lowID }, { $set: { Skins: playerSkins } });
        return true;
    }

    async getMainMenu() {
        return {
            inline_keyboard: [
                [{ text: '🔗 Привязать аккаунт', callback_data: 'bind_account' }],
                [{ text: '📋 Мои аккаунты', callback_data: 'my_accounts' }],
                [{ text: '🛒 Донат магазин', callback_data: 'donate' }]
            ]
        };
    }

    // ============================================
    // 🔗 ПРИВЯЗКА АККАУНТА
    // ============================================

    async bindAccount(ctx) {
        try {
            await ctx.answerCbQuery();
            ctx.session.bindAccount = true;
            ctx.session.bindMessageId = ctx.callbackQuery.message.message_id;

            await ctx.telegram.editMessageText(
                ctx.chat.id, ctx.session.bindMessageId, null,
                `🔌 Для привязки отправьте тег\n📝 #2PP\n⚠️ O → 0`,
                {
                    reply_markup: { inline_keyboard: [[{ text: '◀ Назад', callback_data: 'back_to_main' }]] }
                }
            );
        } catch (error) {
            console.error('Bind error:', error);
        }
    }

    async handleBindTag(ctx, messageText) {
        const tag = messageText.trim();
        if (!tag.startsWith('#')) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.bindMessageId, null,
                `❌ Тег должен начинаться с #`, {
                    reply_markup: { inline_keyboard: [[{ text: '◀ Назад', callback_data: 'back_to_main' }]] }
                }
            );
            return;
        }

        if (/[OoОо]/.test(tag)) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.bindMessageId, null,
                `❌ Тег содержит "O"! Замени на 0`, {
                    reply_markup: { inline_keyboard: [[{ text: '◀ Назад', callback_data: 'back_to_main' }]] }
                }
            );
            return;
        }

        const playerId = this.tagToLowId(tag);
        if (playerId === null) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.bindMessageId, null,
                `❌ Неверный тег!\nРазрешены: 0,2,8,9,P,Y,L,Q,G,R,J,C,U,V`, {
                    reply_markup: { inline_keyboard: [[{ text: '◀ Назад', callback_data: 'back_to_main' }]] }
                }
            );
            return;
        }

        const account = await this.accounts.findOne({ lowID: playerId });
        if (!account) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.bindMessageId, null,
                `❌ Аккаунт ${tag} не найден!`, {
                    reply_markup: { inline_keyboard: [[{ text: '◀ Назад', callback_data: 'back_to_main' }]] }
                }
            );
            return;
        }

        const tgacc = await this.loadTgacc();
        if (tgacc.find(a => a.lowID === playerId)) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.bindMessageId, null,
                `❌ Аккаунт уже привязан!`, {
                    reply_markup: { inline_keyboard: [[{ text: '◀ Назад', callback_data: 'back_to_main' }]] }
                }
            );
            return;
        }

        const code = Math.floor(Math.random() * 9000) + 1000;
        ctx.session.bindCode = code;
        ctx.session.bindPlayerId = playerId;
        ctx.session.bindAccount = false;

        await this.accounts.updateOne({ lowID: playerId }, {
            $push: { notifications: { NotificationID: 81, NotificationRead: false, NotificationTime: Math.floor(Date.now() / 1000), NotificationText: `🔑 Код привязки: ${code}`, NotificationType: 0 } }
        });

        await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.bindMessageId, null,
            `✅ Код на почту!\n📱 /code (Например 9339)`, {
                reply_markup: { inline_keyboard: [[{ text: '◀ Назад', callback_data: 'back_to_main' }]] }
            }
        );
    }

    async handleCode(ctx, messageText) {
        const parts = messageText.split(' ');
        if (parts.length < 2) return ctx.reply('❌ /code КОД');

        const code = parseInt(parts[1]);
        if (isNaN(code) || code < 1000 || code > 9999) return ctx.reply('❌ 4-значный код');

        if (!ctx.session.bindCode || ctx.session.bindCode !== code) {
            return ctx.reply('❌ Неверный код! Проверьте почту.');
        }

        const account = await this.accounts.findOne({ lowID: ctx.session.bindPlayerId });
        if (!account) return ctx.reply('❌ Аккаунт не найден');

        const tgacc = await this.loadTgacc();
        tgacc.push({ id: ctx.from.id, lowID: ctx.session.bindPlayerId, username: ctx.from.username });
        await this.saveTgacc(tgacc);

        const notifications = (account.notifications || []).filter(n => !n.NotificationText?.includes('Код привязки'));
        notifications.push({ NotificationID: 94, NotificationRead: false, NotificationTime: Math.floor(Date.now() / 1000), NotificationText: '✅ Аккаунт привязан к Telegram!', SkinID: 59 });
        await this.accounts.updateOne({ lowID: ctx.session.bindPlayerId }, { $set: { notifications } });

        const skins = account.Skins || [];
        if (!skins.includes(59)) { skins.push(59); await this.accounts.updateOne({ lowID: ctx.session.bindPlayerId }, { $set: { Skins: skins } }); }

        ctx.session.bindCode = 0;
        ctx.session.bindPlayerId = 0;

        const tag = `#${this.lowIdToTag(account.lowID)}`;
        await ctx.reply(`✅ Привязан! ${tag}\n🎁 Скин на почте!`, {
            reply_markup: { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'back_to_main' }]] }
        });
    }

    // ============================================
    // 🎮 ПОДКЛЮЧИТЬСЯ
    // ============================================

    async connectToAccount(ctx, lowID) {
        try {
            await ctx.answerCbQuery();
            
            const oldAccount = await this.accounts.findOne({ lowID });
            if (!oldAccount) {
                await ctx.reply('❌ Аккаунт не найден');
                return;
            }

            const oldTag = `#${this.lowIdToTag(lowID)}`;
            
            ctx.session.recoverOldId = lowID;
            ctx.session.waitingForNewTag = true;
            ctx.session.connectMessageId = ctx.callbackQuery.message.message_id;

            await ctx.telegram.editMessageText(
                ctx.chat.id, ctx.session.connectMessageId, null,
                `🎮 *Подключение к ${oldAccount.Name}*\n\n` +
                `📱 Чтобы подключиться к ${oldTag}:\n\n` +
                `1️⃣ Создайте НОВЫЙ аккаунт в игре\n` +
                `2️⃣ Запомните его тег\n` +
                `3️⃣ Напишите в этот чат тег НОВОГО аккаунта\n\n` +
                `📝 Пример: #ABC123`,
                {
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '◀ Отмена', callback_data: 'back_to_main' }]
                        ] 
                    },
                    parse_mode: 'Markdown'
                }
            );
        } catch (error) {
            console.error('Connect error:', error);
        }
    }

    async handleConnectTag(ctx, messageText) {
        const newTag = messageText.trim();
        
        if (!newTag.startsWith('#')) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.connectMessageId, null,
                `❌ Тег должен начинаться с #`, {
                    reply_markup: { inline_keyboard: [[{ text: '◀ Отмена', callback_data: 'back_to_main' }]] }
                }
            );
            return;
        }

        if (/[OoОо]/.test(newTag)) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.connectMessageId, null,
                `❌ Тег содержит "O"! Замени на 0`, {
                    reply_markup: { inline_keyboard: [[{ text: '◀ Отмена', callback_data: 'back_to_main' }]] }
                }
            );
            return;
        }

        const newId = this.tagToLowId(newTag);
        if (newId === null) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.connectMessageId, null,
                `❌ Неверный тег!\nРазрешены: 0,2,8,9,P,Y,L,Q,G,R,J,C,U,V`, {
                    reply_markup: { inline_keyboard: [[{ text: '◀ Отмена', callback_data: 'back_to_main' }]] }
                }
            );
            return;
        }

        if (newId === ctx.session.recoverOldId) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.connectMessageId, null,
                `❌ Нельзя на тот же аккаунт! Создайте НОВЫЙ.`, {
                    reply_markup: { inline_keyboard: [[{ text: '◀ Отмена', callback_data: 'back_to_main' }]] }
                }
            );
            return;
        }

        const newAccount = await this.accounts.findOne({ lowID: newId });
        if (!newAccount) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.connectMessageId, null,
                `❌ Аккаунт ${newTag} не найден!`, {
                    reply_markup: { inline_keyboard: [[{ text: '◀ Отмена', callback_data: 'back_to_main' }]] }
                }
            );
            return;
        }

        const connectCode = Math.floor(Math.random() * 9000) + 1000;
        ctx.session.connectCode = connectCode;
        ctx.session.connectNewId = newId;
        ctx.session.waitingForNewTag = false;

        await this.accounts.updateOne({ lowID: newId }, {
            $push: { notifications: { NotificationID: 81, NotificationRead: false, NotificationTime: Math.floor(Date.now() / 1000), NotificationText: `🔑 Код подключения: ${connectCode}`, NotificationType: 0 } }
        });

        await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.connectMessageId, null,
            `✅ Код на почте ${newTag}!\n📱 /connect (Например 9339)`,
            {
                reply_markup: { 
                    inline_keyboard: [[{ text: '◀ Отмена', callback_data: 'back_to_main' }]] 
                }
            }
        );
    }

    async handleConnectCommand(ctx, messageText) {
        const parts = messageText.split(' ');
        if (parts.length < 2) return ctx.reply('❌ /connect КОД');

        const code = parseInt(parts[1]);
        if (isNaN(code) || code < 1000 || code > 9999) return ctx.reply('❌ 4-значный код');

        if (!ctx.session.connectCode || ctx.session.connectCode !== code) {
            return ctx.reply('❌ Неверный код! Проверьте почту НОВОГО аккаунта.');
        }

        const oldAccount = await this.accounts.findOne({ lowID: ctx.session.recoverOldId });
        const newAccount = await this.accounts.findOne({ lowID: ctx.session.connectNewId });

        if (!oldAccount) return ctx.reply('❌ Старый аккаунт не найден');
        if (!newAccount) return ctx.reply('❌ Новый аккаунт не найден');

        console.log(`[CONNECT] Копируем #${oldAccount.lowID} → #${newAccount.lowID}`);

        const dataToCopy = {
            Name: oldAccount.Name, Trophies: oldAccount.Trophies,
            TrophyRoadTier: oldAccount.TrophyRoadTier, Experience: oldAccount.Experience,
            Thumbnail: oldAccount.Thumbnail, Namecolor: oldAccount.Namecolor,
            TokensDoubler: oldAccount.TokensDoubler, BattleTokens: oldAccount.BattleTokens,
            Tickets: oldAccount.Tickets, Starpoints: oldAccount.Starpoints,
            BigBoxTokens: oldAccount.BigBoxTokens, Gold: oldAccount.Gold,
            boxTokens: oldAccount.boxTokens, Gems: oldAccount.Gems,
            BrawlerID: oldAccount.BrawlerID, SkinID: oldAccount.SkinID,
            AuthorCode: oldAccount.AuthorCode, ClubID: oldAccount.ClubID,
            ClubRole: oldAccount.ClubRole, TrioWINS: oldAccount.TrioWINS,
            SoloWINS: oldAccount.SoloWINS, Vip: oldAccount.Vip,
            vipEndDate: oldAccount.vipEndDate, vipLastChecked: oldAccount.vipLastChecked,
            Status: oldAccount.Status, Shop: oldAccount.Shop,
            Skins: oldAccount.Skins, Brawlers: oldAccount.Brawlers,
            Box: oldAccount.Box, BigBox: oldAccount.BigBox,
            BrawlPass: oldAccount.BrawlPass, BPToken: oldAccount.BPToken,
            BPPaidProgress: oldAccount.BPPaidProgress, BPFreeProgress: oldAccount.BPFreeProgress,
            claimedBPRewards: oldAccount.claimedBPRewards, notifications: oldAccount.notifications
        };

        for (const [key, value] of Object.entries(dataToCopy)) {
            await this.accounts.updateOne({ lowID: newAccount.lowID }, { $set: { [key]: value } });
        }

        await this.accounts.updateOne({ lowID: oldAccount.lowID }, {
            $set: { Name: 'Восстановлен', Brawlers: [], Trophies: 0, Gems: 0, Gold: 0, notifications: [] }
        });

        const tgacc = await this.loadTgacc();
        const idx = tgacc.findIndex(e => e.lowID === ctx.session.recoverOldId);
        if (idx !== -1) {
            tgacc[idx].lowID = newAccount.lowID;
            await this.saveTgacc(tgacc);
        }

        await this.accounts.updateOne({ lowID: newAccount.lowID }, {
            $push: { notifications: { NotificationID: 81, NotificationRead: false, NotificationTime: Math.floor(Date.now() / 1000), NotificationText: '✅ Аккаунт подключен!', NotificationType: 0 } }
        });

        const newTag = `#${this.lowIdToTag(newAccount.lowID)}`;
        ctx.session.connectCode = 0;
        ctx.session.connectNewId = 0;
        ctx.session.recoverOldId = 0;

        await ctx.reply(
            `✅ Аккаунт подключен!\n📱 Зайдите в ${newTag}\n🎉 Все данные перенесены!`,
            {
                reply_markup: { 
                    inline_keyboard: [
                        [{ text: '📋 Мои аккаунты', callback_data: 'my_accounts' }],
                        [{ text: '🏠 Главное меню', callback_data: 'back_to_main' }]
                    ] 
                }
            }
        );
        console.log(`[CONNECT] ✅ ГОТОВО!`);
    }

    // ============================================
    // 📋 МОИ АККАУНТЫ
    // ============================================

    async showMyAccounts(ctx) {
        try {
            await ctx.answerCbQuery();
            const tgacc = await this.loadTgacc();
            const userAccounts = tgacc.filter(a => a.id === ctx.from.id);
            
            if (userAccounts.length === 0) {
                await ctx.editMessageText(
                    `📃 Нет аккаунтов\n🔗 Нажмите "Привязать"`,
                    {
                        reply_markup: { 
                            inline_keyboard: [
                                [{ text: '🔗 Привязать', callback_data: 'bind_account' }],
                                [{ text: '◀ Назад', callback_data: 'back_to_main' }]
                            ] 
                        }
                    }
                );
                return;
            }

            let message = `📃 *Ваши аккаунты:*\n\n`;
            const buttons = [];

            for (const acc of userAccounts) {
                const account = await this.accounts.findOne({ lowID: acc.lowID });
                if (account) {
                    const tag = `#${this.lowIdToTag(acc.lowID)}`;
                    const online = account.token && account.token.length > 0 ? '🟢' : '🔴';
                    
                    let vipStatus = '❌';
                    if (account.Vip === 1) {
                        if (account.vipEndDate) {
                            const daysLeft = Math.ceil((new Date(account.vipEndDate) - new Date()) / (1000 * 60 * 60 * 24));
                            vipStatus = `✅ ${daysLeft} дн.`;
                        } else {
                            vipStatus = '✅ Навсегда';
                        }
                    }
                    
                    message += `${online} *${account.Name}*\n`;
                    message += `🏷️ ${tag} | 🏆 ${account.Trophies}\n`;
                    message += `👑 VIP: ${vipStatus}\n\n`;
                    
                    buttons.push([
                        { text: `🎮 Подключиться`, callback_data: `connect_${acc.lowID}` },
                        { text: `📊 Инфо`, callback_data: `view_account_${acc.lowID}` }
                    ]);
                }
            }

            buttons.push([{ text: '◀ Назад', callback_data: 'back_to_main' }]);

            await ctx.editMessageText(message, {
                reply_markup: { inline_keyboard: buttons },
                parse_mode: 'Markdown'
            });
        } catch (error) {
            console.error('Show accounts error:', error);
        }
    }

    async viewAccount(ctx, lowID) {
        try {
            await ctx.answerCbQuery();
            const account = await this.accounts.findOne({ lowID });
            if (!account) {
                await ctx.reply('❌ Аккаунт не найден');
                return;
            }

            const tag = `#${this.lowIdToTag(lowID)}`;
            
            let vipStatus = '❌ Нет';
            if (account.Vip === 1) {
                if (account.vipEndDate) {
                    const daysLeft = Math.ceil((new Date(account.vipEndDate) - new Date()) / (1000 * 60 * 60 * 24));
                    vipStatus = `✅ ${daysLeft} дн.`;
                } else {
                    vipStatus = '✅ Навсегда';
                }
            }

            const notifications = account.notifications || [];
            const unreadNotifs = notifications.filter(n => n.NotificationRead === false).length;

            await ctx.editMessageText(
                `👤 *${account.Name}*\n\n` +
                `🏷️ Тег: ${tag}\n` +
                `🆔 ID: ${lowID}\n` +
                `🏆 Трофеи: ${account.Trophies || 0}\n` +
                `💎 Гемы: ${account.Gems || 0}\n` +
                `🪙 Золото: ${account.Gold || 0}\n` +
                `🎫 Жетоны: ${account.Tickets || 0}\n` +
                `⭐ Старпоинты: ${account.Starpoints || 0}\n` +
                `👑 VIP: ${vipStatus}\n` +
                `📦 Ящиков: ${account.boxTokens || 0}\n` +
                `📦 Больших: ${account.BigBoxTokens || 0}\n` +
                `📨 Уведомлений: ${notifications.length} (${unreadNotifs} новых)`,
                {
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '🎮 Подключиться', callback_data: `connect_${lowID}` }],
                            [{ text: '📨 Очистить уведомления', callback_data: `clear_notifs_${lowID}` }],
                            [{ text: '🔗 Отвязать', callback_data: `unlink_${lowID}` }],
                            [{ text: '◀ Назад', callback_data: 'my_accounts' }]
                        ] 
                    },
                    parse_mode: 'Markdown'
                }
            );
        } catch (error) {
            console.error('View account error:', error);
        }
    }

    async clearNotifications(ctx, lowID) {
        try {
            await ctx.answerCbQuery();
            await this.accounts.updateOne({ lowID: lowID }, { $set: { notifications: [] } });
            
            await ctx.editMessageText(
                `✅ Уведомления очищены!`,
                {
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '📊 Назад к аккаунту', callback_data: `view_account_${lowID}` }],
                            [{ text: '◀ Назад', callback_data: 'my_accounts' }]
                        ] 
                    }
                }
            );
        } catch (error) {
            console.error('Clear notifications error:', error);
        }
    }

    async unlinkAccount(ctx, lowID) {
        try {
            await ctx.answerCbQuery();
            let tgacc = await this.loadTgacc();
            tgacc = tgacc.filter(a => !(a.id === ctx.from.id && a.lowID === lowID));
            await this.saveTgacc(tgacc);

            await ctx.editMessageText(
                `✅ Аккаунт отвязан`,
                {
                    reply_markup: { 
                        inline_keyboard: [
                            [{ text: '📋 Мои аккаунты', callback_data: 'my_accounts' }],
                            [{ text: '🏠 Главное меню', callback_data: 'back_to_main' }]
                        ] 
                    }
                }
            );
        } catch (error) {
            console.error('Unlink error:', error);
        }
    }

    // ============================================
    // 🎯 НАСТРОЙКА ОБРАБОТЧИКОВ
    // ============================================

    setupHandlers() {
        console.log('🔄 Настройка обработчиков...');

        // СТАРТ
        this.bot.start(async (ctx) => {
            console.log(`[START] ${ctx.from.username} (${ctx.from.id})`);
            await ctx.reply(
                `🎮 Добро пожаловать!\n\n🔗 Привязать аккаунт\n📋 Мои аккаунты\n🛒 Донат магазин`,
                { reply_markup: await this.getMainMenu() }
            );
        });

        // ============================================
        // 👑 АДМИН-КОМАНДЫ ЧЕРЕЗ hears (100% РАБОТАЕТ)
        // ============================================

        // HELP
        this.bot.hears(/^\/help$/i, async (ctx) => {
            console.log(`[HELP] ${ctx.from.username} (${ctx.from.id})`);
            
            if (!this.isAdmin(ctx.from.id)) {
                return ctx.reply("❌ Нет доступа");
            }
            
            await ctx.reply(
                `📋 *Список админ-команд:*\n\n` +
                `🔍 *Поиск аккаунта*\n` +
                `/finduser <тег>\n` +
                `📝 Пример: /finduser #ABC123\n\n` +
                
                `💎 *Выдача гемов*\n` +
                `/givegems <ID> <количество>\n` +
                `📝 Пример: /givegems 12345 1000\n\n` +
                
                `👑 *Выдача VIP*\n` +
                `/givevip <ID> [дни]\n` +
                `📝 Примеры:\n` +
                `/givevip 12345 (30 дней)\n` +
                `/givevip 12345 60 (60 дней)\n\n` +
                
                `ℹ️ *Для получения ID используйте:*\n` +
                `/finduser <тег>`,
                { parse_mode: 'Markdown' }
            );
        });

        // FINDUSER
        this.bot.hears(/^\/finduser\s+(.+)$/i, async (ctx) => {
            console.log(`[FINDUSER] ${ctx.from.username} (${ctx.from.id}) - ${ctx.message.text}`);
            
            if (!this.isAdmin(ctx.from.id)) {
                console.log(`[FINDUSER] ❌ Нет доступа у ${ctx.from.id}`);
                return ctx.reply("❌ Нет доступа");
            }
            
            const args = ctx.message.text.split(' ');
            if (args.length !== 2) {
                return ctx.reply(
                    `📋 *Формат:* /finduser <тег>\n\n` +
                    `📝 *Пример:* /finduser #ABC123`,
                    { parse_mode: 'Markdown' }
                );
            }

            try {
                const tag = args[1];
                console.log(`[FINDUSER] Поиск тега: ${tag}`);
                
                const lowId = this.tagToLowId(tag);
                if (lowId === null) {
                    console.log(`[FINDUSER] ❌ Неверный тег: ${tag}`);
                    return ctx.reply("❌ Неверный формат тега");
                }

                console.log(`[FINDUSER] ID: ${lowId}`);
                const user = await this.accounts.findOne({ lowID: lowId });
                if (!user) {
                    console.log(`[FINDUSER] ❌ Аккаунт не найден: ${tag}`);
                    return ctx.reply(`❌ Аккаунт ${tag} не найден`);
                }

                let vipStatus = '❌ Нет';
                if (user.Vip === 1) {
                    if (user.vipEndDate) {
                        const daysLeft = Math.ceil((new Date(user.vipEndDate) - new Date()) / (1000 * 60 * 60 * 24));
                        vipStatus = `✅ ${daysLeft} дн.`;
                    } else {
                        vipStatus = '✅ Навсегда';
                    }
                }

                console.log(`[FINDUSER] ✅ Найден: ${user.Name} (${tag})`);
                await ctx.reply(
                    `📊 *Информация об аккаунте*\n\n` +
                    `👤 Имя: ${user.Name || 'Неизвестно'}\n` +
                    `🏷️ Тег: ${tag}\n` +
                    `🆔 ID: ${lowId}\n` +
                    `💎 Гемы: ${user.Gems || 0}\n` +
                    `🪙 Золото: ${user.Gold || 0}\n` +
                    `🏆 Трофеи: ${user.Trophies || 0}\n` +
                    `👑 VIP: ${vipStatus}\n` +
                    `📦 Скинов: ${(user.Skins || []).length}`,
                    { parse_mode: 'Markdown' }
                );
            } catch (error) {
                console.error('[FINDUSER] Ошибка:', error);
                ctx.reply("❌ Ошибка при поиске");
            }
        });

        // GIVEGEMS
        this.bot.hears(/^\/givegems\s+(\d+)\s+(\d+)$/i, async (ctx) => {
            console.log(`[GIVEGEMS] ${ctx.from.username} (${ctx.from.id}) - ${ctx.message.text}`);
            
            if (!this.isAdmin(ctx.from.id)) {
                console.log(`[GIVEGEMS] ❌ Нет доступа у ${ctx.from.id}`);
                return ctx.reply("❌ Нет доступа");
            }

            try {
                const lowId = parseInt(ctx.match[1]);
                const amount = parseInt(ctx.match[2]);
                
                if (amount <= 0) {
                    console.log(`[GIVEGEMS] ❌ Неверное количество: ${amount}`);
                    return ctx.reply("❌ Количество должно быть положительным числом");
                }

                console.log(`[GIVEGEMS] Поиск аккаунта с ID: ${lowId}`);
                const user = await this.accounts.findOne({ lowID: lowId });
                if (!user) {
                    console.log(`[GIVEGEMS] ❌ Аккаунт с ID ${lowId} не найден`);
                    return ctx.reply(`❌ Аккаунт с ID ${lowId} не найден`);
                }

                const tag = `#${this.lowIdToTag(lowId)}`;
                console.log(`[GIVEGEMS] Найден: ${user.Name} (${tag})`);
                
                await this.accounts.updateOne({ lowID: lowId }, {
                    $inc: { Gems: amount },
                    $push: { 
                        notifications: { 
                            NotificationID: 89, 
                            NotificationRead: false, 
                            NotificationTime: Math.floor(Date.now() / 1000), 
                            NotificationText: `✨ +${amount} гемов (админ)`, 
                            Gems: amount 
                        } 
                    }
                });

                console.log(`[GIVEGEMS] ✅ Выдано ${amount} гемов ${tag}`);
                await ctx.reply(
                    `✅ *Выдано ${amount} гемов*\n\n` +
                    `👤 Игрок: ${user.Name}\n` +
                    `🏷️ Тег: ${tag}\n` +
                    `🆔 ID: ${lowId}\n` +
                    `💎 Всего гемов: ${(user.Gems || 0) + amount}`,
                    { parse_mode: 'Markdown' }
                );
            } catch (error) {
                console.error('[GIVEGEMS] Ошибка:', error);
                ctx.reply("❌ Ошибка при выдаче гемов");
            }
        });

        // GIVEVIP
        this.bot.hears(/^\/givevip\s+(\d+)\s*(\d*)$/i, async (ctx) => {
            console.log(`[GIVEVIP] ${ctx.from.username} (${ctx.from.id}) - ${ctx.message.text}`);
            
            if (!this.isAdmin(ctx.from.id)) {
                console.log(`[GIVEVIP] ❌ Нет доступа у ${ctx.from.id}`);
                return ctx.reply("❌ Нет доступа");
            }

            try {
                const lowId = parseInt(ctx.match[1]);
                const days = ctx.match[2] ? parseInt(ctx.match[2]) : 30;
                
                if (days <= 0) {
                    console.log(`[GIVEVIP] ❌ Неверное количество дней: ${days}`);
                    return ctx.reply("❌ Количество дней должно быть положительным числом");
                }

                console.log(`[GIVEVIP] Поиск аккаунта с ID: ${lowId}`);
                const user = await this.accounts.findOne({ lowID: lowId });
                if (!user) {
                    console.log(`[GIVEVIP] ❌ Аккаунт с ID ${lowId} не найден`);
                    return ctx.reply(`❌ Аккаунт с ID ${lowId} не найден`);
                }

                const tag = `#${this.lowIdToTag(lowId)}`;
                console.log(`[GIVEVIP] Найден: ${user.Name} (${tag})`);
                
                const vipEndDate = new Date();
                vipEndDate.setDate(vipEndDate.getDate() + days);

                const shellySkinGiven = await this.giveShellySkin(user);
                console.log(`[GIVEVIP] Скин Шелли выдан: ${shellySkinGiven}`);

                const skinId = await this.getAvailableSkin(user);
                let skinGiven = false;
                if (skinId !== null) {
                    skinGiven = await this.addSkinToAccount(user, skinId);
                    console.log(`[GIVEVIP] Случайный скин выдан: ${skinId}`);
                }

                const notifications = [
                    { 
                        NotificationID: 89, 
                        NotificationRead: false, 
                        NotificationTime: Math.floor(Date.now() / 1000), 
                        NotificationText: '👑 VIP выдан администратором', 
                        Gems: 260 
                    },
                    {
                        NotificationID: 94,
                        NotificationRead: false,
                        NotificationTime: Math.floor(Date.now() / 1000),
                        NotificationText: '🎨 Скин Шелли (VIP)',
                        SkinID: 5
                    }
                ];

                if (skinGiven && skinId !== null) {
                    notifications.push({ 
                        NotificationID: 94, 
                        NotificationRead: false, 
                        NotificationTime: Math.floor(Date.now() / 1000), 
                        NotificationText: '🎨 Дополнительный скин VIP', 
                        SkinID: skinId 
                    });
                }

                notifications.push({ 
                    NotificationID: 81, 
                    NotificationRead: false, 
                    NotificationTime: Math.floor(Date.now() / 1000), 
                    NotificationText: `👑 VIP ${days} дней! +260 гемов, скин Шелли, доп. кубки и жетоны!`, 
                    NotificationType: 0 
                });

                await this.accounts.updateOne({ lowID: lowId }, {
                    $set: { 
                        Vip: 1, 
                        vipEndDate: vipEndDate, 
                        vipLastChecked: new Date()
                    },
                    $push: { 
                        notifications: { $each: notifications, $slice: -50 } 
                    }
                });

                console.log(`[GIVEVIP] ✅ Выдан VIP на ${days} дней ${tag}`);
                await ctx.reply(
                    `✅ *Выдан VIP на ${days} дней*\n\n` +
                    `👤 Игрок: ${user.Name}\n` +
                    `🏷️ Тег: ${tag}\n` +
                    `🆔 ID: ${lowId}\n` +
                    `📅 До: ${vipEndDate.toLocaleDateString()}\n\n` +
                    `🎁 *Награды:*\n` +
                    `• 💎 260 гемов\n` +
                    `• 🎨 Скин Шелли\n` +
                    `• 🏆 Дополнительные кубки\n` +
                    `• 🎫 Дополнительные жетоны\n` +
                    `${skinGiven ? '• 🎨 Дополнительный скин' : ''}`,
                    { parse_mode: 'Markdown' }
                );
            } catch (error) {
                console.error('[GIVEVIP] Ошибка:', error);
                ctx.reply("❌ Ошибка при выдаче VIP");
            }
        });

        // ОСТАЛЬНЫЕ КОМАНДЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ
        this.bot.command('code', async (ctx) => {
            console.log(`[CODE] ${ctx.from.username} (${ctx.from.id})`);
            await this.handleCode(ctx, ctx.message.text);
        });

        this.bot.command('connect', async (ctx) => {
            console.log(`[CONNECT_CMD] ${ctx.from.username} (${ctx.from.id})`);
            await this.handleConnectCommand(ctx, ctx.message.text);
        });

        // CALLBACK
        this.bot.action('bind_account', async (ctx) => {
            console.log(`[ACTION] bind_account от ${ctx.from.username}`);
            await this.bindAccount(ctx);
        });

        this.bot.action('my_accounts', async (ctx) => {
            console.log(`[ACTION] my_accounts от ${ctx.from.username}`);
            await this.showMyAccounts(ctx);
        });

        this.bot.action('donate', async (ctx) => {
            console.log(`[ACTION] donate от ${ctx.from.username}`);
            
            let priceText = '💰 *Прайс на гемы:*\n\n';
            for (const item of DONATE_PRICES.gems) {
                priceText += `💎 ${item.amount} гемов — ${item.price}₽\n`;
            }
            
            priceText += '\n👑 *VIP (30 дней)* — 100₽\n\n';
            priceText += '🎁 *VIP включает:*\n';
            priceText += '• 💎 260 гемов\n';
            priceText += '• 🎨 Скин на Шелли\n';
            priceText += '• 🏆 Дополнительные кубки\n';
            priceText += '• 🎫 Дополнительные жетоны';

            await ctx.editMessageText(
                `🛒 *Донат магазин*\n\n${priceText}\n\n` +
                `📌 Для покупки обратитесь к менеджеру: @Xperia9339`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💬 Написать менеджеру', url: 'https://t.me/Xperia9339' }],
                            [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
                        ]
                    },
                    parse_mode: 'Markdown'
                }
            );
        });

        this.bot.action('back_to_main', async (ctx) => {
            console.log(`[ACTION] back_to_main от ${ctx.from.username}`);
            ctx.session.bindAccount = false;
            ctx.session.waitingForNewTag = false;
            await ctx.editMessageText(`🎮 Главное меню`, {
                reply_markup: await this.getMainMenu()
            });
        });

        this.bot.action('cancel', async (ctx) => {
            console.log(`[ACTION] cancel от ${ctx.from.username}`);
            await ctx.deleteMessage();
            await ctx.reply('❌ Отменено', { reply_markup: await this.getMainMenu() });
        });

        this.bot.action(/connect_(\d+)/, async (ctx) => {
            console.log(`[ACTION] connect_${ctx.match[1]} от ${ctx.from.username}`);
            await this.connectToAccount(ctx, parseInt(ctx.match[1]));
        });

        this.bot.action(/view_account_(\d+)/, async (ctx) => {
            console.log(`[ACTION] view_account_${ctx.match[1]} от ${ctx.from.username}`);
            await this.viewAccount(ctx, parseInt(ctx.match[1]));
        });

        this.bot.action(/clear_notifs_(\d+)/, async (ctx) => {
            console.log(`[ACTION] clear_notifs_${ctx.match[1]} от ${ctx.from.username}`);
            await this.clearNotifications(ctx, parseInt(ctx.match[1]));
        });

        this.bot.action(/unlink_(\d+)/, async (ctx) => {
            console.log(`[ACTION] unlink_${ctx.match[1]} от ${ctx.from.username}`);
            await this.unlinkAccount(ctx, parseInt(ctx.match[1]));
        });

        // ТЕКСТ
        this.bot.on('text', async (ctx) => {
            if (ctx.session.bindAccount) {
                console.log(`[TEXT] bindAccount от ${ctx.from.username}: ${ctx.message.text}`);
                await this.handleBindTag(ctx, ctx.message.text);
                return;
            }
            if (ctx.session.waitingForNewTag) {
                console.log(`[TEXT] waitingForNewTag от ${ctx.from.username}: ${ctx.message.text}`);
                await this.handleConnectTag(ctx, ctx.message.text);
                return;
            }
        });

        console.log('✅ Обработчики настроены');
    }

    // ============================================
    // 🌐 WEBHOOK
    // ============================================

    startWebhookServer() {
        const app = express();
        const PORT = 4738;
        app.use(express.json());
        app.post('/webhook', async (req, res) => {
            try {
                const result = await this.handleWebhook(req.body);
                res.send(result);
            } catch (error) {
                console.error('Webhook error:', error);
                res.status(500).send('ERROR');
            }
        });
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🔄 Webhook на порту ${PORT}`);
        });
    }

    async handleWebhook(data) {
        console.log("📥 Webhook:", data);
        return "OK";
    }

    startBot() {
        this.bot.launch().then(() => {
            console.log('🤖 Бот запущен!');
        });
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
}

const bot = new DonationBot();
module.exports = bot;
