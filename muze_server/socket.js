const socket = require('socket.io')

function Socket(server) {
    if(!server) {
        throw new Error('Server does not exist.')
    }
    var io = socket(server)
    this.pl = io.of('/playlists')
}

Socket.prototype.plOnConnection = function() {
    this.pl.on('connection', function(socket) {
        console.log('a user connected')
        socket.on('room', function(roomId) {
            socket.join(roomId)
        })
    })
}

Socket.prototype.plEmitUpdate = function(roomId, playlistData) {
    this.pl.in(roomId).emit('updatePlaylist', playlistData)
}

Socket.prototype.plTitleEmitUpdate = function(roomId, playlistData) {
    this.pl.in(roomId).emit('updatePlaylistTitle', playlistData)
}

exports.bind = function(server) {
    return new Socket(server)
}
