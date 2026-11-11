const PiranhaMessage = require('../../../PiranhaMessage')
const ByteStream = require("../../../../ByteStream")
const database = require("../../../../db/PlayerManager")
const Cards = require("../../../../CSVParser/Cards")
const skills = Cards.getAllSkills(4)

const Events = require('../../../../Logic/Events');
const Shop = require('../../../../Logic/Shop');
const Notifications = require('../../../../Logic/Notifications');
const Quests = require('../../../../Logic/Quests');

class OwnHomeDataMessage extends PiranhaMessage {
  constructor (session, account) {
    super(session)
    this.id = 24101
    this.session = session
    this.account = account
    this.version = 0
    this.stream = new ByteStream()
  }

  async encode () {
    const account = this.account
    
    // Write methods from Python structure
    const writeScId = (type, id) => {
      this.stream.writeDataReference(type, id);
    };

    const write_string_reference = (text) => {
      this.stream.writeString(text);
    };

    const writeBoolean = (value) => {
      this.stream.writeByte(value ? 1 : 0);
    };

    // Start encoding from Python OHD
    this.stream.writeVInt(0);
    this.stream.writeVInt(Math.floor(Date.now() / 1000));  // Timestamp
    
    this.stream.writeVInt(account.Trophies);  // trophies
    this.stream.writeVInt(account.Trophies);  // highest trophies

    this.stream.writeVInt(0);
    this.stream.writeVInt(account.TrophyRoadTier);  // reward for trophy road

    this.stream.writeVInt(99999);  // player experience

    writeScId(28, account.Thumbnail);  // profile icon
    writeScId(43, account.Namecolor);  // name color

    this.stream.writeVInt(0);
    
    // Selected Skins array
    this.stream.writeVInt(1);
    writeScId(29, account.SkinID);
    
    // Unlocked Skins array
    this.stream.writeVInt(account.Skins.length || 0);
    for(let skin of account.Skins || []){
      writeScId(29, skin);
    }
    
    this.stream.writeVInt(0);
    
    this.stream.writeVInt(1);
    this.stream.writeVInt(1);
    this.stream.writeVInt(1);
    
    writeBoolean(true); // token limit reached
    this.stream.writeVInt(1);
    writeBoolean(true);
    
    this.stream.writeVInt(account.TokensDoubler);
    this.stream.writeVInt(6); // season end timer
    this.stream.writeVInt(1);
    this.stream.writeVInt(1);
    
    this.stream.writeVInt(200);
    this.stream.writeVInt(5);
    this.stream.writeVInt(93);
    
    this.stream.writeVInt(206);
    
    this.stream.writeVInt(456);
    this.stream.writeVInt(1001);
    this.stream.writeVInt(2264);
    
    this.stream.writeVInt(4);
    this.stream.writeVInt(2);
    
    this.stream.writeVInt(2);
    this.stream.writeVInt(2);
    this.stream.writeVInt(1);
    this.stream.writeVInt(1);

    new Shop().encode(this.stream, this.account)

    this.stream.writeVInt(1);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    
    this.stream.writeVInt(200);
    this.stream.writeVInt(-1);
    this.stream.writeVInt(0);
    
    this.stream.writeVInt(100008);
    this.stream.writeVInt(0);
    
    writeScId(16, account.BrawlerID);
    
    write_string_reference("RU");  // location
    write_string_reference(account.AuthorCode);
    
    this.stream.writeVInt(2);
    this.stream.writeInt(4);
    this.stream.writeInt(0); //trophies anim
    this.stream.writeInt(3);
    this.stream.writeInt(0); //token anim
    
    this.stream.writeVInt(0);
    this.stream.writeVInt(1);
    this.stream.writeVInt(0);
    
    this.stream.writeVInt(account.BPToken);
    this.stream.writeVInt(account.BPPaidProgress);
    this.stream.writeVInt(account.BPFreeProgress);
    this.stream.writeVInt(account.BrawlPass);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
     
    //quest str start
    if (account.quests && account.quests.length > 0) {
        this.stream.writeVInt(1);
        new Quests(account).encode(this.stream);
    } else {
        this.stream.writeVInt(1);
        this.stream.writeVInt(0);
    }

    this.stream.writeVInt(1);
    
    this.stream.writeVInt(0);
    this.stream.writeVInt(2020141);
    
    this.stream.writeVInt(100);
    this.stream.writeVInt(10);

    this.stream.writeVInt(30);
    this.stream.writeVInt(3);
    this.stream.writeVInt(80);
    this.stream.writeVInt(10);
			
    this.stream.writeVInt(50);
    this.stream.writeVInt(1000);

    this.stream.writeVInt(500);
    this.stream.writeVInt(50);
    this.stream.writeVInt(999900);
    
    this.stream.writeVInt(0);

    this.stream.writeVInt(8);
    for (let i = 0; i < 8; i++){
      this.stream.writeVInt(i);
    }

    const EventsInstance = new Events();
    const Eventes = EventsInstance.getAllEvents();
    this.stream.writeVInt(Eventes.length);

    for (let map of Eventes) {
      this.stream.writeVInt(Eventes.indexOf(map) + 1);
      this.stream.writeVInt(Eventes.indexOf(map) + 1);
      writeBoolean(map.Ended || false);
      this.stream.writeVInt(map.timer || 0);

      this.stream.writeVInt(0);
      writeScId(15, map.id);

      this.stream.writeVInt(map.Status || 1);

      write_string_reference("");
      this.stream.writeVInt(0);
      this.stream.writeVInt(0);
      this.stream.writeVInt(0);

      if (map.Modifier > 0) {
        writeBoolean(true);
        this.stream.writeVInt(1);
      } else {
        writeBoolean(false);
      }

      this.stream.writeVInt(0);
      this.stream.writeVInt(0);
    }

    this.stream.writeVInt(0);

    this.stream.writeVInt(8);
    for (let i of [20, 35, 75, 140, 290, 480, 800, 1250]) {
      this.stream.writeVInt(i);
    }

    this.stream.writeVInt(8);
    for (let i of [1, 2, 3, 4, 5, 10, 15, 20]) {
      this.stream.writeVInt(i);
    }

    this.stream.writeVInt(3);
    for (let i of [10, 30, 80]) {
      this.stream.writeVInt(i);
    }

    this.stream.writeVInt(3);
    for (let i of [6, 20, 60]) {
      this.stream.writeVInt(i);
    }

    this.stream.writeVInt(4);
    for (let i of [20, 50, 140, 280]) {
      this.stream.writeVInt(i);
    }

    this.stream.writeVInt(4);
    for (let i of [150, 400, 1200, 2600]) {
      this.stream.writeVInt(i);
    }

    this.stream.writeVInt(2);
    this.stream.writeVInt(200);
    this.stream.writeVInt(20);

    this.stream.writeVInt(8640);
    this.stream.writeVInt(10);
    this.stream.writeVInt(5);

    this.stream.writeVInt(6);

    this.stream.writeVInt(50);
    this.stream.writeVInt(604800);

    writeBoolean(true);

    this.stream.writeVInt(0);

    this.stream.writeVInt(1);
    this.stream.writeInt(1);
    this.stream.writeInt(41000000 + 13);

    this.stream.writeVInt(0);

    this.stream.writeInt(0);
    this.stream.writeInt(account.lowID);

    // ИСПРАВЛЕНИЕ: Создаем экземпляр Notifications
    new Notifications(this.account).encode(this.stream);

    this.stream.writeVInt(1);

    writeBoolean(true);

    this.stream.writeVInt(0);
    this.stream.writeVInt(0);

    this.stream.writeVInt(0);
    this.stream.writeVInt(account.lowID);

    this.stream.writeVInt(0);
    this.stream.writeVInt(0);

    this.stream.writeVInt(0);
    this.stream.writeVInt(0);

    write_string_reference(account.Name);
    this.stream.writeVInt(account.Name !== "Brawler" ? 1 : 0);

    this.stream.writeInt(0);
    this.stream.writeVInt(8);

    // Unlocked brawlers array FROM MY JS CODE
    this.stream.writeVInt(account.Brawlers.length + 4);

    for (const brawler of account.Brawlers) {
      writeScId(23, brawler.cardID);
      this.stream.writeVInt(brawler.unlocked ? 1 : 0);
    }

    writeScId(5, 1);
    this.stream.writeVInt(account.boxTokens);

    writeScId(5, 8);
    this.stream.writeVInt(account.Gold);

    writeScId(5, 9);
    this.stream.writeVInt(account.BigBoxTokens);

    writeScId(5, 10);
    this.stream.writeVInt(account.Starpoints);

    this.stream.writeVInt(account.Brawlers.length);
    for (const brawler of account.Brawlers) {
      writeScId(16, brawler.id);
      this.stream.writeVInt(brawler.trophies);
    }

    this.stream.writeVInt(account.Brawlers.length);
    for (const brawler of account.Brawlers) {
      writeScId(16, brawler.id);
      this.stream.writeVInt(brawler.trophies);
    }

    this.stream.writeVInt(0);

    this.stream.writeVInt(account.Brawlers.length);
    for (const brawler of account.Brawlers) {
      writeScId(16, brawler.id);
      this.stream.writeVInt(brawler.points);
    }

    this.stream.writeVInt(account.Brawlers.length);
    for (const brawler of account.Brawlers) {
      writeScId(16, brawler.id);
      this.stream.writeVInt(brawler.level);
    }

    this.stream.writeVInt(account.Brawlers.length);
    for(let brawler of account.Brawlers){
      writeScId(23, brawler.skill);
      this.stream.writeVInt(brawler.skill ? 1 : 0);
    }

    this.stream.writeVInt(0);
    this.stream.writeVInt(account.Gems);
    this.stream.writeVInt(account.Gems);
    this.stream.writeVInt(1);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(0);
    this.stream.writeVInt(2);
    this.stream.writeVInt(Math.floor(Date.now() / 1000));

    console.log("[INFO] Message OwnHomeData has been sent.");
  }
}

module.exports = OwnHomeDataMessage
