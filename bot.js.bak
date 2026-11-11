const { Telegraf, session, Scenes: { BaseScene, Stage }, Markup } = require('telegraf');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const express = require('express');
const Character = require("./CSVParser/Characters");

const API_TOKEN = '7962335034:AAE5qGHa1TUvwy5XjYwrg5GMzwcQ6eoIQMY';
const ADMIN_IDS = [7249489180, 7249489180];
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'jevilv26';
const COLLECTION_NAME = 'acc';

const PAYMENT_CONFIG = {
    API_KEY: 'hoj6yqzKdfkT3lRy2uWVvJRfohRRsnBEtkj6I0mTuwIa',
    TERMINAL_ID: '0bfe4686-f540-4ca8-95e6-897f7e92c952',
    API_URL: 'http://pl2.bitrixnodes.pro:4444/api/paymentcreate'
};

const PRODUCTS = {
    "vip": { 
        price: 65, 
        reward: { vip: 1, gems: 260 },
        name: "🔥 ВИП",
        emoji: "🔥"
    },
    "gems170": { 
        price: 45, 
        reward: { gems: 170 },
        name: "170💎",
        emoji: "💎"
    },
    "gems360": { 
        price: 75, 
        reward: { gems: 360 },
        name: "360💎", 
        emoji: "💎"
    },
    "gems1500": { 
        price: 200, 
        reward: { gems: 1500 },
        name: "1500💎",
        emoji: "💎"
    },
    "gems2000": { 
        price: 250, 
        reward: { gems: 2000 },
        name: "2000💎",
        emoji: "💎"
    },
    "gems3000": { 
        price: 350, 
        reward: { gems: 3000 },
        name: "3000💎",
        emoji: "💎"
    },
    "gems5000": { 
        price: 500, 
        reward: { gems: 5000 },
        name: "5000💎",
        emoji: "💎"
    },
    "gems10000": { 
        price: 800, 
        reward: { gems: 10000 },
        name: "10000💎",
        emoji: "💎"
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
            const productId = ctx.scene.state.productId;
            const product = PRODUCTS[productId];
            
            if (!product) {
                await ctx.reply('❌ Товар не найден');
                return ctx.scene.leave();
            }

            await ctx.reply(
                `🎮 *Для покупки ${product.name} укажите ваш игровой тег:*\n\n` +
                `📝 *Пример:* #2PP\n` +
                `💳 *Сумма к оплате:* ${product.price}₽`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        Markup.button.callback('❌ Отменить', 'cancel')
                    ])
                }
            );
        });

        buyScene.on('text', async (ctx) => {
            const gameTag = ctx.message.text.trim();
            const productId = ctx.scene.state.productId;
            const product = PRODUCTS[productId];

            if (!gameTag.startsWith('#')) {
                await ctx.reply(
                    '❌ *Неверный формат тега!*\n\n' +
                    '✅ *Правильный формат:* #2PP\n' +
                    '📝 *Пример:* #2PP, #ABC123',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            try {
                const payment = await this.createPayment(product.price, `b_${gameTag}_${productId}`);
                
                if (!payment || !payment.pay_url) {
                    await ctx.reply(
                        '❌ *Ошибка при создании платежа!*\n\n' +
                        'Попробуйте позже или обратитесь в поддержку.',
                        { parse_mode: 'Markdown' }
                    );
                    return ctx.scene.leave();
                }

                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.url('💳 Перейти к оплате', payment.pay_url)],
                    [Markup.button.callback('❌ Отменить покупку', 'cancel')]
                ]);

                await ctx.reply(
                    `🎮 *Детали покупки:*\n\n` +
                    `👤 *Игровой тег:* ${gameTag}\n` +
                    `📦 *Товар:* ${product.name}\n` +
                    `💵 *Сумма:* ${product.price}₽\n\n` +
                    `⬇️ *Нажмите кнопку ниже для оплаты:*`,
                    {
                        parse_mode: 'Markdown',
                        ...keyboard
                    }
                );

                await ctx.reply(
                    `📋 *После оплаты:*\n\n` +
                    `✅ Награды придут автоматически в течении 1-3 минут\n` +
                    `📬 Проверьте уведомления в игре\n` +
                    `🔄 Перезайдите в игре если награды не появились`,
                    {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            Markup.button.callback('🔄 Главное меню', 'back_to_main')
                        ])
                    }
                );

            } catch (error) {
                console.error('Ошибка при обработке платежа:', error);
                await ctx.reply(
                    '❌ *Произошла ошибка!*\n\n' +
                    'Попробуйте позже или обратитесь в поддержку.',
                    { parse_mode: 'Markdown' }
                );
            } finally {
                await ctx.scene.leave();
            }
        });

        buyScene.action('cancel', async (ctx) => {
            await ctx.deleteMessage();
            await ctx.reply(
                '❌ *Покупка отменена*\n\n' +
                'Вы вернулись в главное меню.',
                { 
                    parse_mode: 'Markdown',
                    ...await this.getMainMenu() 
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
            this.client = new MongoClient(MONGODB_URI);
            await this.client.connect();
            this.db = this.client.db(DB_NAME);
            this.accounts = this.db.collection(COLLECTION_NAME);
            this.loadSkins();
            console.log('✅ Bot started with donation system');
            this.setupHandlers();
            this.startBot();
        } catch (error) {
            console.error('❌ DB error:', error);
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
            console.log(`✅ Skins loaded: ${this.skins.length}`);
        } catch (error) {
            console.error('❌ Skin load error:', error);
            this.skins = [];
        }
    }

    tagToLowId(tag) {
        const TagChar = ["0", "2", "8", "9", "P", "Y", "L", "Q", "G", "R", "J", "C", "U", "V"];
        let Id = 0;
        for (let c of tag.toUpperCase()) {
            if (!TagChar.includes(c)) return null;
            Id = Id * TagChar.length + TagChar.indexOf(c);
        }
        return (Id - Id % 256) >> 8;
    }

    isAdmin(userId) {
        return ADMIN_IDS.includes(userId);
    }

    generateRandomSkinForBrawler(brawlerId) {
        try {
            if (!this.skins || this.skins.length === 0) {
                return 999000 + brawlerId;
            }

            const availableSkins = this.skins.filter(skin => {
                const skinBrawler = Character.getBrawlerBySkinID(skin.id);
                return skinBrawler === brawlerId;
            });

            if (availableSkins.length > 0) {
                const randomSkin = availableSkins[Math.floor(Math.random() * availableSkins.length)];
                return randomSkin.id;
            }

            return 999000 + brawlerId;
        } catch (error) {
            return 999000 + brawlerId;
        }
    }

    async getMainMenu() {
        return Markup.inlineKeyboard([
            [Markup.button.callback('🔗 Привязать аккаунт', 'bind_account')],
            [Markup.button.callback('🛒 Донат магазин', 'donate')]
        ]);
    }

    async getProductsMenu() {
        const buttons = [];
        const productEntries = Object.entries(PRODUCTS);
        
        for (let i = 0; i < productEntries.length; i += 2) {
            const row = [];
            for (let j = 0; j < 2 && i + j < productEntries.length; j++) {
                const [productId, product] = productEntries[i + j];
                row.push(Markup.button.callback(
                    `${product.emoji} ${product.name} | ${product.price}₽`, 
                    `buy_${productId}`
                ));
            }
            buttons.push(row);
        }
        
        buttons.push([Markup.button.callback('🔙 Назад', 'back_to_main')]);
        
        return Markup.inlineKeyboard(buttons);
    }

    async createPayment(amount, custom) {
        try {
            const response = await axios.post(PAYMENT_CONFIG.API_URL, {
                terminalId: PAYMENT_CONFIG.TERMINAL_ID,
                amount: amount,
                custom: custom,
                paymentMethod: "card-ru"
            }, {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": PAYMENT_CONFIG.API_KEY
                },
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('Payment creation error:', error);
            return null;
        }
    }

    async handleWebhook(data) {
        console.log("📥 Webhook data:", data);

        const status = data.Status;
        const custom = data.custom || "";
        const trsId = data.TrsId;

        const parts = custom.split("_");
        if (parts.length < 3) {
            return "INVALID_CUSTOM";
        }

        const gameTag = parts[1];
        const productId = parts[2];
        const product = PRODUCTS[productId];
        
        if (!product) {
            return "UNKNOWN_PRODUCT";
        }

        const tagId = this.tagToLowId(gameTag);
        if (tagId === null) {
            return "INVALID_TAG";
        }

        const account = await this.accounts.findOne({ lowID: tagId });
        if (!account) {
            return "NO_ACCOUNT";
        }

        if (status === "success") {
            const reward = product.reward;
            const update = { $inc: {} };
            
            for (const [key, value] of Object.entries(reward)) {
                if (key === "vip") {
                    update.$set = { vip: value };
                } else {
                    update.$inc[key] = value;
                }
            }

            const notifs = account.notifications || [];

            if (productId === "vip") {
                const unlockedBrawlers = account.Brawlers 
                    ? account.Brawlers.filter(b => b.unlocked === true).map(b => b.id)
                    : [];

                let skinId = 0;
                if (unlockedBrawlers.length > 0) {
                    const brawlerId = unlockedBrawlers[Math.floor(Math.random() * unlockedBrawlers.length)];
                    skinId = this.generateRandomSkinForBrawler(brawlerId);
                }

                const vipEndDate = new Date();
                vipEndDate.setDate(vipEndDate.getDate() + 30);

                const gemsNotif = {
                    NotificationID: 89,
                    NotificationRead: false,
                    NotificationTime: Math.floor(Date.now() / 1000),
                    NotificationText: 'vip gems',
                    Gems: 260
                };

                const skinNotif = {
                    NotificationID: 94,
                    NotificationRead: false,
                    NotificationTime: Math.floor(Date.now() / 1000),
                    NotificationText: 'vip skin',
                    SkinID: skinId
                };

                const vipWelcomeNotif = {
                    NotificationID: 81,
                    NotificationRead: false,
                    NotificationTime: Math.floor(Date.now() / 1000),
                    NotificationText: '🎉 Вы получили VIP статус на 30 дней! Наслаждайтесь привилегиями!',
                    NotificationType: 0
                };

                notifs.push(gemsNotif, skinNotif, vipWelcomeNotif);

                update.$set = { 
                    vip: 1,
                    vipEndDate: vipEndDate,
                    vipLastChecked: new Date()
                };

            } else {
                const gemsAmount = reward.gems;

                const gemsNotif = {
                    NotificationID: 89,
                    NotificationRead: false,
                    NotificationTime: Math.floor(Date.now() / 1000),
                    NotificationText: 'Спасибо за поддержку!',
                    Gems: gemsAmount
                };

                notifs.push(gemsNotif);
            }

            if (Object.keys(update.$inc).length > 0 || reward.vip) {
                await this.accounts.updateOne({ lowID: tagId }, update);
            }

            await this.accounts.updateOne(
                { lowID: tagId }, 
                { $set: { notifications: notifs.slice(-50) } }
            );

            console.log(`🎁 [REWARD] ${productId} выдано аккаунту ${gameTag} (TrsId=${trsId})`);
            return "OK";
        } else {
            return "PAYMENT_FAILED";
        }
    }

    setupHandlers() {
        this.bot.start(async (ctx) => {
            await ctx.reply(
                `🎮 *Добро пожаловать в донат магазин!*\n\n` +
                `✨ *Здесь вы можете:*\n` +
                `🛒 Купить гемы и VIP статус\n\n` +
                `💎 *Выберите действие:*`,
                {
                    parse_mode: 'Markdown',
                    ...await this.getMainMenu()
                }
            );
        });

        this.bot.action('donate', async (ctx) => {
            await ctx.editMessageText(
                `🛒 *Донат магазин*\n\n` +
                `💎 *Выберите товар:*\n` +
                `✨ Все покупки обрабатываются автоматически\n\n` +
                `⚡ *Мгновенная выдача после оплаты*`,
                {
                    parse_mode: 'Markdown',
                    ...await this.getProductsMenu()
                }
            );
        });

        this.bot.action('back_to_main', async (ctx) => {
            await ctx.editMessageText(
                `🎮 *Главное меню*\n\n` +
                `✨ *Выберите действие:*`,
                {
                    parse_mode: 'Markdown',
                    ...await this.getMainMenu()
                }
            );
        });

        this.bot.action('cancel', async (ctx) => {
            await ctx.deleteMessage();
            await ctx.reply(
                '❌ *Действие отменено*\n\n' +
                'Вы вернулись в главное меню.',
                { 
                    parse_mode: 'Markdown',
                    ...await this.getMainMenu() 
                }
            );
        });

        Object.keys(PRODUCTS).forEach(productId => {
            this.bot.action(`buy_${productId}`, async (ctx) => {
                await ctx.answerCbQuery();
                await ctx.scene.enter('buyScene', { productId });
            });
        });

        this.bot.command('testbuy', async (ctx) => {
            if (!this.isAdmin(ctx.from.id)) return;

            const args = ctx.message.text.split(' ');
            if (args.length < 3) {
                return ctx.reply(
                    '❌ *Формат:* /testbuy <тег> <товар>\n\n' +
                    '📦 *Доступные товары:* vip, gems170, gems360, gems1500, gems2000, gems3000, gems5000, gems10000\n' +
                    '📝 *Пример:* /testbuy 2PP vip',
                    { parse_mode: 'Markdown' }
                );
            }

            const gameTag = args[1];
            const productId = args[2];
            const product = PRODUCTS[productId];

            if (!product) {
                return ctx.reply(
                    '❌ *Неверный товар!*\n\n' +
                    '📦 *Доступные товары:* vip, gems170, gems360, gems1500, gems2000, gems3000, gems5000, gems10000',
                    { parse_mode: 'Markdown' }
                );
            }

            const testWebhookData = {
                Status: "success",
                custom: `b_${gameTag}_${productId}`,
                TrsId: "TEST_" + Date.now()
            };

            try {
                const result = await this.handleWebhook(testWebhookData);
                
                if (result === "OK") {
                    await ctx.reply(
                        `✅ *Тестовая покупка успешна!*\n\n` +
                        `👤 *Тег:* ${gameTag}\n` +
                        `📦 *Товар:* ${product.name}\n` +
                        `💎 *Награды выданы в игре*\n\n` +
                        `📬 *Проверьте уведомления в игре*`,
                        { parse_mode: 'Markdown' }
                    );
                } else {
                    await ctx.reply(
                        `❌ *Ошибка:* ${result}\n\n` +
                        `Проверьте правильность тега и существование аккаунта.`,
                        { parse_mode: 'Markdown' }
                    );
                }
            } catch (error) {
                await ctx.reply(
                    `❌ *Ошибка при тестировании:*\n${error.message}`,
                    { parse_mode: 'Markdown' }
                );
            }
        });

        this.bot.command('gems', async (ctx) => {
            if (!this.isAdmin(ctx.from.id)) return ctx.reply("❌ No access");

            const args = ctx.message.text.split(' ');
            if (args.length !== 3) return ctx.reply("Format: /gems <tag> <amount>");

            try {
                const tag = args[1];
                const amount = parseInt(args[2]);
                const lowId = this.tagToLowId(tag);
                
                if (lowId === null) return ctx.reply("❌ Invalid tag");
                if (amount <= 0) return ctx.reply("❌ Invalid amount");

                const user = await this.accounts.findOne({ lowID: lowId });
                if (!user) return ctx.reply(`❌ Account not found`);

                const notif = {
                    NotificationID: 89,
                    NotificationRead: false,
                    NotificationTime: Math.floor(Date.now() / 1000),
                    NotificationText: 'Спасибо за поддержку!',
                    Gems: amount
                };

                await this.accounts.updateOne(
                    { lowID: lowId },
                    { 
                        $inc: { gems: amount },
                        $push: { notifications: { $each: [notif], $slice: -50 } } 
                    }
                );

                ctx.reply(`✅ ${tag} получил ${amount} гемов`);

            } catch (error) {
                ctx.reply("❌ Error");
            }
        });

        this.bot.command('vip', async (ctx) => {
            if (!this.isAdmin(ctx.from.id)) return ctx.reply("❌ No access");

            const args = ctx.message.text.split(' ');
            if (args.length !== 2) return ctx.reply("Format: /vip <tag>");

            try {
                const tag = args[1];
                const lowId = this.tagToLowId(tag);
                if (lowId === null) return ctx.reply("❌ Invalid tag");

                const user = await this.accounts.findOne({ lowID: lowId });
                if (!user) return ctx.reply(`❌ Account not found`);

                const unlockedBrawlers = user.Brawlers 
                    ? user.Brawlers.filter(b => b.unlocked === true).map(b => b.id)
                    : [];

                if (unlockedBrawlers.length === 0) {
                    return ctx.reply(`❌ No unlocked brawlers`);
                }

                const brawlerId = unlockedBrawlers[Math.floor(Math.random() * unlockedBrawlers.length)];
                const skinId = this.generateRandomSkinForBrawler(brawlerId);

                const vipEndDate = new Date();
                vipEndDate.setDate(vipEndDate.getDate() + 30);

                const gemsNotif = {
                    NotificationID: 89,
                    NotificationRead: false,
                    NotificationTime: Math.floor(Date.now() / 1000),
                    NotificationText: 'vip gems',
                    Gems: 260
                };

                const skinNotif = {
                    NotificationID: 94,
                    NotificationRead: false,
                    NotificationTime: Math.floor(Date.now() / 1000),
                    NotificationText: 'vip skin',
                    SkinID: skinId
                };

                const vipWelcomeNotif = {
                    NotificationID: 81,
                    NotificationRead: false,
                    NotificationTime: Math.floor(Date.now() / 1000),
                    NotificationText: '🎉 Администратор выдал вам VIP статус на 30 дней!',
                    NotificationType: 0
                };

                await this.accounts.updateOne(
                    { lowID: lowId },
                    { 
                        $set: { 
                            Vip: 1,
                            vipEndDate: vipEndDate,
                            vipLastChecked: new Date()
                        },
                        $push: { notifications: { $each: [gemsNotif, skinNotif, vipWelcomeNotif], $slice: -50 } }
                    }
                );

                const isRealSkin = skinId < 999000;
                const status = isRealSkin ? "real" : "stub";
                ctx.reply(`✅ ${tag} is VIP (30 days)\n260 gems\nSkin (${status}) ID: ${skinId} for brawler ${brawlerId}`);

            } catch (error) {
                ctx.reply("❌ Error");
            }
        });

        this.bot.command('checkvip', async (ctx) => {
            if (!this.isAdmin(ctx.from.id)) return ctx.reply("❌ No access");

            const args = ctx.message.text.split(' ');
            if (args.length !== 2) return ctx.reply("Format: /checkvip <tag>");

            try {
                const tag = args[1];
                const lowId = this.tagToLowId(tag);
                if (lowId === null) return ctx.reply("❌ Invalid tag");

                const user = await this.accounts.findOne({ lowID: lowId });
                if (!user) return ctx.reply(`❌ Account not found`);

                if (user.vip !== 1) {
                    return ctx.reply(`❌ ${tag} doesn't have VIP`);
                }

                if (!user.vipEndDate) {
                    return ctx.reply(`✅ ${tag} has VIP (permanent)`);
                }

                const now = new Date();
                const vipEnd = new Date(user.vipEndDate);
                const timeLeft = vipEnd - now;
                const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

                ctx.reply(`✅ ${tag} has VIP\nDays left: ${daysLeft}\nExpires: ${vipEnd.toLocaleDateString()}`);

            } catch (error) {
                ctx.reply("❌ Error");
            }
        });

        this.bot.command('clearnotifs', async (ctx) => {
            if (!this.isAdmin(ctx.from.id)) return ctx.reply("❌ No access");

            const args = ctx.message.text.split(' ');
            if (args.length !== 2) return ctx.reply("Format: /clearnotifs <tag>");

            try {
                const tag = args[1];
                const lowId = this.tagToLowId(tag);
                if (lowId === null) return ctx.reply("❌ Invalid tag");

                await this.accounts.updateOne(
                    { lowID: lowId },
                    { $set: { notifications: [] } }
                );

                ctx.reply(`✅ Notifs cleared for ${tag}`);

            } catch (error) {
                ctx.reply("❌ Error");
            }
        });
    }

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
            console.log(`🔄 Webhook server running on port ${PORT}`);
        });
    }

    startBot() {
        this.bot.launch().then(() => {
            console.log('🤖 Bot running with donation system');
        });

        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
}

const bot = new DonationBot();
module.exports = bot;