const app = require('express')()
const bodyParser = require('body-parser')
const server = require('http').createServer(app)
const skt = require('./socket.js').bind(server)
const apn = require('./apn.js')()
const db = require('./database.js')
const ver = require('./verification.js')
const jwt = require('./jwt.js')()


// Database

db.connect(function() {
    db.observeUsersSharedPlaylists(function(userData) {
        console.log('Sent APN')
        apn.notifyPlaylist(userData.apnToken, userData)
    })
    db.observePlaylistsSongs(function(playlistData) {
        skt.plEmitUpdate(playlistData.id, playlistData)
    })
    db.observePlaylistsTitle(function(playlistData) {
        skt.plTitleEmitUpdate(playlistData.id, playlistData)
    })
})

// Socket

skt.plOnConnection()
skt.plOnConnectionError()

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
    var apnToken = req.query.apn_token ? req.query.apn_token : ""

    if(code && phoneNumber) {
        ver.checkCode(phoneNumber, code, function(response, error) {
            if(error) {
                res.status(error.response.status).json({valid_code: false})
            }
            else {
                db.queryUser({phoneNumber: phoneNumber}, function(user, err) {
                    if(err) {
                        res.sendStatus(500)
                    }
                    else if(user) {
                        db.updateAPNToken(user.id, apnToken, function(result, err) {
                            if(err) {
                                res.sendStatus(500)
                            }
                            else {
                                res.status(200).json({valid_code: true, user_id: user.id})
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

app.get('/jwtoken', function(req, res) {
    var token = jwt.getToken()
    res.status(200).json({jwt: token})
})

app.use('/users', bodyParser.json())
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

app.get('/users', function(req, res) {
    var userId = req.query.user_id

    if(userId) {
        db.getUser(userId, function(user) {
            if(user) {
                res.status(200).json(user)
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

app.use('/playlist', bodyParser.json())
app.post('/playlist', function(req, res) {
    var creatorId = req.body.creator_id
    var title = req.body.title
    var playlist = req.body.playlist ? req.body.playlist : []
    var size = req.body.size ? req.body.size : 0
    var creationTime = new Date()

    if(creatorId && title) {
        db.insertPlaylist(creatorId, playlist, size, creationTime, function(playlistId, err) {
            if(err) {
                res.sendStatus(500)
            }
            else {
                db.insertPlaylistTitle(playlistId, title, creationTime, function(result, err) {
                    if(err) {
                        res.sendStatus(500)
                    }
                    else {
                        res.status(201).json({playlist_id: playlistId})
                    }
                })
            }
        })
    }
    else {
        res.sendStatus(400)  
    }
})

app.get('/playlist', function(req, res) {
    var playlistId = req.query.playlist_id

    if(playlistId) {
        db.getPlaylist(playlistId, function(playlist) {
            if(playlist) {
                res.status(200).json(playlist)
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

app.get('/playlist/title', function(req, res) {
    var playlistId = req.query.playlist_id

    if(playlistId) {
        db.getPlaylistTitle(playlistId, function(playlistTitle) {
            if(playlistTitle) {
                res.status(200).json(playlistTitle)
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

app.get('/playlist/users', function(req, res) {
    var playlistId = req.query.playlist_id
    
    if(playlistId) {
        db.getPlaylistUsers(playlistId, function(users, err) {
            if(err) {
                res.sendStatus(500)
            }
            else {
                res.status(200).json({users: users})
            }
        })
    }
    else {
        res.sendStatus(400)
    }
})

app.put('/playlist/users', function(req, res) {
    var playlistId = req.body.playlist_id
    var phoneNumbers = req.body.phone_numbers ? req.body.phone_numbers : []

    if(playlistId) {
        db.addPlaylistUsers(playlistId, phoneNumbers, null)
        res.sendStatus(202)
    }
    else {
        res.sendStatus(400)
    }
})

app.delete('/playlist/users', function(req, res) {
    var playlistId = req.body.playlist_id
    var userId = req.body.user_id
    var phoneNumber = req.body.phone_number

    if(playlistId && userId) {
        db.deletePlaylistUser(playlistId, userId, function(result, err) {
            if(err) {
                res.sendStatus(500)
            }
            else {
                res.sendStatus(200)
            }
        })
    }
    else if(playlistId && phoneNumber) {
        db.queryUser({phoneNumber: phoneNumber}, function(user, err) {
            var userId = user.id
            if(err) {
                res.sendStatus(500)
            }
            else if(userId) {
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
    var playlist = req.body.playlist ? req.body.playlist : []
    var size = req.body.size ? req.body.size : 0

    if(playlistId) {
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

app.use('/track/mappings', bodyParser.json())
app.post('/track/mappings', function(req, res) {
    var trackIdMappings = req.body.id_mappings

    if(!trackIdMappings) {
        res.sendStatus(400)
        return
    }

    db.insertTrackIdMappings(trackIdMappings)
    .then(function() {
        res.sendStatus(204)
    })
    .catch(function() {
        res.sendStatus(500)
    })
})

app.get('/track/mappings', function(req, res) {
    var trackType = req.query.type
    var trackId = req.query.id

    if(!trackType || !trackId) {
        res.sendStatus(400)
        return
    }

    db.getTrackIdMapping(trackType, trackId)
    .then(function(result) {
        var mapping = Object.assign({}, result.shift())
        res.status(200).json(mapping)
    })
    .catch(function() {
        res.sendStatus(500)
    })
})
