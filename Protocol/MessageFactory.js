const fs = require('fs')
const path = require("node:path")
const glob = require("glob")

class MessageFactory {
  constructor (useLegacyPacketLoader) {
    this.packets = {}
    this.loadPacketsSync()
  }

  loadPacketsSync() {
    const messagesPath = path.join(__dirname, "Messages")
    

    const findFiles = (dir) => {
      const files = fs.readdirSync(dir)
      let results = []
      
      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)
        
        if (stat.isDirectory()) {
          results = results.concat(findFiles(filePath))
        } else if (file.endsWith('.js')) {
          results.push(filePath)
        }
      }
      
      return results
    }

    const files = findFiles(messagesPath)

    const clientFiles = files.filter(file => file.includes('Client'))
    const serverFiles = files.filter(file => file.includes('Server'))
    

    // Синхронная загрузка пакетов
    for (const file of files) {
      try {
        const relativePath = "./" + path.relative(__dirname, file).replace(/\\/g, "/")
        delete require.cache[require.resolve(relativePath)] // Очищаем кеш
        const Packet = require(relativePath)
        
        const packetInstance = new Packet()
        if (packetInstance.id) {
          this.packets[packetInstance.id] = Packet
        }
      } catch(err) {
        console.error(`✗ Error initializing packet from "${path.relative(__dirname, file)}"!`)
        console.error(err.message)
      }
    }

  }
  
  getAllPackets() {
    return this.packets
  }
  
  getPacket(id) {
    return this.packets[id] || null
  }
}

module.exports = MessageFactory