const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const request = require('request')

const VERIFY_TOKEN = VERIFY_TOKEN

app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.send('Hi Facebook Bot')
})

app.post('/githubHook', function(req, res) {
  var data = req.body;
  receivedMessage({
    sender: {
      id: '@ASJIDS82912'
    },
    recipient: {
      id: 'wpijpa@SDDdsa'
    },
    message: {
      text: 'HIHIHI'
    }
  }, 'github')
  res.sendStatus(200)
})

app.get('/callback', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VERIFY_TOKEN) {
    console.log("Validating webhook bot is coming..");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
})


app.post('/callback', function (req, res) {
  var data = req.body;

  if (data.object === 'page') {

    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    res.sendStatus(200);
  }
});

function receivedMessage(event, other) {
  // console.log(event)
  const userID = event.sender.id,
        userRC = event.recipient.id,
        userMessage = event.message.text
  if (event.message.is_echo) return
  if (event.read) return
  const botPromise = new Promise((resolve, reject) => {
    request({
      method: 'POST',
      uri: 'http://192.168.1.113:14433/message',
      'content-type': 'application/json',
      json: {
        userID: userID,
        userName: 'Whien',
        userMessage: userMessage,
        userPlateform: other ? other : 'facebook'
      }
    }, (err, response, body) => {
      if (err) reject(err)
      resolve(body)
    })
  })
}

app.listen('3000', function() {
  console.log('Server listen on port 3000')
})

const pullingMessage = () => {
  request({
    uri: 'http://192.168.1.113:14433/message/list',
    method: 'GET',
  }, (err, res, body) => {
    if (!err && res.statusCode === 200) {
      const data = JSON.parse(body),
            userObject = data.userObject,
            messageList = data.messageList
      let allUserFromFacebookList = Object.keys(userObject).map((userID) => {
        if (userObject[userID]['userPlatform'] === 'facebook') {
          return {
            userID: userID,
            userUpdatedAt: userObject[userID]['userUpdatedAt'],
            userLocale: userObject[userID]['userLocale'],
          }
        }
      })
      messageList.forEach(list => {
        allUserFromFacebookList.filter(list => list).forEach(user => {
          if (list.createdOn > user.userUpdatedAt) {
            callSendAPI(list, user.userID, user.userLocale, userObject)
          }
        })
      })
    } else {
      console.error(res)
    }
  })
}
setInterval(() => {
  pullingMessage()
}, 5000)

const callSendAPI = (messageList, recipientID, locale, userObject) => {
  request({
    uri: `http://192.168.1.115:14433/translate?text=${encodeURIComponent(messageList.userMessage)}&tolang=${locale}`,
    method: 'GET'
  }, (err, res, body) => {
    const result = JSON.parse(body)
    request({
      uri: 'https://graph.facebook.com/v2.6/me/messages',
      qs: { access_token: 'VERIFY_TOKEN' },
      method: 'POST',
      json: {
        recipient: {
          id: recipientID
        },
        message: {
          text: `(${userObject[messageList['userID']]['userName']})說：${result.result} 來自(${messageList.userPlatform})`
        }
      }
    }, (err, res, body) => {
      if (!err && res.statusCode === 200) {
        request({
          method: 'POST',
          uri: 'http://192.168.1.113:14433/message/user/update',
          json: {
            userID: recipientID,
            userPlatform: 'facebook'
          }
        })
      } else {
        console.error('Unabele to send message')
        console.error(res)
      }
    })
  })
}
