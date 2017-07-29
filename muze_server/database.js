const rethinkdb = require('rethinkdb')
const muzedb = rethinkdb.db('muze')
const util = require('./utility.js')

const host = {host: 'localhost', port: 28015}

var connection = null

exports.connect = function(init) {
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

// Observers

exports.observeUsersSharedPlaylists = function(handler) {
    muzedb.table('users')
    .pluck('id', 'sharedPlaylists')
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
                else if(row.old_val && util.compareArrays(row.new_val.sharedPlaylists, row.old_val.sharedPlaylists) > 0) {
                    muzedb.table('users')
                    .get(row.new_val.id)
                    .run(connection, function(err, result) {
                        if(err) {
                            console.log(err)
                        }
                        else {
                            var userData = {}
                            userData.id = result.id
                            userData.badgeCount = result.badgeCount
                            userData.apnToken = result.apnToken
                            handler(userData)
                        }
                    })
                }
            })
        }
    })
}

exports.observePlaylistsSongs = function(handler) {
    muzedb.table('playlists')
    .pluck('id', 'playlist', 'size')
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
                    handler(row.new_val)
                }
            })
        }
    })
}

// Actions

exports.queryUser = function(predicate, handler) {
    var user = muzedb.table('users')
    .filter(predicate)
    .run(connection, function(err, cursor) {
        if(err) {
            console.log(err)
            handler(null, err)
        }
        else {
            var userId = null
            var e = null         
            cursor.each(function(error, row) {
                if(error) {
                    console.log(error)
                    e = error
                }
                else {
                    userId = row.id
                }
            }, function() {
                handler(userId, e)
            })
        }
    })
}

exports.insertUser = function(phoneNumber, handler) {
    muzedb.table('users')
    .insert({
        phoneNumber: phoneNumber,
        ownedPlaylists: [],
        sharedPlaylists: [],
        badgeCount: 0,
        apnToken: null
    })
    .run(connection, function(err, result) {
        if(err) {
            console.log(err)
            handler(null, err)
        }
        else {
            handler(result.generated_keys[0], null)
        }
    })
}

exports.updateAPNToken = function(userId, apnToken, handler) {    
    muzedb.table('users')
    .get(userId)
    .update({
        apnToken: apnToken
    })
    .run(connection, function(err, result) {
        if(err) {
            console.log(err)
            handler(null, err)
        }
        else {
            handler(result, null)
        }
    })
}

exports.updateBadgeCount = function(userId, badgeCount, handler) {
    muzedb.table('users')
    .get(userId)
    .update({
        badgeCount: badgeCount
    })
    .run(connection, function(err, result) {
        if(err) {
            console.log(err)
            handler(null, err)
        }
        else {
            handler(result, null)
        }
    })
}

exports.getUser = function(userId, handler) {
    muzedb.table('users')
    .get(userId)
    .run(connection, function(err, result) {
        if(err) {
            console.log(err)
            handler(null, err)
        }
        else {
            var user = null
            var e = null
            cursor.each(function(error, row) {
                if(error) {
                    console.log(error)
                    e = error
                }
                else {
                    user = row
                }
            }, function() {
                handler(user, e)
            })
        }
    })
}

exports.insertPlaylist = function(creatorId, title, playlist, size, handler) {
    muzedb.table('playlists')
    .insert({
        creatorId: creatorId,
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
            var playlistId = result.generated_keys[0]
            muzedb.table('users')
            .get(creatorId)
            .update({
                ownedPlaylists: rethinkdb.row('ownedPlaylists').append(playlistId)
            })
            .run(connection, function(err, result) {
                if(err) {
                    console.log(err)
                }
                else {
                    handler(playlistId, null)
                }
            })
        }
    })
}

exports.addPlaylistUsers = function(playlistId, phoneNumbers, handler) {
    for(var i = 0; i < phoneNumbers.length; i++) {
        muzedb.table('users')
        .filter({phoneNumber: phoneNumbers[i].phone_number})
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
                        addPlaylistUser(row.id, playlistId, null)
                    }
                })
            }
        })
    }
}

function addPlaylistUser(userId, playlistId, handler) {
    muzedb.table('users')
    .get(userId)
    .update({
        sharedPlaylists: rethinkdb.row('sharedPlaylists').append(playlistId)
    })
    .run(connection, function(err, result) {
        if(err) {
            console.log(err)
        }
    })
}

exports.deletePlaylistUser = function(playlistId, userId, handler) {
    muzedb.table('users')
    .get(userId)
    .update({
        sharedPlaylists: rethinkdb.row('sharedPlaylists').difference([playlistId])
    })
    .run(connection, function(err, result) {
        if(err) {
            console.log(err)
            handler(null, err)
        }
        else {
            handler(result, null)
        }
    })
}

exports.updatePlaylistSongs = function(playlistId, playlist, size, handler) {
    muzedb.table('playlists')
    .get(playlistId)
    .update({
        playlist: playlist,
        size: size
    })
    .run(connection, function(err, result) {
        if(err) {
            console.log(err)
            handler(null, err)
        }
        else {
            handler(result, null)
        }
    })
}
