const PiranhaMessage = require('../PiranhaMessage');
const ByteStream = require("../../ByteStream");
//const database = require('../../db/PlayerManager')

class LogicSelectStarPowerCommand extends PiranhaMessage{
    constructor(bytes, session){
        super(bytes)
        this.session = session;
        this.commandID = 529
        this.version = 0        
        this.stream = new ByteStream(bytes);

    }

    decode(self){
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.stream.readVInt()
        this.spg = this.stream.readVInt();
    }

    async process(){
        this.session.spg = this.spg
    }
}
module.exports = LogicSelectStarPowerCommand