const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")
const database = require("../../../../db/PlayerManager")

const SetSupportedCreatorReponse = require('./SetSupportedCreatorReponse');
const LogicSetSupportedCreatorCommand = require('./LogicSetSupportedCreatorMessage');
const LogicShopCommand = require('../../../Command/LogicShopCommand');
const fs = require('fs').promises;

class SetSupportedCreatorMessage extends PiranhaMessage {
  constructor(bytes, session) {
    super(session);
    this.session = session;
    this.id = 18686;
    this.version = 0;
    this.stream = new ByteStream(bytes);
  }

  async decode() {
    this.CodeName = this.stream.readString();
  }

  async process() {
    try {
      const AuthorsData = await fs.readFile('./Logic/Authors.json', 'utf8');
      const AuthorParsed = JSON.parse(AuthorsData);

      const SpecialCodesData = await fs.readFile('./Logic/SpecialCodes.json', 'utf8');
      const SpecialCodes = JSON.parse(SpecialCodesData);

      const account = await database.getAccount(this.session.player);
      
      const foundItem = AuthorParsed.includes(this.CodeName);
      const foundSpecialCode = SpecialCodes.find(code => code.id === this.CodeName);

      if (this.CodeName == "") {
        this.session.AuthorCode = "";
        await database.replaceValue(account.token, 'AuthorCode', this.session.AuthorCode);
        return await new LogicSetSupportedCreatorCommand(this.session).send();
      }

      if (foundSpecialCode) {
        if (!account.usedCodes) {
          account.usedCodes = [];
        }

        if (account.usedCodes.includes(this.CodeName)) {
          return await new SetSupportedCreatorReponse(this.session).send();
        }

        const rewardItems = [];
        
        if (foundSpecialCode.type === "skin") {
          rewardItems.push({
            id: 4,
            multiplier: 1,
            skinID: foundSpecialCode.skinID
          });
        } 
        else if (foundSpecialCode.type === "gems") {
          rewardItems.push({
            id: 16,
            multiplier: foundSpecialCode.amount || 10
          });
        }
        else if (foundSpecialCode.type === "megabox") {
          rewardItems.push({
            id: 10,
            multiplier: foundSpecialCode.amount || 1
          });
        }

        account.usedCodes.push(this.CodeName);
        
        this.session.AuthorCode = this.CodeName;
        
        await Promise.all([
          database.replaceValue(account.token, 'AuthorCode', this.session.AuthorCode),
          database.replaceValue(account.token, 'usedCodes', account.usedCodes)
        ]);

        if (rewardItems.length > 0) {
          await new LogicShopCommand(this.session, account, rewardItems).send();
        }

        return await new LogicSetSupportedCreatorCommand(this.session).send();
      }

      if (!foundItem) return await new SetSupportedCreatorReponse(this.session).send();

      this.session.AuthorCode = this.CodeName;
      await database.replaceValue(account.token, 'AuthorCode', this.session.AuthorCode);
      return await new LogicSetSupportedCreatorCommand(this.session).send();
      
    } catch (error) {
      console.error('Error processing SetSupportedCreatorMessage:', error);
    }
  }
}

module.exports = SetSupportedCreatorMessage;