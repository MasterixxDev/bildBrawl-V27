const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")

class AllianceStreamEntryMessage extends PiranhaMessage {
  constructor(client, chatData, messageCount) {
    super(client);
    this.id = 24312;
    this.version = 1;
    this.session = client;
    this.chat = chatData;
    this.messageCount = messageCount;
    this.stream = new ByteStream();
  }

  encode() {
    if (!this.chat) {
      console.log("[AllianceStream] No chat data to encode");
      return;
    }

    try {
      console.log(`[AllianceStream ENCODE] Encoding single message: "${this.chat.msg}"`);
      
      // ПРАВИЛЬНАЯ СТРУКТУРА ДЛЯ ОДНОГО СООБЩЕНИЯ
      this.stream.writeVInt(this.chat.event || 0x2);    // event type
      this.stream.writeVInt(0x0);                       // unknown
      this.stream.writeVInt(this.chat.tick || Date.now()); // timestamp
      this.stream.writeVInt(0x0);                       // unknown
      this.stream.writeVInt(this.chat.id || 0);         // sender ID
      this.stream.writeString(this.chat.whosend || ""); // sender name
      this.stream.writeVInt(this.chat.role || 1);       // club role
      this.stream.writeVInt(0x0);                       // unknown
      this.stream.writeVInt(0x0);                       // unknown
      this.stream.writeString(this.chat.msg || "");     // message text

      console.log(`[AllianceStream ENCODE] Single message encoded successfully`);

    } catch (error) {
      console.error("Ошибка кодирования AllianceStreamEntry:", error);
    }
  }
}

module.exports = AllianceStreamEntryMessage;