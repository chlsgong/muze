const rethinkdb = require('rethinkdb')
const muzedb = rethinkdb.db('muze')

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
                else {
                    console.log(JSON.stringify(row, null, 2))

                    // call push handler
                }
            })
        }
    })
}

// function observePlaylistsUsers() {
//     muzedb.table('playlists')
//     .pluck('id', 'creatorId', 'users')
//     .changes()
//     .run(connection, function(err, cursor) {
//         if(err) {
//             console.log(err)
//         }
//         else {
//             cursor.each(function(error, row) {
//                 if(error) {
//                     console.log(error)
//                 }
//                 else {
//                     console.log(JSON.stringify(row, null, 2))
//                 }
//             })
//         }
//     })
// }

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
                    console.log(JSON.stringify(row, null, 2))
                    var playlistData = {}
                    playlistData.id = row.new_val.id
                    playlistData.playlist = row.new_val.playlist
                    playlistData.size = row.new_val.size
                    handler(playlistData)
                }
            })
        }
    })
}

// Actions

exports.insertUser = function(phoneNumber, handler) {
    muzedb.table('users')
    .insert({
        phoneNumber: phoneNumber,
        ownedPlaylists: [],
        sharedPlaylists: []
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
            console.log(JSON.stringify(result, null, 2))

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
                    console.log(JSON.stringify(result, null, 2))
                    handler(playlistId, null)
                }
            })
        }
    })
}

exports.addPlaylistUsers = function(playlistId, userIds, handler) {
    for(var i = 0; i < userIds.length; i++) {
        addPlaylistUser(playlistId, userIds[i].user_id)
    }
}

function addPlaylistUser(playlistId, userId, handler) {
    muzedb.table('users')
    .get(userId)
    .update({
        sharedPlaylists: rethinkdb.row('sharedPlaylists').append(playlistId)
    })
    .run(connection, function(err, result) {
        if(err) {
            console.log(err)
        }
        else {
            console.log(JSON.stringify(result, null, 2))
        }
    })
    
}

// exports.insertPlaylist = function(creatorId, users, title, playlist, size, handler) {
//     muzedb.table('playlists')
//     .insert({
//         creatorId: creatorId,
//         users: users,
//         title: title,
//         playlist: playlist,
//         size: size
//     })
//     .run(connection, function(err, result) {
//         if(err) {
//             console.log(err)
//             handler(null, err)
//         }
//         else {
//             console.log(JSON.stringify(result, null, 2))
//             handler(result.generated_keys[0], null)
//         }
//     })
// }

// exports.updatePlaylistUsers = function(playlistId, users, handler) {
//     muzedb.table('playlists')
//     .get(playlistId)
//     .update({users: users})
//     .run(connection, function(err, result) {
//         if(err) {
//             console.log(err)
//         }
//         else {
//             console.log(JSON.stringify(result, null, 2))
//         }
//     })
// }

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
        }
        else {
            console.log(JSON.stringify(result, null, 2))
        }
    })
}
