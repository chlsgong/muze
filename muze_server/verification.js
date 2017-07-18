const axios = require('axios')

const apiKey = '9tWmIv1DtdPv9K0McKB8XLK5UwsZ90bK'

axios.defaults.baseURL = 'https://api.authy.com/protected/json'

exports.sendCode = function(phoneNumber) {
    axios.post('/phones/verification/start', {
        api_key: apiKey,
        via: 'sms',
        country_code: '1',
        phone_number: phoneNumber,
        code_length: 6
    })
    .then(function(res) {
        console.log(res)
    })
    .catch(function(err) {
        console.log(err)
    })
}

exports.checkCode = function(phoneNumber, code, handler) {
    axios.get('/phones/verification/check', {
        params: {
            api_key: apiKey,
            country_code: '1',
            phone_number: phoneNumber,
            verification_code: code
        }
    })
    .then(function(res) {
        console.log(res)
        handler(res, null)
    })
    .catch(function(err) {
        console.log(err)
        handler(null, err)
    })
}
