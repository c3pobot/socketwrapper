'use strict'
module.exports = class SocketWrapper{
  constructor(options = {}){
    this.io = require('socket.io-client')
    this.socketOptions = { transports: ['websocket'] }
    if(options.socketOptions) this.socketOptions = { ...this.socketOptions, ...options.socketOptions }

    this.uri = options.uri
    this.podName = options.podName
    this.identify = options.identify
    this.serverType = options.serverType || ''
    this.cmdProcessor = options.cmdProcessor
    this.timeout = options.timeout || 10000
    
    this.connectNotify = true, this.socketReady = false
    this.socket = this.io(this.uri, this.socketOptions)
    this.socket.on('connect', ()=>{
      this.socketReady = true
      if(this.connectNotify){
        this.connectNotify = false
        console.log(this.podName+' socket.io is connected to '+this.serverType+' socket server...')
        if(this.identify) this.sendSocketIdentity()
      }
    })
    if(this.cmdProcessor){
      this.socket.on('request', async(cmd, obj = {}, callback)=>{
        try{
          let res = await this.cmdProcessor(cmd, obj)
          if(callback) callback(res)
        }catch(e){
          console.error(e.message || e);
          if(callback) callback()
        }
      })
    }
  }
  call(cmd, obj){
    return new Promise((resolve, reject)=>{
      try{
        if(!this.socket || !this.socket.connected) reject('Socket Error: '+this.serverType+' connection not available')
        this.socket.timeout(this.timeout).emit('request', cmd, obj, (err, res)=>{
          if(err) reject(`${this.serverType} Socket Error: ${err.message || err}`);
          resolve(res)
        })
      }catch(e){
        reject(e.message)
      }
    })
  }
  sleep(time = 5000){
    return new Promise(resolve=>{
      setTimeout(resolve, time)
    })
  }
  async sendSocketIdentity(){
    try{
      let res = await this.call('identify', { podName: this.podName})
      if(!res || res?.status !== 'ok'){
        await this.sleep()
        this.sendSocketIdentity()
      }
    }catch(e){
      console.log(e)
      await this.sleep()
      this.sendSocketIdentity()
    }
  }
}
