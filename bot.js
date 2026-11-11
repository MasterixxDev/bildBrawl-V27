const { Telegraf, session, Scenes: { BaseScene, Stage }, Markup } = require('telegraf');
const { MongoClient } = require('mongodb');
const express = require('express');
const Character = require("./CSVParser/Characters");
const fs = require('fs').promises;

const API_TOKEN = '8634247976:AAFdopNbhYG8j8ziGBT4F5VTmOW_sZblIiM';
const ADMIN_IDS = [6626580689, 7445599403];
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'jevilv26';
const COLLECTION_NAME = 'acc';
const TGACC_FILE = './Laser.Server/tgacc.json';

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
    vip: { price: 100, duration: '30 дней' }
};

class DonationBot {
    constructor() {
        this.bot = new Telegraf(API_TOKEN);
        this.client = null;
        this.db = null;
        this.accounts = null;
        this.skins = [];
        this.achievementsConfig = null;
        this.userMessages = new Map();
        this.setupScenes();
        this.init();
        this.startWebhookServer();
    }

    setupScenes() {
        const buyScene = new BaseScene('buyScene');
        buyScene.enter(async (ctx) => {
            await ctx.reply(
                '🛒 Для покупки обратитесь к менеджеру:\n\n👤 @Xperia9339\n\n📌 Укажите:\n• Ваш игровой тег\n• Что хотите купить\n• Сумму доната',
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
            this.loadAchievementsConfig();
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

    loadAchievementsConfig() {
        try {
            this.achievementsConfig = require('./Achievements/achievements.json');
            console.log(`✅ Загружено ачивок: ${this.achievementsConfig.achievements.length}`);
        } catch (error) {
            console.error('❌ Ошибка загрузки ачивок:', error);
            this.achievementsConfig = { achievements: [] };
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

    // ============================================================
    // 🎨 РАБОТА СО СКИНАМИ (ПОЛНОСТЬЮ ПЕРЕПИСАНА)
    // ============================================================

    getForbiddenSkinIds() {
        return [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,34,35,36,37];
    }

    async getAvailableSkins(account) {
        // Получаем все скины, которые можно выдать
        const unlockedBrawlers = account.Brawlers?.filter(b => b.unlocked === true).map(b => b.id) || [];
        if (unlockedBrawlers.length === 0) {
            console.log('[SKIN] ❌ Нет разблокированных бравлеров');
            return [];
        }
        
        const FORBIDDEN_SKIN_IDS = this.getForbiddenSkinIds();
        const playerSkins = account.Skins || [];
        
        // Нормализуем массив скинов игрока (на случай если там объекты)
        const normalizedPlayerSkins = playerSkins.map(s => {
            if (typeof s === 'number') return s;
            if (s && typeof s === 'object' && s.id !== undefined) return s.id;
            return null;
        }).filter(id => id !== null);
        
        console.log(`[SKIN] 🎮 Скины игрока:`, normalizedPlayerSkins);
        
        const availableSkins = [];
        for (const brawlerId of unlockedBrawlers) {
            const skinsForBrawler = this.skins.filter(skin => {
                const skinBrawler = Character.getBrawlerBySkinID(skin.id);
                return skinBrawler === brawlerId && 
                       skin.id < 999000 && 
                       !FORBIDDEN_SKIN_IDS.includes(skin.id) &&
                       !normalizedPlayerSkins.includes(skin.id);
            });
            availableSkins.push(...skinsForBrawler);
        }
        
        console.log(`[SKIN] 📋 Доступно скинов: ${availableSkins.length}`);
        return availableSkins;
    }

    async getRandomAvailableSkin(account) {
        const availableSkins = await this.getAvailableSkins(account);
        
        if (availableSkins.length === 0) {
            console.log('[SKIN] ❌ Нет доступных скинов для выдачи');
            return null;
        }
        
        const randomSkin = availableSkins[Math.floor(Math.random() * availableSkins.length)];
        console.log(`[SKIN] 🎲 Выбран скин: ID=${randomSkin.id}, Name=${randomSkin.name}`);
        return randomSkin;
    }

    async addSkinToAccount(account, skinId) {
        if (this.getForbiddenSkinIds().includes(skinId)) {
            console.log(`[SKIN] ❌ Скин ${skinId} запрещен`);
            return false;
        }
        
        const playerSkins = account.Skins || [];
        const normalizedPlayerSkins = playerSkins.map(s => {
            if (typeof s === 'number') return s;
            if (s && typeof s === 'object' && s.id !== undefined) return s.id;
            return null;
        }).filter(id => id !== null);
        
        if (normalizedPlayerSkins.includes(skinId)) {
            console.log(`[SKIN] ❌ Скин ${skinId} уже есть у игрока`);
            return false;
        }
        
        // Добавляем скин в правильном формате
        const newSkin = { id: skinId };
        playerSkins.push(newSkin);
        
        await this.accounts.updateOne(
            { lowID: account.lowID }, 
            { $set: { Skins: playerSkins } }
        );
        
        console.log(`[SKIN] ✅ Скин ${skinId} добавлен игроку ${account.Name}`);
        return true;
    }

    async getSkinCount(account) {
        const playerSkins = account.Skins || [];
        const normalized = playerSkins.map(s => {
            if (typeof s === 'number') return s;
            if (s && typeof s === 'object' && s.id !== undefined) return s.id;
            return null;
        }).filter(id => id !== null);
        return normalized.length;
    }

    // ============================================================
    // 🏆 ДОСТИЖЕНИЯ
    // ============================================================

    async deleteUserMessages(ctx) {
        const userId = ctx.from.id;
        if (this.userMessages.has(userId)) {
            const messages = this.userMessages.get(userId);
            for (const msgId of messages) {
                try { await ctx.telegram.deleteMessage(ctx.chat.id, msgId); } catch (e) {}
            }
            this.userMessages.delete(userId);
        }
    }

    async showAchievements(ctx, lowID, page = 0) {
        try {
            try { await ctx.answerCbQuery(); } catch (e) {}
            await this.deleteUserMessages(ctx);
            
            const account = await this.accounts.findOne({ lowID });
            if (!account) {
                await ctx.reply('❌ Аккаунт не найден');
                return;
            }

            const config = this.achievementsConfig;
            if (!config || config.achievements.length === 0) {
                await ctx.reply('❌ Система достижений временно недоступна');
                return;
            }

            const achievements = account.achievements || { unlocked: [], progress: {} };
            const unlockedIds = achievements.unlocked || [];
            
            const sorted = [];
            const notCompleted = [];
            
            for (const ach of config.achievements) {
                const isUnlocked = unlockedIds.includes(ach.id);
                const progress = achievements.progress?.[ach.id] || {};
                let progressPercent = 0;
                
                if (!isUnlocked && ach.type === 'trophy' && ach.character !== undefined) {
                    const brawler = account.Brawlers?.find(b => b.id === ach.character);
                    const current = brawler?.trophies || 0;
                    const target = ach.targetTrophies || 1250;
                    progressPercent = Math.min(100, Math.round((current / target) * 100));
                }
                
                const item = { ...ach, completed: isUnlocked, timestamp: progress.timestamp, progressPercent };
                if (isUnlocked) sorted.push(item);
                else notCompleted.push(item);
            }
            
            notCompleted.sort((a, b) => b.progressPercent - a.progressPercent);
            sorted.sort((a, b) => {
                if (!a.timestamp) return 1;
                if (!b.timestamp) return -1;
                return new Date(b.timestamp) - new Date(a.timestamp);
            });
            
            const all = [...sorted, ...notCompleted];
            const total = config.achievements.length;
            const completed = sorted.length;
            const PER_PAGE = 10;
            const totalPages = Math.ceil(all.length / PER_PAGE);
            const start = page * PER_PAGE;
            const end = Math.min(start + PER_PAGE, all.length);
            const pageItems = all.slice(start, end);
            
            let message = `🏆 *Достижения ${account.Name}*\n`;
            message += `📊 ${completed}/${total} | 📄 ${page+1}/${totalPages}\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            for (const ach of pageItems) {
                const status = ach.completed ? '✅' : '⬜';
                const date = ach.timestamp ? new Date(ach.timestamp).toLocaleDateString('ru-RU') : 'не выполнено';
                message += `${status} *${ach.name}*\n📝 ${ach.description}\n`;
                if (ach.reward?.gems) message += `💎 +${ach.reward.gems} гемов\n`;
                if (ach.completed) message += `📅 ${date}\n`;
                else if (ach.type === 'trophy' && ach.character !== undefined) {
                    const brawler = account.Brawlers?.find(b => b.id === ach.character);
                    const current = brawler?.trophies || 0;
                    const target = ach.targetTrophies || 1250;
                    const p = Math.min(100, Math.round((current/target)*100));
                    const bar = '█'.repeat(Math.floor(p/5)) + '░'.repeat(20 - Math.floor(p/5));
                    message += `📈 ${bar} ${p}% (${current}/${target})\n`;
                }
                message += '\n';
            }
            
            const buttons = [];
            const nav = [];
            if (page > 0) nav.push({ text: '◀', callback_data: `ach_page_${lowID}_${page-1}` });
            nav.push({ text: `${page+1}/${totalPages}`, callback_data: 'ignore' });
            if (page < totalPages-1) nav.push({ text: '▶', callback_data: `ach_page_${lowID}_${page+1}` });
            buttons.push(nav);
            buttons.push([{ text: '🔄 Обновить', callback_data: `refresh_achievements_${lowID}` }]);
            buttons.push([{ text: '◀ Назад', callback_data: 'back_to_main' }]);
            
            try {
                const sent = await ctx.editMessageText(message, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: buttons }
                });
                const userId = ctx.from.id;
                if (!this.userMessages.has(userId)) this.userMessages.set(userId, []);
                this.userMessages.get(userId).push(sent.message_id);
            } catch (error) {
                if (error.response?.description?.includes('message to edit not found')) {
                    const sent = await ctx.reply(message, {
                        parse_mode: 'Markdown',
                        reply_markup: { inline_keyboard: buttons }
                    });
                    const userId = ctx.from.id;
                    if (!this.userMessages.has(userId)) this.userMessages.set(userId, []);
                    this.userMessages.get(userId).push(sent.message_id);
                }
            }
        } catch (error) {
            console.error('[ACHIEVEMENTS] Ошибка:', error);
        }
    }

    // ============================================================
    // 🔗 ПРИВЯЗКА АККАУНТА
    // ============================================================

    async bindAccount(ctx) {
        try {
            await ctx.answerCbQuery();
            ctx.session.bindAccount = true;
            ctx.session.bindMessageId = ctx.callbackQuery.message.message_id;
            await ctx.telegram.editMessageText(
                ctx.chat.id, ctx.session.bindMessageId, null,
                '🔌 Отправьте тег\n📝 #2PP\n⚠️ O → 0',
                { reply_markup: { inline_keyboard: [[{ text: '◀ Назад', callback_data: 'back_to_main' }]] } }
            );
        } catch (error) {
            console.error('Bind error:', error);
        }
    }

    async handleBindTag(ctx, text) {
        const tag = text.trim();
        if (!tag.startsWith('#')) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.bindMessageId, null,
                '❌ Тег должен начинаться с #',
                { reply_markup: { inline_keyboard: [[{ text: '◀ Назад', callback_data: 'back_to_main' }]] } }
            );
            return;
        }
        const playerId = this.tagToLowId(tag);
        if (playerId === null) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.bindMessageId, null,
                '❌ Неверный тег',
                { reply_markup: { inline_keyboard: [[{ text: '◀ Назад', callback_data: 'back_to_main' }]] } }
            );
            return;
        }
        const account = await this.accounts.findOne({ lowID: playerId });
        if (!account) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.bindMessageId, null,
                `❌ Аккаунт ${tag} не найден`,
                { reply_markup: { inline_keyboard: [[{ text: '◀ Назад', callback_data: 'back_to_main' }]] } }
            );
            return;
        }
        const tgacc = await this.loadTgacc();
        if (tgacc.find(a => a.lowID === playerId)) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.bindMessageId, null,
                '❌ Аккаунт уже привязан',
                { reply_markup: { inline_keyboard: [[{ text: '◀ Назад', callback_data: 'back_to_main' }]] } }
            );
            return;
        }
        const code = Math.floor(Math.random() * 9000) + 1000;
        ctx.session.bindCode = code;
        ctx.session.bindPlayerId = playerId;
        ctx.session.bindAccount = false;

        await this.accounts.updateOne({ lowID: playerId }, {
            $push: { notifications: { NotificationID: 81, NotificationRead: false, NotificationTime: Math.floor(Date.now()/1000), NotificationText: `🔑 Код: ${code}`, NotificationType: 0 } }
        });

        await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.bindMessageId, null,
            '✅ Код в игре!\n📱 /code 1234',
            { reply_markup: { inline_keyboard: [[{ text: '◀ Назад', callback_data: 'back_to_main' }]] } }
        );
    }

    async handleCode(ctx, text) {
        const parts = text.split(' ');
        if (parts.length < 2) return ctx.reply('❌ /code КОД');
        const code = parseInt(parts[1]);
        if (isNaN(code) || code < 1000 || code > 9999) return ctx.reply('❌ 4-значный код');
        if (!ctx.session.bindCode || ctx.session.bindCode !== code) {
            return ctx.reply('❌ Неверный код!');
        }
        const account = await this.accounts.findOne({ lowID: ctx.session.bindPlayerId });
        if (!account) return ctx.reply('❌ Аккаунт не найден');

        const tgacc = await this.loadTgacc();
        tgacc.push({ id: ctx.from.id, lowID: ctx.session.bindPlayerId, username: ctx.from.username });
        await this.saveTgacc(tgacc);

        await this.accounts.updateOne({ lowID: ctx.session.bindPlayerId }, {
            $push: { notifications: { NotificationID: 94, NotificationRead: false, NotificationTime: Math.floor(Date.now()/1000), NotificationText: '✅ Привязан к Telegram!', SkinID: 59 } }
        });

        ctx.session.bindCode = 0;
        ctx.session.bindPlayerId = 0;

        const tag = `#${this.lowIdToTag(account.lowID)}`;
        await ctx.reply(`✅ Привязан ${tag}`, {
            reply_markup: { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'back_to_main' }]] }
        });
    }

    // ============================================================
    // 📋 АККАУНТЫ
    // ============================================================

    async showMyAccounts(ctx) {
        try {
            await ctx.answerCbQuery();
            const tgacc = await this.loadTgacc();
            const userAccounts = tgacc.filter(a => a.id === ctx.from.id);
            if (userAccounts.length === 0) {
                await ctx.editMessageText(
                    '📃 Нет аккаунтов\n🔗 Нажмите "Привязать"',
                    { reply_markup: { inline_keyboard: [[{ text: '🔗 Привязать', callback_data: 'bind_account' }], [{ text: '◀ Назад', callback_data: 'back_to_main' }]] } }
                );
                return;
            }
            let message = '📃 *Ваши аккаунты:*\n\n';
            const buttons = [];
            for (const acc of userAccounts) {
                const account = await this.accounts.findOne({ lowID: acc.lowID });
                if (account) {
                    const tag = `#${this.lowIdToTag(acc.lowID)}`;
                    const vip = account.Vip === 1 ? '✅' : '❌';
                    const ach = account.achievements?.unlocked?.length || 0;
                    const skinCount = await this.getSkinCount(account);
                    message += `🟢 *${account.Name}*\n🏷️ ${tag} | 🏆 ${account.Trophies}\n👑 VIP: ${vip} | 🏆 ${ach} | 🎨 ${skinCount}\n\n`;
                    buttons.push([
                        { text: '🎮 Подключиться', callback_data: `connect_${acc.lowID}` },
                        { text: '📊 Инфо', callback_data: `view_account_${acc.lowID}` }
                    ]);
                }
            }
            buttons.push([{ text: '🏆 Достижения', callback_data: 'achievements_list' }]);
            buttons.push([{ text: '◀ Назад', callback_data: 'back_to_main' }]);
            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: buttons }
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
            const vip = account.Vip === 1 ? '✅' : '❌';
            const ach = account.achievements?.unlocked?.length || 0;
            const skinCount = await this.getSkinCount(account);
            const notifs = account.notifications || [];
            const unread = notifs.filter(n => !n.NotificationRead).length;

            await ctx.editMessageText(
                `👤 *${account.Name}*\n🏷️ ${tag}\n🆔 ${lowID}\n🏆 ${account.Trophies || 0}\n💎 ${account.Gems || 0}\n🪙 ${account.Gold || 0}\n👑 VIP: ${vip}\n🏆 Достижений: ${ach}\n🎨 Скинов: ${skinCount}\n📨 Уведомлений: ${notifs.length} (${unread} новых)`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🏆 Достижения', callback_data: `achievements_${lowID}` }],
                            [{ text: '🎮 Подключиться', callback_data: `connect_${lowID}` }],
                            [{ text: '📨 Очистить уведомления', callback_data: `clear_notifs_${lowID}` }],
                            [{ text: '🔗 Отвязать', callback_data: `unlink_${lowID}` }],
                            [{ text: '◀ Назад', callback_data: 'my_accounts' }]
                        ]
                    }
                }
            );
        } catch (error) {
            console.error('View account error:', error);
        }
    }

    async clearNotifications(ctx, lowID) {
        try {
            await ctx.answerCbQuery();
            await this.accounts.updateOne({ lowID }, { $set: { notifications: [] } });
            await ctx.editMessageText('✅ Уведомления очищены!', {
                reply_markup: { inline_keyboard: [[{ text: '◀ Назад', callback_data: `view_account_${lowID}` }]] }
            });
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
            await ctx.editMessageText('✅ Аккаунт отвязан', {
                reply_markup: { inline_keyboard: [[{ text: '📋 Мои аккаунты', callback_data: 'my_accounts' }]] }
            });
        } catch (error) {
            console.error('Unlink error:', error);
        }
    }

    // ============================================================
    // 🎮 ПОДКЛЮЧЕНИЕ
    // ============================================================

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
                `🎮 *Подключение к ${oldAccount.Name}*\n\n📱 Создайте НОВЫЙ аккаунт и напишите его тег\n📝 Пример: #ABC123`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [[{ text: '◀ Отмена', callback_data: 'back_to_main' }]] }
                }
            );
        } catch (error) {
            console.error('Connect error:', error);
        }
    }

    async handleConnectTag(ctx, text) {
        const newTag = text.trim();
        if (!newTag.startsWith('#')) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.connectMessageId, null,
                '❌ Тег должен начинаться с #',
                { reply_markup: { inline_keyboard: [[{ text: '◀ Отмена', callback_data: 'back_to_main' }]] } }
            );
            return;
        }
        const newId = this.tagToLowId(newTag);
        if (newId === null || newId === ctx.session.recoverOldId) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.connectMessageId, null,
                '❌ Неверный тег или тот же аккаунт',
                { reply_markup: { inline_keyboard: [[{ text: '◀ Отмена', callback_data: 'back_to_main' }]] } }
            );
            return;
        }
        const newAccount = await this.accounts.findOne({ lowID: newId });
        if (!newAccount) {
            await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.connectMessageId, null,
                `❌ Аккаунт ${newTag} не найден`,
                { reply_markup: { inline_keyboard: [[{ text: '◀ Отмена', callback_data: 'back_to_main' }]] } }
            );
            return;
        }
        const code = Math.floor(Math.random() * 9000) + 1000;
        ctx.session.connectCode = code;
        ctx.session.connectNewId = newId;
        ctx.session.waitingForNewTag = false;
        await this.accounts.updateOne({ lowID: newId }, {
            $push: { notifications: { NotificationID: 81, NotificationRead: false, NotificationTime: Math.floor(Date.now()/1000), NotificationText: `🔑 Код: ${code}`, NotificationType: 0 } }
        });
        await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.connectMessageId, null,
            `✅ Код в игре ${newTag}!\n📱 /connect 1234`,
            { reply_markup: { inline_keyboard: [[{ text: '◀ Отмена', callback_data: 'back_to_main' }]] } }
        );
    }

    async handleConnectCommand(ctx, text) {
        const parts = text.split(' ');
        if (parts.length < 2) return ctx.reply('❌ /connect КОД');
        const code = parseInt(parts[1]);
        if (isNaN(code) || code < 1000 || code > 9999) return ctx.reply('❌ 4-значный код');
        if (!ctx.session.connectCode || ctx.session.connectCode !== code) {
            return ctx.reply('❌ Неверный код!');
        }

        const oldAccount = await this.accounts.findOne({ lowID: ctx.session.recoverOldId });
        const newAccount = await this.accounts.findOne({ lowID: ctx.session.connectNewId });
        if (!oldAccount || !newAccount) return ctx.reply('❌ Аккаунт не найден');

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
            claimedBPRewards: oldAccount.claimedBPRewards, notifications: oldAccount.notifications,
            achievements: oldAccount.achievements, totalBattles: oldAccount.totalBattles,
            totalWins: oldAccount.totalWins
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

        ctx.session.connectCode = 0;
        ctx.session.connectNewId = 0;
        ctx.session.recoverOldId = 0;

        const newTag = `#${this.lowIdToTag(newAccount.lowID)}`;
        await ctx.reply(`✅ Аккаунт подключен! Зайдите в ${newTag}`, {
            reply_markup: { inline_keyboard: [[{ text: '📋 Мои аккаунты', callback_data: 'my_accounts' }]] }
        });
    }

    // ============================================================
    // 👑 АДМИН КОМАНДЫ
    // ============================================================

    async adminGiveGems(ctx, lowId, amount) {
        const user = await this.accounts.findOne({ lowID: lowId });
        if (!user) return ctx.reply('❌ Аккаунт не найден');
        
        await this.accounts.updateOne({ lowID: lowId }, {
            $push: {
                notifications: {
                    NotificationID: 89,
                    NotificationRead: false,
                    NotificationTime: Math.floor(Date.now()/1000),
                    NotificationText: `✨ +${amount} гемов (админ)`,
                    Gems: amount
                }
            }
        });
        
        await ctx.reply(`✅ Нотиф на ${amount} гемов отправлен ${user.Name}`);
    }

    async adminGiveVip(ctx, lowId, days = 30) {
        try {
            const user = await this.accounts.findOne({ lowID: lowId });
            if (!user) return ctx.reply('❌ Аккаунт не найден');

            const vipEndDate = new Date();
            vipEndDate.setDate(vipEndDate.getDate() + days);

            // ✅ Получаем доступные скины
            const availableSkins = await this.getAvailableSkins(user);
            let randomSkinGiven = false;
            let randomSkinId = null;
            let gemsInstead = false;

            if (availableSkins.length > 0) {
                // ✅ Есть доступные скины — выдаем рандомный
                const randomSkin = availableSkins[Math.floor(Math.random() * availableSkins.length)];
                randomSkinId = randomSkin.id;
                randomSkinGiven = await this.addSkinToAccount(user, randomSkinId);
                console.log(`[VIP] Случайный скин выдан: ${randomSkinId}`);
            } else {
                // ❌ Нет доступных скинов — выдаем 50 гемов
                gemsInstead = true;
                console.log(`[VIP] ❌ Нет доступных скинов, выдаем 50 гемов`);
            }

            // ✅ Нотификации
            const notifications = [
                { 
                    NotificationID: 89, 
                    NotificationRead: false, 
                    NotificationTime: Math.floor(Date.now()/1000), 
                    NotificationText: '👑 VIP +260💎', 
                    Gems: 260 
                },
                { 
                    NotificationID: 81, 
                    NotificationRead: false, 
                    NotificationTime: Math.floor(Date.now()/1000), 
                    NotificationText: `👑 VIP ${days} дней!`, 
                    NotificationType: 0 
                }
            ];
            
            if (randomSkinGiven && randomSkinId !== null) {
                notifications.push({ 
                    NotificationID: 94, 
                    NotificationRead: false, 
                    NotificationTime: Math.floor(Date.now()/1000), 
                    NotificationText: '🎨 Дополнительный скин', 
                    SkinID: randomSkinId 
                });
            }
            
            if (gemsInstead) {
                notifications.push({ 
                    NotificationID: 89, 
                    NotificationRead: false, 
                    NotificationTime: Math.floor(Date.now()/1000), 
                    NotificationText: '🎁 Все скины есть! +50💎', 
                    Gems: 50 
                });
            }

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

            console.log(`[VIP] ✅ VIP выдан ${user.Name} на ${days} дней`);
            await ctx.reply(
                `✅ *VIP на ${days} дней выдан ${user.Name}*\n\n` +
                `🎁 *Награды:*\n` +
                `• 💎 260 гемов (в нотифах)\n` +
                `${randomSkinGiven ? '• 🎨 Дополнительный скин' : ''}` +
                `${gemsInstead ? '• 💎 +50 гемов (все скины уже есть)' : ''}`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('[VIP] Ошибка:', error);
            ctx.reply('❌ Ошибка при выдаче VIP');
        }
    }

    // ============================================================
    // 🎯 ОБРАБОТЧИКИ
    // ============================================================

    setupHandlers() {
        console.log('🔄 Настройка обработчиков...');

        this.bot.start(async (ctx) => {
            console.log(`[START] ${ctx.from.username}`);
            await this.deleteUserMessages(ctx);
            await ctx.reply('🎮 Добро пожаловать!', { reply_markup: await this.getMainMenu() });
        });

        // АДМИН КОМАНДЫ
        this.bot.hears(/^\/help$/i, async (ctx) => {
            if (!this.isAdmin(ctx.from.id)) return ctx.reply('❌ Нет доступа');
            await ctx.reply(
                '📋 *Команды:*\n/finduser <тег>\n/givegems <ID> <кол-во>\n/givevip <ID> [дни]',
                { parse_mode: 'Markdown' }
            );
        });

        this.bot.hears(/^\/finduser\s+(.+)$/i, async (ctx) => {
            if (!this.isAdmin(ctx.from.id)) return ctx.reply('❌ Нет доступа');
            const tag = ctx.message.text.split(' ')[1];
            const lowId = this.tagToLowId(tag);
            if (lowId === null) return ctx.reply('❌ Неверный тег');
            const user = await this.accounts.findOne({ lowID: lowId });
            if (!user) return ctx.reply(`❌ Аккаунт ${tag} не найден`);
            await ctx.reply(`📊 *${user.Name}*\nID: ${lowId}\nГемы: ${user.Gems}\nТрофеи: ${user.Trophies}`, { parse_mode: 'Markdown' });
        });

        this.bot.hears(/^\/givegems\s+(\d+)\s+(\d+)$/i, async (ctx) => {
            if (!this.isAdmin(ctx.from.id)) return ctx.reply('❌ Нет доступа');
            await this.adminGiveGems(ctx, parseInt(ctx.match[1]), parseInt(ctx.match[2]));
        });

        this.bot.hears(/^\/givevip\s+(\d+)\s*(\d*)$/i, async (ctx) => {
            if (!this.isAdmin(ctx.from.id)) return ctx.reply('❌ Нет доступа');
            const days = ctx.match[2] ? parseInt(ctx.match[2]) : 30;
            await this.adminGiveVip(ctx, parseInt(ctx.match[1]), days);
        });

        this.bot.command('code', async (ctx) => {
            await this.handleCode(ctx, ctx.message.text);
        });

        this.bot.command('connect', async (ctx) => {
            await this.handleConnectCommand(ctx, ctx.message.text);
        });

        // CALLBACK
        this.bot.action('achievements_list', async (ctx) => {
            await this.deleteUserMessages(ctx);
            const tgacc = await this.loadTgacc();
            const userAccounts = tgacc.filter(a => a.id === ctx.from.id);
            if (userAccounts.length === 0) {
                await ctx.answerCbQuery('❌ Привяжите аккаунт!');
                return;
            }
            if (userAccounts.length === 1) {
                await this.showAchievements(ctx, userAccounts[0].lowID, 0);
            } else {
                const buttons = [];
                for (const acc of userAccounts) {
                    const account = await this.accounts.findOne({ lowID: acc.lowID });
                    if (account) {
                        const count = account.achievements?.unlocked?.length || 0;
                        buttons.push([{ text: `${account.Name} (${count}/37)`, callback_data: `achievements_${acc.lowID}` }]);
                    }
                }
                buttons.push([{ text: '◀ Назад', callback_data: 'back_to_main' }]);
                const sent = await ctx.editMessageText('🎯 *Выберите аккаунт:*', {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: buttons }
                });
                const userId = ctx.from.id;
                if (!this.userMessages.has(userId)) this.userMessages.set(userId, []);
                this.userMessages.get(userId).push(sent.message_id);
            }
        });

        this.bot.action(/ach_page_(\d+)_(\d+)/, async (ctx) => {
            await this.showAchievements(ctx, parseInt(ctx.match[1]), parseInt(ctx.match[2]));
        });

        this.bot.action(/achievements_(\d+)/, async (ctx) => {
            await this.showAchievements(ctx, parseInt(ctx.match[1]), 0);
        });

        this.bot.action(/refresh_achievements_(\d+)/, async (ctx) => {
            await this.showAchievements(ctx, parseInt(ctx.match[1]), 0);
        });

        this.bot.action('bind_account', async (ctx) => {
            await this.bindAccount(ctx);
        });

        this.bot.action('my_accounts', async (ctx) => {
            await this.showMyAccounts(ctx);
        });

        this.bot.action('donate', async (ctx) => {
            let text = '💰 *Прайс:*\n\n';
            for (const item of DONATE_PRICES.gems) {
                text += `💎 ${item.amount} гемов — ${item.price}₽\n`;
            }
            text += '\n👑 VIP (30 дней) — 100₽\n\n📌 @Xperia9339';
            await ctx.editMessageText(`🛒 *Донат магазин*\n\n${text}`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '💬 Менеджер', url: 'https://t.me/Xperia9339' }],
                        [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
                    ]
                }
            });
        });

        this.bot.action('back_to_main', async (ctx) => {
            ctx.session.bindAccount = false;
            ctx.session.waitingForNewTag = false;
            await this.deleteUserMessages(ctx);
            try {
                await ctx.editMessageText('🎮 Главное меню', { reply_markup: await this.getMainMenu() });
            } catch (e) {
                await ctx.reply('🎮 Главное меню', { reply_markup: await this.getMainMenu() });
            }
        });

        this.bot.action('cancel', async (ctx) => {
            await this.deleteUserMessages(ctx);
            await ctx.deleteMessage().catch(() => {});
            await ctx.reply('❌ Отменено', { reply_markup: await this.getMainMenu() });
        });

        this.bot.action('ignore', async (ctx) => {
            await ctx.answerCbQuery();
        });

        this.bot.action(/connect_(\d+)/, async (ctx) => {
            await this.connectToAccount(ctx, parseInt(ctx.match[1]));
        });

        this.bot.action(/view_account_(\d+)/, async (ctx) => {
            await this.viewAccount(ctx, parseInt(ctx.match[1]));
        });

        this.bot.action(/clear_notifs_(\d+)/, async (ctx) => {
            await this.clearNotifications(ctx, parseInt(ctx.match[1]));
        });

        this.bot.action(/unlink_(\d+)/, async (ctx) => {
            await this.unlinkAccount(ctx, parseInt(ctx.match[1]));
        });

        this.bot.on('text', async (ctx) => {
            if (ctx.session.bindAccount) {
                await this.handleBindTag(ctx, ctx.message.text);
                return;
            }
            if (ctx.session.waitingForNewTag) {
                await this.handleConnectTag(ctx, ctx.message.text);
                return;
            }
        });

        console.log('✅ Обработчики настроены');
    }

    startWebhookServer() {
        const app = express();
        const PORT = 4738;
        app.use(express.json());
        app.post('/webhook', async (req, res) => {
            try {
                console.log('📥 Webhook:', req.body);
                res.send('OK');
            } catch (error) {
                console.error('Webhook error:', error);
                res.status(500).send('ERROR');
            }
        });
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🔄 Webhook на порту ${PORT}`);
        });
    }

    startBot() {
        this.bot.launch().then(() => {
            console.log('🤖 Бот запущен!');
        });
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }

    async getMainMenu() {
        return {
            inline_keyboard: [
                [{ text: '🔗 Привязать аккаунт', callback_data: 'bind_account' }],
                [{ text: '📋 Мои аккаунты', callback_data: 'my_accounts' }],
                [{ text: '🛒 Донат магазин', callback_data: 'donate' }],
                [{ text: '🏆 Достижения', callback_data: 'achievements_list' }]
            ]
        };
    }
}

const bot = new DonationBot();
module.exports = bot;
