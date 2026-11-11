class PlayerDisplayData {
    constructor(stream, name, playericon, namecolor) {
      this.stream = stream;
      this.name = name;
      this.playericon = playericon
      this.namecolor = namecolor
    }
  
    encode() {
      this.stream.writeString(this.name);
      console.log(this.name)
      this.stream.writeVInt(100);
      this.stream.writeVInt(28000000 + this.playericon);
      console.log(this.playericon)
      this.stream.writeVInt(43000000 + this.namecolor);
      console.log(this.namecolor)
    }
  }
  
  module.exports = PlayerDisplayData;
  