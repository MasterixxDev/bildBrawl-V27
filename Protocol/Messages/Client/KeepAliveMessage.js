const PiranhaMessage = require('../../PiranhaMessage')
const ByteStream = require("../../../ByteStream")

class KeepAliveMessage extends PiranhaMessage {
  constructor (bytes, session) {
    super(session)
    this.session = session
    this.id = 10108
    this.version = 0
    this.stream = new ByteStream(bytes)
  }

  async decode () {
    this.stream.readInt()
  }

  async process () {
    const commands = Commands.getCommands()
    
    if (this.buffer != undefined) {
      if (this.count == 0 && this.buffer.length > 32) {
        let lastEncount = 0
        let lastByte = 0
        do {
          lastEncount = this.offset
          lastByte = this.stream.readVInt()
        } while (!Utils.range(500, 600).includes(lastByte) && commands.indexOf(String(lastByte)) == -1)
          
        if (Utils.range(500, 600).includes(lastByte)) {
          this.offset = lastEncount
          this.count = 2
        }
      }
    }

    // ===== AFK CHECK - только если есть команды =====
    if (this.count > 0) {
        const now = Date.now();
        if (now - this.session.lastActivity > this.session.AFK_TIMEOUT) {
            this.session.Warn(`AFK timeout (${Math.floor((now - this.session.lastActivity)/1000)}s idle)`);
            this.session.destroy();
            return;
        }
        this.session.lastActivity = now;
        console.log(`[${this.session.ip}] ✅ Activity from command (count: ${this.count})`);
    }
    // ===== END AFK CHECK =====

    if (this.count == 0) return;

    for (let i = 0; i < this.count; i++) {
      this.commandID = this.stream.readVInt()
      this.stream.readVInt()
      this.stream.readVInt()
      this.stream.readVInt()
      this.stream.readVInt()
      
      if (commands.indexOf(String(this.commandID)) != -1) {
        const command = new (Commands.handle(this.commandID))(this.bytes.slice(this.offset), this.session)
        console.log(`Command ${this.commandID} (${command.constructor.name}) handled!`)
        command.decode(this)
        await command.process()
      } else {
        console.log(`Command ${this.commandID} isn't handled!`)
      }
    }
}}