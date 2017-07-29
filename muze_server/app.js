const app = require('express')()
const bodyParser = require('body-parser')
const server = require('http').createServer(app)
const skt = require('./socket.js').bind(server)
const apn = require('./apn.js')()
const db = require('./database.js')
const ver = require('./verification.js')

// Database

db.connect(function() {
    db.observeUsersSharedPlaylists(function(userData) {
        console.log('Sent APN')
        apn.notifyPlaylist(userData.apnToken, userData)
    })
    db.observePlaylistsSongs(function(playlistData) {
        skt.plEmitUpdate(playlistData.id, playlistData)
    })
})

// Endpoints

server.listen(3000, function() {
    console.log('App listening on port 3000!')
})

app.get('/', function(req, res) {
    console.log('Hello World!')
    res.send('Hello World!')
})

app.post('/verification/code', function(req, res) {
    var phoneNumber = req.query.phone_number

    if(phoneNumber) {
        ver.sendCode(phoneNumber)
        res.sendStatus(200)
    }
    else {
        res.sendStatus(400)
    }
})

app.get('/verification/check', function(req, res) {
    var code = req.query.code
    var phoneNumber = req.query.phone_number
    var apnToken = req.query.apn_token

    if(code && phoneNumber && apnToken) {
        ver.checkCode(phoneNumber, code, function(response, error) {
            if(error) {
                res.status(error.response.status).json({valid_code: false})
            }
            else {
                db.queryUser({phoneNumber: phoneNumber}, function(userId, err) {
                    if(userId) {
                        db.updateAPNToken(userId, apnToken, function(result, err) {
                            if(err) {
                                res.sendStatus(500)
                            }
                            else {
                                res.status(200).json({valid_code: true, user_id: userId})
                            }
                        })
                    }
                    else {
                        db.insertUser(phoneNumber, function(userId, err) {
                            if(err) {
                                res.sendStatus(500)
                            }
                            else {
                                res.status(201).json({valid_code: true, user_id: userId})
                            }
                        })
                    }
                })
            }
        })
    }
    else {
        res.sendStatus(400)
    }
})


app.use('/users', bodyParser.json())

app.get('/users', function(req, res) {
})

app.put('/users/apntoken', function(req, res) {
    var userId = req.body.user_id
    var apnToken = req.body.apn_token

    if(userId && apnToken) {
        db.updateAPNToken(userId, apnToken, function(result, err) {
            if(err) {
                res.sendStatus(500)
            }
            else {
                res.status(200)
            }
        })
    }
})


app.use('/playlist', bodyParser.json())

app.post('/playlist', function(req, res) {
    var creatorId = req.body.creator_id
    var title = req.body.title
    var playlist = req.body.playlist
    var size = req.body.size

    if(creatorId && title && playlist && size) {
        db.insertPlaylist(creatorId, title, playlist, size, function(playlistId, err) {
            if(err) {
                res.sendStatus(500)
            }
            else {
                res.status(201).json({playlist_id: playlistId})
            }
        })        
    }
    else {
        res.sendStatus(400)  
    }
})

app.put('/playlist/users', function(req, res) {
    var playlistId = req.body.playlist_id
    var phoneNumbers = req.body.phone_numbers

    if(playlistId && phoneNumbers) {
        db.addPlaylistUsers(playlistId, phoneNumbers, null)
        res.sendStatus(202)
    }
    else {
        res.sendStatus(400)
    }
})

app.delete('/playlist/users', function(req, res) {
    var playlistId = req.body.playlist_id
    var phoneNumber = req.body.phone_number

    if(playlistId && phoneNumber) {
        db.queryUser({phoneNumber: phoneNumber}, function(userId, err) {
            if(userId) {
                db.deletePlaylistUser(playlistId, userId, function(result, err) {
                    if(err) {
                        res.sendStatus(500)
                    }
                    else {
                        res.sendStatus(200)
                    }
                })
            }
            else {
                res.sendStatus(404)
            }
        })
    }
    else {
        res.sendStatus(400)
    }
})

app.put('/playlist/songs', function(req, res) {
    var playlistId = req.body.playlist_id
    var playlist = req.body.playlist
    var size = req.body.size

    if(playlistId && playlist && size) {
        db.updatePlaylistSongs(playlistId, playlist, size, function(result, err) {
            if(err) {
                res.sendStatus(500)
            }
            else {
                res.sendStatus(200)
            }
        })
    }
    else {
        res.sendStatus(400)
    }
})

// Socket

skt.plOnConnection()
