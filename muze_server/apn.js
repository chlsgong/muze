const apn = require('apn')

function APN() {
    this.notification = new apn.Notification()
    this.initNotification()
}

APN.prototype.initNotification = function() {
    this.notification.topic = 'com.charlesgong.muze'
    this.notification.expiry = Math.floor(Date.now() / 1000) + 3600
    this.notification.sound = 'ping.aiff'
}

APN.prototype.send = function(token, message, badge, payload) {
    this.notification.alert = message
    this.notification.payload = payload
    this.notification.badge = badge + 1

    const apnProvider = new apn.Provider({  
        token: {
            key: 'AuthKey_E9GMVAD5DT.p8',
            keyId: 'E9GMVAD5DT',
            teamId: 'HMYCNE59S2',
        },
        production: false
    })

    apnProvider.send(this.notification, token)
    .then(function(res) {
        console.log(res)
    })
    .catch(function(err) {
        console.log(err)
    })
    .then(function() {
        console.log('Shutdown')
        apnProvider.shutdown()
    })
}

APN.prototype.notifyPlaylist = function(token, badge, payload) {
    var message = 'You have been added to a playlist.'
    this.send(token, message, badge, payload)
}

module.exports = function() {
    return new APN()
}
