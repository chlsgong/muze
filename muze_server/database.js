const rethinkdb = require('rethinkdb')
const muzedb = rethinkdb.db('muze')

const host = {host: 'localhost', port: 28015}

var connection = null

exports.connect = function() {
    rethinkdb.connect(host, function(err, conn) {
        if(err) {
            console.log(err)
        }
        else {
            console.log('Rethinkdb connection open on port 28015.')
            connection = conn
            init()
        }
    })
}

function init() {
    observePlaylistUsers()
    observePlaylistSongs()
}

// Observers

function observePlaylistUsers() {
    muzedb.table('playlists')
    .pluck('id', 'creatorId', 'users')
    .changes()
    .run(connection, function(err, cursor) {
        if(err) {
            console.log(err)
        }
        else {
            cursor.each(function(error, row) {
                if(error) {
                    console.log(error)
                }
                else {
                    console.log(JSON.stringify(row, null, 2))
                }
            })
        }
    })
}

function observePlaylistSongs() {
    muzedb.table('playlists')
    .pluck('playlist')
    .changes()
    .run(connection, function(err, cursor) {
        if(err) {
            console.log(err)
        }
        else {
            cursor.each(function(error, row) {
                if(error) {
                    console.log(error)
                }
                else {
                    console.log(JSON.stringify(row, null, 2))
                }
            })
        }
    })
}

// Actions

exports.insertUser = function(phoneNumber, handler) {
    muzedb.table('users')
    .insert({
        phoneNumber: phoneNumber
    })
    .run(connection, function(err, result) {
        if(err) {
            console.log(err)
            handler(null, err)
        }
        else {
            console.log(JSON.stringify(result, null, 2))
            handler(result.generated_keys[0], null)
        }
    })
}

exports.insertPlaylist = function(creatorId, users, title, playlist, size, handler) {
    muzedb.table('playlists')
    .insert({
        creatorId: creatorId,
        users: users,
        title: title,
        playlist: playlist,
        size: size
    })
    .run(connection, function(err, result) {
        if(err) {
            console.log(err)
            handler(null, err)
        }
        else {
            console.log(JSON.stringify(result, null, 2))
            handler(result.generated_keys[0], null)
        }
    })
}

exports.updatePlaylistUsers = function(playlistId, users, handler) {
    muzedb.table('playlists')
    .get(playlistId)
    .update({users: users})
    .run(connection, function(err, result) {
        if(err) {
            console.log(err)
        }
        else {
            console.log(JSON.stringify(result, null, 2))
        }
    })
}

exports.updatePlaylistSongs = function(playlistId, playlist, handler) {
    muzedb.table('playlists')
    .get(playlistId)
    .update({playlist: playlist})
    .run(connection, function(err, result) {
        if(err) {
            console.log(err)
        }
        else {
            console.log(JSON.stringify(result, null, 2))
        }
    })
}
