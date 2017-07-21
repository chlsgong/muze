const apn = require('apn')

function APN() {
    this.apnProvider = new apn.Provider({  
        token: {
            key: 'AuthKey_E9GMVAD5DT.p8',
            keyId: 'E9GMVAD5DT',
            teamId: 'HMYCNE59S2',
        },
        production: false
    })
    this.notification = new apn.Notification()
    this.initNotification()
}

APN.prototype.initNotification = function() {
    this.notification.topic = 'com.charlesgong.muze'
    this.notification.expiry = Math.floor(Date.now() / 1000) + 3600
    this.notification.badge = 1
    this.notification.sound = 'ping.aiff'
}

APN.prototype.send = function(token, message, payload) {
    this.notification.alert = message
    this.notification.payload = payload

    this.apnProvider.send(this.notification, token)
    .then(function(res) {
        console.log(res)
    })
    .catch(function(err) {
        console.log(err)
    })
}

APN.prototype.sendPlaylist = function(token, payload) {
    var message = 'You have been added to a playlist.'
    this.send(token, message, payload)
}

module.exports = function() {
    return new APN()
}
