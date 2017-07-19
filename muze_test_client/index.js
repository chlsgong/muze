const io = require('socket.io-client')

var socket = io.connect('http://localhost:3000/playlists')

socket.on('connect', function() {
    console.log('connect')
    socket.emit('room', 'ecc57559-fbb1-4110-95a8-0fb4f8dbb896')
})

socket.on('connect_error', function(error) {
    console.log('connect error')
    console.log(error)
})

socket.on('error', function(error) {
    console.log('error')
    console.log(error)
})

socket.on('update', function(playlistData) {
    console.log(JSON.stringify(playlistData, null, 2))
})
