const { MongoClient } = require("mongodb");
const Cards = require("../CSVParser/Cards");
const { generateRandomString } = require("../Utils/Helper");
require("../Utils/Logger");

const UnlockCards = Cards.getBrawlersUnlocks();

const DB_URL = process.env.DB_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "jevilv26";
const ACCOUNTS_COLLECTION = "acc";
const CLUBS_COLLECTION = "clubs";

let db;
const clubListCache = new Map();

async function connectToDB() {
  try {
    const client = new MongoClient(DB_URL);
    await client.connect();
    db = client.db(DB_NAME);
    ServerLog("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB");
    throw err;
  }
}

async function getNextAccountID() {
  const accountsCollection = db.collection(ACCOUNTS_COLLECTION);
  const lastAccount = await accountsCollection.find().sort({ lowID: -1 }).limit(1).toArray();
  return lastAccount.length > 0 ? lastAccount[0].lowID + 1 : 1;
}

async function createAccount(plr) {
  const accountsCollection = db.collection(ACCOUNTS_COLLECTION);
  const lowID = await getNextAccountID();
  
  const account = {
    lowID: lowID,
    token: plr.token,
    Trophies: plr.trophies || 0,
    TrophyRoadTier: plr.TrophyRoadTier || 0,
    Experience: plr.exp || 0,
    Thumbnail: plr.thumbNail || 0,
    Namecolor: plr.nameColor || 0,
    TokensDoubler: plr.tokensDoubler || 0,
    BattleTokens: plr.battleTokens || 0,
    Tickets: plr.tickets || 0,
    Starpoints: plr.starpoints || 0,
    BigBoxTokens: plr.bigboxtokens || 0,
    Gold: plr.gold || 0,
    boxTokens: plr.boxTokens || 0,
    Gems: plr.gems || 0,
    BrawlerID: plr.brawlerID || 0,
    SkinID: plr.skinID || 0,
    AuthorCode: plr.authorCode || "",
    Name: plr.name || "Player",
    ClubID: plr.clubID || 0,
    ClubRole: plr.clubRole || 0,
    TrioWINS: plr.TrioWINS || 0,
    SoloWINS: plr.SoloWINS || 0,
    Vip: 0,
    Status: plr.status || "",
    Shop: plr.Shop || [],
    Skins: plr.Skins || [],
    Brawlers: await getBrawlerArray(),
    Box: plr.Box || 0,
    BigBox: plr.BigBox || 0,
    BrawlPass: plr.BrawlPass || 0,
    BPToken: plr.BPToken || 0,
    BPPaidProgress: plr.BPPaidProgress || 1,
    BPFreeProgress: plr.BPFreeProgress || 1,
    claimedBPRewards: plr.claimedBPRewards || {
      paid: [],
      free: []
    },
    notifications: plr.notifications || [],
    achievements: {
      unlocked: [],
      progress: {},
      lastChecked: new Date()
    },
    totalBattles: 0,
    totalWins: 0,
    quests: plr.quests || [],
  };

  try {
    const result = await accountsCollection.insertOne(account);
    const insertedAccount = await accountsCollection.findOne({
      _id: result.insertedId,
    });
    return insertedAccount;
  } catch (error) {
    console.error("Error creating account:", error);
    throw error;
  }
}

async function getBrawlerArray() {
  const unlockCardsArray = Object.values(UnlockCards);
  const arrays = [];
  for (let i = 0; i < 37; i++) {
    let unlock = i === 0 ? true : false;
    arrays.push({
      id: i,
      cardID: unlockCardsArray[i],
      skill: 0,
      unlocked: unlock,
      level: 0,
      points: 0,
      trophies: 0,
    });
  }
  return arrays;
}

async function getAccount(plr) {
  const accountsCollection = db.collection(ACCOUNTS_COLLECTION);
  
  if (!plr) {
    return null;
  }

  const query = {};
  
  if (plr.token && plr.token !== '') {
    query.token = plr.token;
  } else if (plr.lowID && plr.lowID > 0) {
    query.lowID = plr.lowID;
  } else {
    return null;
  }

  const account = await accountsCollection.findOne(query);

  if (!account) {
    return null;
  }

  let newTrophies = account.Brawlers.reduce(
    (sum, brawler) => sum + parseInt(brawler.trophies || 0),
    0
  );

  try {
    await accountsCollection.updateOne(
      { _id: account._id },
      { $set: { Trophies: newTrophies } }
    );
  } catch (error) {
    console.error("Error updating trophies:", error);
    throw error;
  }

  account.Trophies = newTrophies;
  return account;
}

async function updateAccountFields(token, updates) {
  const accountsCollection = db.collection(ACCOUNTS_COLLECTION);

  try {
    if (!token || token === '') {
      return false;
    }

    const account = await accountsCollection.findOne({ token: token });

    if (!account) {
      return false;
    }

    const updateResult = await accountsCollection.updateOne(
      { token: token },
      { $set: updates }
    );

    return updateResult.modifiedCount > 0;
  } catch (error) {
    console.error(`Error updating account fields for token ${token}:`, error);
    throw error;
  }
}

async function getIDAccount(lowID) {
  const accountsCollection = db.collection(ACCOUNTS_COLLECTION);
  try {
    const account = await accountsCollection.findOne({ lowID: lowID });
    return account || null;
  } catch (error) {
    console.error("Error getting account by lowID:", error);
    throw error;
  }
}

async function replaceValue(token, value_name, new_value) {
  const accountsCollection = db.collection(ACCOUNTS_COLLECTION);

  try {
    if (!token || token === '') {
      return false;
    }

    const account = await accountsCollection.findOne({ token: token });

    if (!account) {
      return false;
    }

    const updateResult = await accountsCollection.updateOne(
      { token },
      { $set: { [value_name]: new_value } }
    );

    return updateResult.modifiedCount > 0;
  } catch (error) {
    console.error(`Error replacing value for token ${token}:`, error);
    throw error;
  }
}

async function getAllPlayers() {
    const accountsCollection = db.collection(ACCOUNTS_COLLECTION);

    try {
        const players = await accountsCollection.find({}).toArray();
        return players;
    } catch (error) {
        console.error('Error retrieving players from MongoDB:', error.message);
        return [];
    }
}

async function getLeaders() {
    const accountsCollection = db.collection(ACCOUNTS_COLLECTION);

    try {
        const accounts = await accountsCollection
            .find({})
            .project({
                lowID: 1,
                Brawlers: 1,
                username: 1,
                Name: 1,
                name: 1,
                Thumbnail: 1,
                Namecolor: 1,
                _id: 0
            })
            .toArray();

        const processedLeaders = accounts.map(account => {
            const brawlersArray = Array.isArray(account.Brawlers) ? account.Brawlers : [];
            
            const totalTrophies = brawlersArray.reduce((sum, brawler) => {
                return sum + (brawler.trophies || 0);
            }, 0);

            return {
                lowID: account.lowID,
                Trophies: totalTrophies,
                Name: account.username || account.Name || account.name || 'Unknown',
                Thumbnail: account.Thumbnail || 0,
                Namecolor: account.Namecolor || 0
            };
        });

        processedLeaders.sort((a, b) => b.Trophies - a.Trophies);
        const top200 = processedLeaders.slice(0, 200);

        return top200;
    } catch (error) {
        console.error(`[Leaderboard Error] ${error.message}`);
        return [];
    }
}

async function getGlobalBrawlerLeaders(BID) {
    const accountsCollection = db.collection(ACCOUNTS_COLLECTION);

    try {
        const pipeline = [
            { $match: { 
                "Brawlers.id": BID,
                "Brawlers.trophies": { $exists: true }
            }},
            { $unwind: "$Brawlers" },
            { $match: { "Brawlers.id": BID } },
            { $sort: { "Brawlers.trophies": -1 } },
            { $limit: 200 },
            { $project: {
                lowID: 1,
                Name: {
                    $let: {
                        vars: {
                            names: ["$username", "$Name", "$name"]
                        },
                        in: {
                            $reduce: {
                                input: "$$names",
                                initialValue: "Unknown",
                                in: {
                                    $cond: [
                                        { $and: [
                                            { $eq: ["$$value", "Unknown"] },
                                            { $ne: ["$$this", null] }
                                        ]},
                                        "$$this",
                                        "$$value"
                                    ]
                                }
                            }
                        }
                    }
                },
                Thumbnail: { $ifNull: ["$Thumbnail", 0] },
                Namecolor: { $ifNull: ["$Namecolor", 0] },
                brawlerTrophies: "$Brawlers.trophies",
                brawlerId: "$Brawlers.id",
                _id: 0
            }}
        ];

        const leaders = await accountsCollection.aggregate(pipeline).toArray();
        return leaders.map(leader => ({
            ...leader,
            brawler: {
                id: leader.brawlerId,
                trophies: leader.brawlerTrophies
            }
        }));
        
    } catch (error) {
        console.error(`[Brawler Leaderboard Error] ${error.message}`);
        return [];
    }
}

async function getNextClubID() {
  const clubsCollection = db.collection(CLUBS_COLLECTION);
  const lastClub = await clubsCollection.find().sort({ clubLowID: -1 }).limit(1).toArray();
  return lastClub.length > 0 ? lastClub[0].clubLowID + 1 : 1;
}

async function getClubLeaders() {
  try {
    const clubsCollection = db.collection(CLUBS_COLLECTION);
    const clubs = await clubsCollection.aggregate([
      { $sort: { clubtrophies: -1 } },
      { $limit: 200 },
      { $project: {
          clubID: '$clubLowID',
          Name: '$clubName',
          Trophies: '$clubtrophies',
          BadgeID: '$clubbadgeID',
          Type: '$clubtype',
          Region: '$clubregion',
          Trophiesneeded: '$clubtrophiesneeded',
          members: '$members'
        }
      }
    ]).toArray();

    return clubs;

  } catch (error) {
    console.error("Error getting club leaders:", error);
    return [];
  }
}

async function createClub(db, { name, badgeID, type, trophiesNeeded, region, description, leader }) {
  const clubs = db.collection(CLUBS_COLLECTION);
  const clubLowID = await getNextClubID();
  
  const newClub = {
    clubLowID: clubLowID,
    clubHighID: 0,
    clubName: name,
    clubbadgeID: badgeID || 1,
    clubtype: type || 1,
    clubtrophies: leader.trophies || 0,
    clubtrophiesneeded: trophiesNeeded || 0,
    clubregion: region || "RU",
    clubfriendlyfamily: 0,
    clubdescription: description || "",
    messages: [],
    members: [
      {
        lowID: leader.lowID,
        role: 2,
        trophies: leader.trophies,
        name: leader.name,
        experience: leader.exp,
        icon: leader.icon,
        namecolor: leader.nameColor,
        state: 2
      }
    ]
  };

  const result = await clubs.insertOne(newClub);
  return await clubs.findOne({ _id: result.insertedId });
}

async function getClub(db, clubLowID) {
  const clubs = db.collection(CLUBS_COLLECTION);
  return await clubs.findOne({ clubLowID });
}

async function listClubs(db) {
  const clubs = db.collection(CLUBS_COLLECTION);
  return await clubs.find({}).toArray();
}

async function joinClub(db, clubLowID, player) {
  const clubs = db.collection(CLUBS_COLLECTION);
  const accountsCollection = db.collection(ACCOUNTS_COLLECTION);
  
  const club = await clubs.findOne({ clubLowID });
  if (!club) throw new Error("Club not found");

  if (player.trophies < club.clubtrophiesneeded) {
    throw new Error("Not enough trophies");
  }

  club.members = club.members.filter(m => m.lowID !== player.lowID);
  club.members.push({
    lowID: player.lowID,
    role: 1,
    trophies: player.trophies,
    name: player.name,
    experience: player.exp,
    icon: player.icon,
    namecolor: player.nameColor,
    state: 2
  });

  club.clubtrophies = club.members.reduce((sum, m) => sum + (m.trophies || 0), 0);

  await accountsCollection.updateOne(
    { lowID: player.lowID },
    { 
      $set: { 
        ClubID: clubLowID,
        ClubRole: 1
      } 
    }
  );

  await clubs.updateOne({ clubLowID }, { $set: club });
  return club;
}

async function getClubList() {
  const cacheKey = 'clubListData';
  const now = Date.now();

  try {
    if (clubListCache.has(cacheKey)) {
      const { data, expiry } = clubListCache.get(cacheKey);
      if (now < expiry) {
        return data;
      }
    }

    const clubsCollection = db.collection(CLUBS_COLLECTION);
    const clubs = await clubsCollection.aggregate([
      { $match: { clubtype: 1 } },
      { $sample: { size: 100 } },
      { $project: {
          clubID: '$clubLowID',
          Name: '$clubName',
          Trophies: '$clubtrophies',
          BadgeID: '$clubbadgeID',
          Type: '$clubtype',
          Region: '$clubregion',
          Trophiesneeded: '$clubtrophiesneeded',
          members: '$members'
        }
      }
    ]).toArray();

    const expiry = now + 10000;
    clubListCache.set(cacheKey, { data: clubs, expiry });
    return clubs;

  } catch (error) {
    console.error("Error getting club list from MongoDB:", error);
    return [];
  }
}

async function clubUpdate(db, clubLowID, settings) {
  const clubs = db.collection(CLUBS_COLLECTION)
  const updateData = {
    clubdescription: settings.Description || "",
    clubbadgeID: settings.BadgeID || 1,
    clubtype: settings.Type || 1,
    clubtrophiesneeded: settings.Trophiesneeded || 0,
    clubfriendlyfamily: settings.FriendlyFamily || 0
  }

  await clubs.updateOne(
    { clubLowID: clubLowID },
    { $set: updateData }
  )
  return await clubs.findOne({ clubLowID: clubLowID })
}

async function clubAddMessages(clubLowID, chatData) {
  const clubsCollection = db.collection(CLUBS_COLLECTION);
  
  try {
    const message = {
      ...chatData,
      tick: Date.now(),
      messageId: generateRandomString(16)
    };

    const result = await clubsCollection.updateOne(
      { clubLowID: clubLowID },
      { 
        $push: { 
          messages: {
            $each: [message],
            $slice: -100
          }
        } 
      }
    );

    if (result.modifiedCount === 0) {
      const club = await clubsCollection.findOne({ clubLowID: clubLowID });
      if (!club) {
        throw new Error(`Club ${clubLowID} not found`);
      }
      
      await clubsCollection.updateOne(
        { clubLowID: clubLowID },
        { 
          $set: { 
            messages: [message]
          } 
        }
      );
    }

    return message;
  } catch (error) {
    console.error("Error adding club message:", error);
    throw error;
  }
}

async function getClubMessages(clubLowID, limit = 150) {
  const clubsCollection = db.collection(CLUBS_COLLECTION);
  
  try {
    const club = await clubsCollection.findOne({ clubLowID: clubLowID });

    if (!club) {
      return [];
    }
    
    if (!club.messages) {
      await clubsCollection.updateOne(
        { clubLowID: clubLowID },
        { $set: { messages: [] } }
      );
      return [];
    }
    
    const sortedMessages = club.messages.sort((a, b) => a.tick - b.tick);
    const limitedMessages = sortedMessages.slice(0, limit);
    
    return limitedMessages;
  } catch (error) {
    console.error("Error getting club messages:", error);
    return [];
  }
}

async function clearClubMessages(clubLowID) {
  const clubsCollection = db.collection(CLUBS_COLLECTION);
  try {
    const result = await clubsCollection.updateOne(
      { clubLowID: clubLowID },
      { $set: { messages: [] } }
    );
    return result.modifiedCount > 0;
  } catch (error) {
    console.error("Error clearing club messages:", error);
    return false;
  }
}

async function addNotification(token, notification) {
  const accountsCollection = db.collection(ACCOUNTS_COLLECTION);
  
  try {
    if (!notification.NotificationTime) {
      notification.NotificationTime = Math.floor(Date.now() / 1000);
    }
    
    const result = await accountsCollection.updateOne(
      { token: token },
      { 
        $push: { 
          notifications: {
            $each: [notification],
            $slice: -50
          }
        } 
      }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error("Error adding notification:", error);
    return false;
  }
}

async function markNotificationAsRead(token, notificationIndex) {
  const accountsCollection = db.collection(ACCOUNTS_COLLECTION);
  
  try {
    const result = await accountsCollection.updateOne(
      { token: token },
      { 
        $set: { 
          [`notifications.${notificationIndex}.NotificationRead`]: true 
        } 
      }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
}

async function clearNotifications(token) {
  const accountsCollection = db.collection(ACCOUNTS_COLLECTION);
  
  try {
    const result = await accountsCollection.updateOne(
      { token: token },
      { $set: { notifications: [] } }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error("Error clearing notifications:", error);
    return false;
  }
}

async function getUnreadNotificationsCount(token) {
  const accountsCollection = db.collection(ACCOUNTS_COLLECTION);
  
  try {
    const account = await accountsCollection.findOne({ token: token });
    
    if (!account || !account.notifications) {
      return 0;
    }
    
    return account.notifications.filter(notification => !notification.NotificationRead).length;
  } catch (error) {
    console.error("Error getting unread notifications count:", error);
    return 0;
  }
}

async function getClubByID(clubID) {
  try {
    const clubsCollection = db.collection(CLUBS_COLLECTION);
    const club = await clubsCollection.findOne({ clubLowID: parseInt(clubID) });
    return club;
  } catch (error) {
    console.error("Error getting club by ID:", error);
    return null;
  }
}

async function updateAchievements(lowID, achievements) {
  const accountsCollection = db.collection(ACCOUNTS_COLLECTION);
  
  try {
    const result = await accountsCollection.updateOne(
      { lowID: lowID },
      { $set: { achievements: achievements } }
    );
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('[ACHIEVEMENTS] Error updating achievements:', error);
    return false;
  }
}

async function leaveClub(db, clubLowID, playerLowID) {
  const clubsCollection = db.collection(CLUBS_COLLECTION);
  const accountsCollection = db.collection(ACCOUNTS_COLLECTION);
  
  try {
    const club = await clubsCollection.findOne({ clubLowID: clubLowID });
    if (!club) {
      throw new Error("Club not found");
    }

    const memberIndex = club.members.findIndex(m => m.lowID === playerLowID);
    if (memberIndex === -1) {
      throw new Error("Player not in club");
    }

    const member = club.members[memberIndex];
    club.members.splice(memberIndex, 1);
    
    club.clubtrophies = club.members.reduce((sum, m) => sum + (m.trophies || 0), 0);

    if (club.members.length === 0) {
      await clubsCollection.deleteOne({ clubLowID: clubLowID });
    } else {
      await clubsCollection.updateOne(
        { clubLowID: clubLowID },
        { $set: { 
          members: club.members,
          clubtrophies: club.clubtrophies
        }}
      );
    }

    await accountsCollection.updateOne(
      { lowID: playerLowID },
      { $set: { ClubID: 0, ClubRole: 0 } }
    );

    return true;
  } catch (error) {
    console.error("Error leaving club:", error);
    throw error;
  }
}

module.exports = {
  createAccount,
  getAccount,
  getIDAccount,
  replaceValue,
  getAllPlayers,
  getLeaders,
  getGlobalBrawlerLeaders,
  getClubLeaders,
  createClub,
  getClub,
  listClubs,
  joinClub,
  getClubList,
  clubUpdate,
  clubAddMessages,
  getClubMessages,
  clearClubMessages,
  getClubByID,
  updateAccountFields,
  addNotification,
  markNotificationAsRead,
  clearNotifications,
  getUnreadNotificationsCount,
  updateAchievements,
  leaveClub,
  connectToDB,
  getDB: () => db
};
