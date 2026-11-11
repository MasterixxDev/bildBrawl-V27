const PiranhaMessage = require('../../PiranhaMessage');
const ByteStream = require('../../../ByteStream');

class AvailableServerCommandMessage extends PiranhaMessage {
    constructor(session, command) {
        super(session);
        this.id = 24111;
        this.session = session;
        this.version = 0;
        this.command = command;
        this.stream = new ByteStream();
    }

    encode() {
        this.stream.writeVInt(this.command.getCommandType());
        this.command.encode(this.stream);
    }
}

module.exports = AvailableServerCommandMessage;
