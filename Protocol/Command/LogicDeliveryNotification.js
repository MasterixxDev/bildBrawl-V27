const PiranhaMessage = require('../PiranhaMessage');
const ByteStream = require("../../ByteStream");

class LogicDeliveryNotification extends PiranhaMessage {
    constructor(session, SkinID, BrawlerID, Gems) {
        super(session);
        this.id = 24111;
        this.session = session;
        this.version = 0;
        this.stream = new ByteStream();
        this.SkinID = SkinID;
        this.BrawlerID = BrawlerID;
        this.Gems = Gems;
    }

    async encode() {
        let items = 0;
        if (this.SkinID !== undefined && this.SkinID !== null) items++;
        if (this.BrawlerID !== undefined && this.BrawlerID !== null) items++;
        if (this.Gems !== undefined && this.Gems !== null && this.Gems > 0) items++;

        this.stream.writeVInt(203);
        this.stream.writeVInt(0);
        this.stream.writeVInt(1);
        this.stream.writeVInt(100);

        this.stream.writeVInt(items);

        if (this.SkinID !== undefined && this.SkinID !== null) {
            this.stream.writeVInt(1);
            this.stream.writeVInt(0);
            this.stream.writeVInt(9);
            this.stream.writeDataReference(29, this.SkinID);
            this.stream.writeVInt(0);
            this.stream.writeVInt(0);
        }

        if (this.BrawlerID !== undefined && this.BrawlerID !== null) {
            this.stream.writeVInt(1);
            this.stream.writeDataReference(16, this.BrawlerID);
            this.stream.writeVInt(1);
            this.stream.writeVInt(0);
            this.stream.writeVInt(0);
        }

        if (this.Gems !== undefined && this.Gems !== null && this.Gems > 0) {
            this.stream.writeVInt(this.Gems);
            this.stream.writeVInt(0);
            this.stream.writeVInt(8);
            this.stream.writeVInt(0);
            this.stream.writeVInt(0);
            this.stream.writeVInt(0);
        }

        for (let i = 0; i < 13; i++) {
            this.stream.writeVInt(0);
        }

        console.log(`[DELIVERY] Анимация отправлена: Skin=${this.SkinID}, Brawler=${this.BrawlerID}, Gems=${this.Gems}`);
    }
}

module.exports = LogicDeliveryNotification;
