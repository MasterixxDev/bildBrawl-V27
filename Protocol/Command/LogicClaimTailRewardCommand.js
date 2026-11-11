const database = require("../../db/PlayerManager")

const PiranhaMessage = require('../PiranhaMessage')
const ByteStream = require("../../ByteStream")
const LogicBoxCommand = require('./LogicBoxCommand');

class ClaimRankUpReward extends PiranhaMessage{
    constructor(bytes, session) {
        super(session, bytes);
        this.session = session;
        this.commandID = 535;
    }

    decode(){
///
    }

    async process(){
        const account = await database.getAccount(this.session.player);

        new LogicBoxCommand(this.session,12,account, 1, false 
          ).send()

        return await database.replaceValue(account.token, 'BPToken', account.BPToken-500)
    }
}
module.exports = ClaimRankUpReward