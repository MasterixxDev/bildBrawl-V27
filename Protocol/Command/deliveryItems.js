const database = require("../../db/PlayerManager")

const PiranhaMessage = require('../PiranhaMessage')
const ByteStream = require("../../ByteStream")

class deliveryItems extends PiranhaMessage {
  constructor(session, box, item = 0, amount = 0, fipi = -1, TrophyRoadTier, road = 6, level = 1) {
    super(session);
    this.id = 24111;
    this.session = session;
    this.version = 1;
    this.stream = new ByteStream();
    this.box = box
    this.item = item
    this.amount = amount
    this.fipi = fipi
    this.TrophyRoadTier = TrophyRoadTier
    this.road = road
    this.level = level
    this.items = []
  }

  async encode() {
    this.stream.writeVInt(203);
    this.stream.writeVInt(0);

    this.stream.writeVInt(1)
    this.stream.writeVInt(100)
    this.stream.writeVInt(1)
    this.stream.writeVInt(this.amount)
    if (this.fipi == -1){
      this.stream.writeVInt(0)
    }
    else{
      this.stream.writeVInt(16)
      this.stream.writeVInt(this.fipi)
    }
    this.stream.writeVInt(this.item)
    this.stream.writeVInt(0)
    this.stream.writeVInt(0)
    this.stream.writeVInt(0)
    this.stream.writeVInt(0)

    this.stream.writeVInt(0);
    
    if (this.road === 6) {
      this.stream.writeVInt(6);
      this.stream.writeVInt(this.TrophyRoadTier+1);
    } else if (this.road === 9) {
      this.stream.writeVInt(9);
      this.stream.writeVInt(this.level + 1);
    } else if (this.road === 10) {
      this.stream.writeVInt(10);
      this.stream.writeVInt(this.level + 1);
    }
    this.stream.writeVInt(0);
  }
}

module.exports = deliveryItems;