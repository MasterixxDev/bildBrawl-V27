const database = require("../../db/PlayerManager")

const PiranhaMessage = require('../PiranhaMessage')
const ByteStream = require("../../ByteStream")

class deliveryItemsBP extends PiranhaMessage {
  constructor(session, box, item = 0, amount = 0, fipi = -1, level = 1, road = 9) {
    super(session);
    this.id = 24111;
    this.session = session;
    this.version = 1;
    this.stream = new ByteStream();
    this.box = box
    this.item = item
    this.amount = amount
    this.fipi = fipi
    this.level = level
    this.road = road
  }

  async encode() {
    this.stream.writeVInt(203);
    this.stream.writeVInt(0);

    this.stream.writeVInt(1); // количество предметов
    
    this.stream.writeVInt(100); // неизвестно
    this.stream.writeVInt(1); // неизвестно  
    this.stream.writeVInt(this.amount); // количество
    
    if (this.fipi == -1){
      this.stream.writeVInt(0); // нет дополнительных данных
    } else {
      this.stream.writeVInt(16); // тип данных (16 для браулера/скина)
      this.stream.writeVInt(this.fipi); // ID браулера/скина
    }
    
    this.stream.writeVInt(this.item); // тип предмета
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);

    this.stream.writeVInt(0);
    
    if (this.road === 9 || this.road === 10) {
      this.stream.writeVInt(this.road); // 9 = Paid BP, 10 = Free BP
      this.stream.writeVInt(this.level); // Уровень Brawl Pass
    } else {
      this.stream.writeVInt(this.road);
      this.stream.writeVInt(this.level);
    }
    
    this.stream.writeVInt(0);
  }
}

module.exports = deliveryItemsBP;