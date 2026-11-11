// CSVParser/locations.js

const parse = require("./CSVParser")
const locations = parse("./CSVParser/CSV/csv_logic/locations.csv")

function getAllMaps() {
    let lineCount = 0;
    var BattleRoyale = [];
    var BattleRoyaleTeam = [];
    var BountyHunter = [];
    var CoinRush = [];
    var LaserBall = [];
    var SoloBounty = []; 
    var AttackDefend = [];
    
    const parsedlocations = locations.filter(f => f.Name !== '')
    parsedlocations.forEach(e => {
        if (lineCount >= 1) {
            if (e.Disabled == '') {
                switch (e.GameMode) {
                    case "BattleRoyale":
                        BattleRoyale.push({ id: lineCount, AllowedMaps: e.AllowedMaps });
                        break;
                    case "BattleRoyaleTeam":
                        BattleRoyaleTeam.push({ id: lineCount, AllowedMaps: e.AllowedMaps });
                        break;
                    case "BountyHunter":
                        BountyHunter.push({ id: lineCount });
                        break;
                    case "CoinRush":
                        CoinRush.push({ id: lineCount });
                        break;
                    case "LaserBall":
                        LaserBall.push({ id: lineCount });
                        break;
                    case "SoloBounty": // ⭐ LONESTAR
                        SoloBounty.push({ id: lineCount });
                        break;
                    case "AttackDefend": // ⭐ LONESTAR
                        AttackDefend.push({ id: lineCount });
                        break;
                    default:
                        break;
                }
            }
        }

        if (e['0'] !== "") {
            lineCount++;
        }
    });
    
    BattleRoyale = BattleRoyale.filter(battleRoyaleItem => {
        return BattleRoyaleTeam.some(battleRoyaleTeamItem => battleRoyaleTeamItem.AllowedMaps === battleRoyaleItem.AllowedMaps);
    });
    BattleRoyaleTeam = BattleRoyaleTeam.filter(battleRoyaleItem => {
        return BattleRoyale.some(BattleRoyale => BattleRoyale.AllowedMaps === battleRoyaleItem.AllowedMaps);
    });
    
    return {
        "BattleRoyale": BattleRoyale,
        "BattleRoyaleTeam": BattleRoyaleTeam,
        "BountyHunter": BountyHunter,
        "CoinRush": CoinRush,
        "LaserBall": LaserBall,
        "SoloBounty": SoloBounty,
        "AttackDefend": AttackDefend  
    }
}

module.exports = {
    getAllMaps
}