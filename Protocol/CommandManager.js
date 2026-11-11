const fs = require('fs')

class CommandManager {
  constructor () {
    this.commands = {}
    this.loadCommandsSync()
  }

  loadCommandsSync() {
    try {
      const files = fs.readdirSync('./Protocol/Command')
      files.forEach(e => {
        try {
          const Command = require(`./Command/${e.replace('.js', '')}`)
          const commandClass = new Command()
          this.commands[commandClass.commandID] = Command
        } catch (error) {
          console.error(`Error loading command from ${e}:`, error)
        }
      })
    } catch (err) {
      console.error('Error reading commands directory:', err)
    }
  }

  handle (id) {
    const command = this.commands[id]
    if (!command) {
    }
    return command
  }

  getCommands () {
    return Object.keys(this.commands)
  }
}

module.exports = CommandManager