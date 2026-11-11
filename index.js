const net = require("net");
const config = require("./config.json");
const MessageFactory = require("./Protocol/MessageFactory");
const MessagesHandler = require("./Networking/MessagesHandler");
const Queue = require("./Networking/Queue");
require("colors");
require("./Utils/Logger");
const Player = require("./Logic/Player");
const database = require("./db/PlayerManager");
const LoadCSV = require("./CSVParser/LoadCSV")
LoadCSV.loadCSV()

console.log('=== SERVER STARTING ===');
console.log(`Node version: ${process.version}`);
console.log(`Current dir: ${process.cwd()}`);

const readline = require("readline");
const rl = readline.createInterface({
  'input': process.stdin,
  'output': process.stdout
});
global.rl = rl;



const SeasonReset = require("./Utils/seasonReset");

function updateOnlineCount() {
  const online = global.sessionsMap.size;
  process.stdout.write(`\r${'[ONLINE]'.cyan} Players online: ${online.toString().green} `);
}

function removeSession(sessionId, session) {
  if (global.sessionsMap.has(sessionId)) {
    global.sessionsMap.delete(sessionId);
    updateOnlineCount();
  }
}

(async () => {
  await database.connectToDB();

  const seasonReset = new SeasonReset();
  await seasonReset.checkAndResetSeason();
  
  setInterval(async () => {
    await seasonReset.checkAndResetSeason();
  }, 6 * 60 * 60 * 1000);
})();

const server = new net.Server();
const PORT = config.port;

process.on("SIGINT", async () => {
  console.log("\nReceived SIGINT signal. Performing cleanup...");
  server.close();
  process.exit();
});

global.sessionsMap = new Map();

server.on("connection", async (session) => {
  session.setNoDelay(true);
  session.setTimeout(config.sessionTimeoutSeconds * 1000);

  const [ip] = session.remoteAddress.split(":").slice(-1);
  session.ip = ip;

  session.Log = (text) => Client(session.ip, text);
  session.Warn = (text) => ClientWarn(session.ip, text);
  session.Err = (text) => ClientError(session.ip, text);

  // ===== AFK SYSTEM =====
  session.lastActivity = Date.now();
  session.AFK_TIMEOUT = 300000; // 5 минут
  // ===== END AFK SYSTEM =====

  session.id = global.sessionsMap.size === 0 ? 1 : Math.max(...global.sessionsMap.keys(), 0) + 1;
  session.queue = new Queue(config.maxQueueSize, config.disableQueuebugtxtFile);
  global.sessionsMap.set(session.id, session);

  updateOnlineCount();
  
  session.Log(`The player has connected! (SESSIONID: ${session.id})`);
  session.player = new Player();
  const packets = new MessageFactory(false).getAllPackets();
  const MessageHandler = new MessagesHandler(session, packets);

  session.on("data", async (bytes) => {
    // ===== AFK UPDATE =====
    const packetId = bytes.readUInt16BE(0);
    
    // Игнорируем только KeepAlive (10108)
    // Любой другой пакет = игрок активен
    if (packetId !== 10108 && packetId !== 14102) {
      session.lastActivity = Date.now();
    }
    // ===== END AFK UPDATE =====

    let messageHeader = {};
    session.queue.push(bytes);
    if (!session.queue.isBusy()) {
      const queueBytes = session.queue.release();

      if (Array.isArray(queueBytes)) {
        for (let packet of queueBytes) {
          await MessageHandler.handle(packet.id, packet.bytes, {});
        }
        return null;
      }

      messageHeader = {
        id: queueBytes.readUInt16BE(0),
        len: queueBytes.readUIntBE(2, 3),
        version: queueBytes.readUInt16BE(5),
        bytes: queueBytes.slice(7, messageHeader.len),
      };

      await MessageHandler.handle(messageHeader.id, messageHeader.bytes, {});
    }
  });
  
  session.on("end", async () => {
    session.Log("Client disconnected.");
    removeSession(session.id, session);
    return session.destroy();
  });

  session.on("error", async (error) => {
    try {
      removeSession(session.id, session);
      return session.destroy();
    } catch (e) {}
  });

  session.on("timeout", async () => {
    session.Warn("Client timeout disconnected");
    removeSession(session.id, session);
    return session.destroy();
  });

  session.on("close", async () => {
    removeSession(session.id, session);
  });
});

server.once("listening", () => {
  ServerLog(`${config.serverName} started on ${PORT} port!`);
  updateOnlineCount();
  console.log();
});
server.listen(PORT);

// ===== AFK TIMER - ПРОВЕРКА КАЖДУЮ МИНУТУ =====
setInterval(() => {
  const now = Date.now();
  const toRemove = [];
  
  for (const [id, session] of global.sessionsMap) {
    const idleTime = now - session.lastActivity;
    if (idleTime > session.AFK_TIMEOUT) {
      toRemove.push({ id, session, idleTime });
    }
  }
  
  for (const { id, session, idleTime } of toRemove) {
    session.Warn(`AFK timeout - disconnected (${Math.floor(idleTime/1000)}s idle, ${Math.floor(idleTime/60000)}min)`);
    session.destroy();
  }
  
  if (toRemove.length > 0) {
    updateOnlineCount();
  }
}, 60000); // Проверка каждую минуту
// ===== END AFK TIMER =====

process.on("uncaughtException", (e) => Warn(e.stack));
process.on("unhandledRejection", (e) => Warn(e.stack));