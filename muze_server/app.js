const express = require('express')
const bodyParser = require('body-parser')
const db = require('./database.js')
const ver = require('./verification.js')

const app = express()

db.connect()

app.listen(3000, function() {
    console.log('App listening on port 3000!')
})

// Endpoints

app.get('/', function(req, res) {
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

    if(code && phoneNumber) {
        ver.checkCode(phoneNumber, code, function(response, error) {
            if(error) {
                res.status(error.response.status).json({valid_code: false})
            }
            else {
                // check if user exists first
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
    else {
        res.sendStatus(400)
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

app.use('/playlist/users', bodyParser.json())
app.put('/playlist/users', function(req, res) {
    var playlistId = req.query.playlist_id
    var users = req.body.users

    if(playlistId && users) {
        db.addPlaylistUsers(playlistId, users)
        res.sendStatus(200)
    }
    else {
        res.sendStatus(400)
    }
})

app.use('/playlist/songs', bodyParser.json())
app.put('/playlist/songs', function(req, res) {
    var playlistId = req.query.playlist_id
    var playlist = req.body.playlist

    if(playlistId && playlist) {
        db.updatePlaylistSongs(playlistId, playlist, null)
        res.sendStatus(200)
    }
    else {
        res.sendStatus(400)
    }
})
