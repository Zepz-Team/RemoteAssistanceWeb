class EventEmitter{
  constructor(){
      this.callbacks = {}
  }

  on(event, cb){
      if(!this.callbacks[event]) this.callbacks[event] = [];
      this.callbacks[event].push(cb)
  }

  emit(event, data){
      let cbs = this.callbacks[event]
      if(cbs){
          cbs.forEach(cb => cb(data))
      }
  }
}

export class RTMClient extends EventEmitter {
  constructor () {
    super()
    this.channels = {}
    this._logined = false
  }

  init (appId) {
    this.client = AgoraRTM.createInstance(appId)
    this.subscribeClientEvents()
  }

  // subscribe client events
  subscribeClientEvents () {
    const clientEvents = [
      'ConnectionStateChanged',
      'MessageFromPeer'
    ]
    clientEvents.forEach((eventName) => {
      this.client.on(eventName, (...args) => {
        console.log('emit ', eventName, ...args)
        // log event message
        this.emit(eventName, ...args)
      })
    })
  }

  // subscribe channel events
  subscribeChannelEvents (channelName) {
    const channelEvents = [
      'ChannelMessage',
      'MemberJoined',
      'MemberLeft'
    ]
    channelEvents.forEach((eventName) => {
      this.channels[channelName].channel.on(eventName, (...args) => {
        console.log('emit ', eventName, args)
        this.emit(eventName, { channelName, args: args })
      })
    })
  }

  async login (accountName, token) {
    this.accountName = accountName
    return this.client.login({ uid: this.accountName, token })
  }

  async logout () {
    return this.client.logout()
  }

  async joinChannel (name) {
    console.log('joinChannel', name)
    const channel = this.client.createChannel(name)
    this.channels[name] = {
      channel,
      joined: false // channel state
    }
    this.subscribeChannelEvents(name)
    return channel.join()
  }

  async leaveChannel (name) {
    console.log('leaveChannel', name)
    if (!this.channels[name] ||
      (this.channels[name] &&
        !this.channels[name].joined)) return
    return this.channels[name].channel.leave()
  }

  async sendChannelMessage (text, channelName) {
    if (!this.channels[channelName] || !this.channels[channelName].joined) return
    return this.channels[channelName].channel.sendMessage({ text })
  }

  async sendPeerMessage (text, peerId) {
    //console.log('sendPeerMessage', text, peerId)
    //return this.client.sendMessageToPeer({ text }, peerId.toString())

    this.client.sendMessageToPeer(
      { text: text }, // An RtmMessage object.
      peerId.toString(), // The uid of the remote user.
    ).then(sendResult => {
      if (sendResult.hasPeerReceived) {
        // Your code for handling the event when the remote user receives the message.
        //console.log('Remote user has received the message')
      } else {
        // Your code for handling the event when the message is received by the server but the remote user cannot be reached.
        console.log('Remote user could not receive the message')
      }
    }).catch(error => {
      // Your code for handling the event when the message fails to be sent.
      console.log('EXCEPTION OCCURRED!')
    });
  }

  async queryPeersOnlineStatus (memberId) {
    console.log('queryPeersOnlineStatus', memberId)
    return this.client.queryPeersOnlineStatus([memberId])
  }

  //send image
  async uploadImage (blob, peerId) {
    const mediaMessage = await this.client.createMediaMessageByUploading(blob, {
      messageType: 'IMAGE',
      fileName: 'agora.jpg',
      description: 'send image',
      thumbnail: blob, 
      // width: 100,
      // height: 200,
      // thumbnailWidth: 50,
      // thumbnailHeight: 200, 
    }) 
    return this.client.sendMessageToPeer(mediaMessage, peerId)
  }

  async sendChannelMediaMessage (blob, channelName) {
    console.log('sendChannelMessage', blob, channelName)
    if (!this.channels[channelName] || !this.channels[channelName].joined) return
    const mediaMessage = await this.client.createMediaMessageByUploading(blob, {
      messageType: 'IMAGE',
      fileName: 'agora.jpg',
      description: 'send image',
      thumbnail: blob, 
      // width: 100,
      // height: 200,
      // thumbnailWidth: 50,
      // thumbnailHeight: 200, 
    }) 
    return this.channels[channelName].channel.sendMessage(mediaMessage)
  }

  async cancelImage (message) {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 1000)
    await this.client.downloadMedia(message.mediaId, {
      cancelSignal: controller.signal,
      onOperationProgress: ({currentSize, totalSize}) => {
        console.log(currentSize, totalSize)
      },
    })
  }

}