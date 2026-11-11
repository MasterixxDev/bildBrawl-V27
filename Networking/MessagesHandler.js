class MessagesHandler {
    constructor(session, packets){
        this.session = session
        this.packets = packets
    }

    /**
     * Handle packet
     * @param { Number } id Packet ID
     * @param { Buffer } bytes Packet bytes
     * @param { Object } args Some other args, if you want.
     */
    async handle(id, bytes, args){
        if(this.isPacketExists(id.toString())){
            try{
                const PacketHandler = this.getPacketHandler(id)
                const packet = new PacketHandler(bytes, this.session, args)
                const block = []//[10101,10108,14102,14366,14403,14113,10110,14109,10212,14110,14302,14600,14305];
                if (block.includes(id)) {
                    // Ничего не делать, так как пакет есть в block
                } else {
                    this.session.Log(`Gotcha ${id} (${packet.constructor.name}) packet!`);
                }

                await packet.decode()
                await packet.process()
            } catch(e) {
                console.log(e)
            }
        }else{
            this.session.Log(`Gotcha undefined ${id} packet!`)
        }
    }

    /**
     * Check if packet exists
     * @param { Number } id Packet ID
     * @returns { boolean } Is packet exists?
     */
    isPacketExists(id){
        return Object.keys(this.packets).includes(id)
    }

    /**
     * Get packet handler
     * @param { Number } id Packet ID
     * @returns { Class } Packet class 
     */
    getPacketHandler(id){
        return this.packets[id]
    }
}

module.exports = MessagesHandler