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
    .changes({includeTypes: true})
    .run(connection, function(err, cursor) {
        if(err) {
            console.log(err)
        }
        else {
            cursor.each(function(error, row) {
                if(error) {
                    console.log(error)
                }
                else if(row.type == "change" && util.compareArrays(row.new_val.sharedPlaylists, row.old_val.sharedPlaylists) > 0) {
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
                else if(row.new_val) {
                    handler(row.new_val)
                }
            })
        }
    })
}
exports.observePlaylistsTitle = function(handler) {
    muzedb.table('playlist_titles')
    .pluck('id', 'title')
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
                else if(row.new_val) {
                    handler(row.new_val)
                }
            })
        }
    })
}

// Actions

exports.queryUser = function(predicate, handler) {
    muzedb.table('users')
    .filter(predicate)
    .run(connection, function(err, cursor) {
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
    .run(connection, function(err, user) {
        if(err) {
            console.log(err)
        }
        handler(user)
    })
}

exports.insertPlaylist = function(creatorId, playlist, size, creationTime, handler) {
    muzedb.table('playlists')
    .insert({
        creatorId: creatorId,
        playlist: playlist,
        size: size,
        creationTime: creationTime
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

exports.getPlaylist = function(playlistId, handler) {
    muzedb.table('playlists')
    .get(playlistId)
    .run(connection, function(err, playlist) {
        if(err) {
            console.log(err)
        }
        handler(playlist)
    })
}

exports.getPlaylistUsers = function(playlistId, handler) {
    muzedb.table('users')
    .filter(function(user) {
        return user("ownedPlaylists").contains(playlistId).or(user("sharedPlaylists").contains(playlistId))
    })
    .run(connection, function(err, cursor) {
        if(err) {
            console.log(err)
            handler(null, err)
        }
        else {
            var users = []
            var e = null         
            cursor.each(function(error, row) {
                if(error) {
                    console.log(error)
                    e = error
                }
                else {
                    users.push({"id": row.id, "phoneNumber": row.phoneNumber})
                }
            }, function() {
                handler(users, e)
            })
        }
    })
}

exports.addPlaylistUsers = function(playlistId, phoneNumbers, handler) {
    for(var i = 0; i < phoneNumbers.length; i++) {
        muzedb.table('users')
        .filter({phoneNumber: phoneNumbers[i]})
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

exports.insertPlaylistTitle = function(playlistId, title, creationTime, handler) {
    muzedb.table('playlist_titles')
    .insert({
        id: playlistId,
        title: title,
        creationTime: creationTime
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

exports.getPlaylistTitle = function(playlistId, handler) {
    muzedb.table('playlist_titles')
    .get(playlistId)
    .run(connection, function(err, playlistTitle) {
        if(err) {
            console.log(err)
        }
        handler(playlistTitle)
    })
}

exports.insertTrackIdMappings = function(trackIds) {
    return muzedb.table('track_id_mappings')
    .insert(trackIds)
    .run(connection)
}

exports.getTrackIdMapping = function(trackType, trackId) {
    return muzedb.table('track_id_mappings')
    .getAll(trackId, { index: trackType })
    .run(connection)
    .then(function(cursor) {
        return cursor.toArray()
    })
}
