const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')

function JWT() {
    this.createToken()
}

JWT.prototype.createToken = function() {
    const privateKey = fs.readFileSync(path.resolve(__dirname, './AuthKey_E9GMVAD5DT.p8')).toString()

    this.jwtToken = jwt.sign({}, privateKey, {
        algorithm: 'ES256',
        expiresIn: '180d',
        issuer: 'HMYCNE59S2',
        header: {
            alg: 'ES256',
            kid: 'E9GMVAD5DT'
        }
    })
}

JWT.prototype.getToken = function() {
    return this.jwtToken
}

module.exports = function() {
    return new JWT()
}
