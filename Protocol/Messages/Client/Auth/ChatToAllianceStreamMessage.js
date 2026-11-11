const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")
const database = require("../../../../db/PlayerManager")
const AllianceStreamMessage = require("../../Server/Auth/AllianceStreamMessage");

class ChatToAllianceStreamMessage extends PiranhaMessage {
  constructor(bytes, client) {
    super(client);
    this.session = client;
    this.id = 14315;
    this.version = 0;
    this.stream = new ByteStream(bytes);
  }

  async decode() {
    this.msg = this.stream.readString();
    console.log(`[CHAT DECODE] Message: "${this.msg}"`);
  }

  async process() {
    try {
      if (!this.msg || this.msg.trim().length === 0) return;

      if (this.msg.length > 200) {
        this.msg = this.msg.substring(0, 200);
      }

      const player = this.session.player;
      if (!player || !player.lowID || !player.ClubID) return;

      console.log(`[CHAT] Player: ${player.Name} (ID:${player.lowID}), Club: ${player.ClubID}`);

      // Получаем клуб
      const club = await database.getClub(database.getDB(), player.ClubID);
      if (!club) {
        console.log(`[CHAT] Клуб ${player.ClubID} не найден`);
        return;
      }

      // Сохраняем сообщение в БД
      const chatData = {
        msg: this.msg.trim(),
        id: player.lowID,
        event: 0x2,
        name: player.Name,
        role: player.ClubRole,
        whosend: player.Name,
        tick: Date.now()
      };

      const savedMessage = await database.clubAddMessages(player.ClubID, chatData);
      
      console.log(`[CHAT] Sending SINGLE message to sender`);
      
      // ОТПРАВЛЯЕМ ТОЛЬКО ПОСЛЕДНЕЕ СООБЩЕНИЕ
      // true - флаг что это одно сообщение
      new AllianceStreamMessage(this.session, savedMessage, true).send();
      
      console.log(`[CHAT SUCCESS] Single message sent: "${this.msg}"`);

    } catch (error) {
      console.error('[CHAT ERROR]:', error);
    }
  }
}

module.exports = ChatToAllianceStreamMessage;