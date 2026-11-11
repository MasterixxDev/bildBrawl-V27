const fs = require('fs');
const path = require('path');

class Events {
    static REFRESH_MINUTES = 60;
    static slots = new Map();
    static configSlots = [];
    static refreshTimer = null;

    // ✅ КОНСТРУКТОР ДЛЯ СОВМЕСТИМОСТИ
    constructor() {
        if (!Events.slots || Events.slots.size === 0) {
            Events.init();
        }
    }

    static init() {
        this.loadSettings();
        this.generateEvents();
        
        setInterval(() => {
            this.generateEvents();
        }, this.REFRESH_MINUTES * 60 * 1000);
    }

    static generateEvents() {
        for (const config of this.configSlots) {
            const event = this.generateEvent(config.allowedModes, config.slot);
            if (event) {
                this.slots.set(config.slot, event);
            }
        }
    }

    static generateEvent(allowedModes, slot) {
        const locations = require('../CSVParser/locations').getAllMaps();
        
        let availableMaps = [];
        for (const mode of allowedModes) {
            if (locations[mode]) {
                availableMaps = availableMaps.concat(locations[mode]);
            }
        }

        if (availableMaps.length === 0) {
            console.log(`[Events] Нет карт для слота ${slot} с режимами: ${allowedModes.join(', ')}`);
            return null;
        }

        const randomMap = availableMaps[Math.floor(Math.random() * availableMaps.length)];
        
        return {
            slot: slot,
            id: randomMap.id,
            timer: this.REFRESH_MINUTES * 60,
            Ended: false,
            tokensclaimed: [],
            reward: 20,
            Status: 1,
            Modifier: 0
        };
    }

    static loadSettings() {
        try {
            const configPath = path.join(__dirname, '../gameplay.json');
            const data = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(data);
            
            this.configSlots = config.slots.map(slot => ({
                slot: slot.slot,
                allowedModes: slot.game_modes
            }));
            
            console.log(`[Events] Загружено ${this.configSlots.length} слотов`);
        } catch (error) {
            console.error('[Events] Ошибка загрузки gameplay.json:', error);
            this.configSlots = [
                { slot: 1, allowedModes: ['CoinRush'] },
                { slot: 2, allowedModes: ['BattleRoyale'] },
                { slot: 3, allowedModes: ['BountyHunter'] },
                { slot: 4, allowedModes: ['LaserBall'] },
                { slot: 5, allowedModes: ['SoloBounty'] }
            ];
        }
    }

    // ✅ СТАТИЧЕСКИЙ МЕТОД
    static getAllEvents() {
        return Array.from(this.slots.values());
    }

    // ✅ МЕТОД ЭКЗЕМПЛЯРА (для new Events().getAllEvents())
    getAllEvents() {
        return Events.getAllEvents();
    }

    static getEvents() {
        return Array.from(this.slots.values());
    }

    static getEvent(slot) {
        return this.slots.get(slot) || null;
    }

    static hasSlot(slot) {
        return this.slots.has(slot);
    }

    static getEventBySlot(slot) {
        return this.slots.get(slot);
    }
}

module.exports = Events;