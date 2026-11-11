require("colors");
const buildPrefix = (mainPrefix) => mainPrefix + " >> ".gray

const PREFIXES = {
    SERVER: buildPrefix("[SERVER]".green.bold),
    WARN: buildPrefix("[WARNING]".yellow.bold),
    ERROR: buildPrefix("[ERROR]".red.bold),
    FATAL: buildPrefix("[FATAL]".red.bold)
}

const log = (text) => {
    return console.log(text)
}
global.Fatal = function(text){
    console.error(PREFIXES.FATAL + text.bold)
    return process.exit(1)
}
// Server logs
global.Log = (text) => console.log(PREFIXES.LOG + text.bold)
global.Warn = (text) => console.log(PREFIXES.WARN + text.bold)
global.Err = (text) => console.log(PREFIXES.ERROR + text.bold)
global.ServerLog = (text) => console.log(PREFIXES.SERVER + text.bold)

// Client logs
global.Client = (ip, text) => log(buildPrefix(`[${ip}]`.magenta.bold) + text.bold)
global.ClientWarn = (ip, text) => log(buildPrefix(`[${ip}]`.yellow.bold) + text.bold)
global.ClientError = (ip, text) => log(buildPrefix(`[${ip}]`.red.bold) + text.bold)
