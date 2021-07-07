const express = require('express');

const TelegramBot = require('node-telegram-bot-api');

const bodyParser = require('body-parser');

const weather = require('weather-js')

const token = '1874753971:AAEJKwRQAqBfj0Ndj5MRw1_gLU3fkZJJvHw';

// 1813510459:AAHsjoBO0mi2pcUMkmQBA-ab-UEUPZzn7P4           СТАРЫЙ ТОКЕН
const bot = new TelegramBot(token, { polling: true });

const axios = require('axios')

let fs = require('fs');
const { json, text } = require('body-parser');
let app = express();

app.set('view engine', 'ejs');

const filePath = './db/users.txt'

app.use(bodyParser.json());         // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

const historyOfWeather = [];

const checkUnique = (chatId) => {
    if (fs.existsSync(filePath)) {
        let users = JSON.parse(fs.readFileSync(filePath))
        let unique = true;

        for (let i = 0; i < users.length; i++) {
            if (users[i]['chatId'] === chatId) {
                unique = false;
                break;
            }
        }

        return unique
    }
}

const saveUser = (username, chatId) => {
    let user = {
        username: username,
        chatId: chatId
    }
    if (checkUnique(chatId)) {
        let users = null;
        try {
            users = JSON.parse(fs.readFileSync(filePath));
        } catch {
            users = []
        }
        users.push(user);

        fs.writeFileSync(filePath, JSON.stringify(users))
    } else {
        bot.sendMessage(chatId, 'ты уже есть в нашем клубе')
    }

}

app.get("/contacts", function (request, response) {
    response.render('contacts.ejs', {
        title: 'Contacts page',
        contacts: JSON.parse(fs.readFileSync(filePath))
    })
})

app.post('/bot/message', function (request, response) {
    let chatId = request.body.chatId
    let message = request.body.userMessage

    bot.sendMessage(chatId, message)
    response.end()
})

bot.onText(/\/register/, function (msg, match) {
    let textArray = msg.text.split(' '); // делаем из элементов массив
    textArray.splice(0, 1) // убираем команду из массива
    let textWithoutCommand = textArray.join(' ') //объединяем элементы, ставим между ними пробел

    saveUser(textWithoutCommand, msg.chat.id)

    bot.sendMessage(msg.chat.id, 'Вы успешно зарегистрировались под именем:\n' + textWithoutCommand);
})

bot.onText(/\/search/, function (msg, match) {
    let textArray = msg.text.split(' ');
    textArray.splice(0, 1)
    let nameOfArtist = textArray.join(' ')


    const options = {
        method: 'GET',
        url: 'https://genius.p.rapidapi.com/search',
        params: { q: nameOfArtist },
        headers: {
            'x-rapidapi-key': '48b1e3eaddmshd2296b36b4f8773p147b3cjsn0549f1e9edfe',
            'x-rapidapi-host': 'genius.p.rapidapi.com'
        }
    };

    axios.request(options).then(function (response) {
        // bot.sendMessage(msg.chat.id, JSON.stringify(response));
        // console.log(response)
        // console.log(response)
        for (let i = 0; i < response['data']['response']['hits'].length; i++) {
            bot.sendMessage(msg.chat.id, 'Full Title: ' + ' ' + response['data']['response']['hits'][i]['result']['full_title'] + '\n' +
                'Artist: ' + ' ' + response['data']['response']['hits'][i]['result']['primary_artist']['name'] + '\n' +
                'Image_Url ' + response['data']['response']['hits'][i]['result']['song_art_image_thumbnail_url'] + '\n' +
                'Concurents: ' + ' ' + response['data']['response']['hits'][i]['result']['stats']['concurrents'] + '\n' +
                'Hot: ' + ' ' + response['data']['response']['hits'][i]['result']['stats']['hot'] + '\n' +
                'Page Views: ' + ' ' + response['data']['response']['hits'][i]['result']['stats']['pageviews'] + '\n')
            // bot.sendMessage(msg.chat.id, 'asdsdsa')
        }
    }).catch(function (error) {
        console.error(error);
    });

})

bot.onText(/\/weather/, function (msg, match) {
    let textArray = msg.text.split(' '); // делаем из элементов массив
    textArray.splice(0, 1) // убираем команду из массива
    let textWithoutCommand = textArray.join(' ') //объединяем элементы, ставим между ними пробел

    weather.find({
        search: textWithoutCommand,
        degreeType: 'C'
    },
        function (err, result) {
            let users = JSON.parse(fs.readFileSync(filePath));
            let registered = false;
            for (let i = 0; i < users.length; i++) {
                if (users[i]['chatId'] === msg.chat.id) {
                    registered = true;
                    break;
                }
            }

            if (registered) {
                bot.sendMessage(msg.chat.id, `Погода в ${textWithoutCommand}` + ' ' + result[0]['current']['temperature'] + result[0]['location']['degreetype'] + ' '
                    + "Скорость ветра: " + result[0]['current']['windspeed'] + ' ' + 'Ощущается как: ' + result[0]['current']['feelslike'] + result[0]['location']['degreetype']
                    + ' ' + 'Влажность: ' + result[0]['current']['humidity']);


                let newWeather = {
                    chatId: msg.chat.id,
                    city: textWithoutCommand,
                    otherInformation: `Погода в ${textWithoutCommand}` + ' ' + result[0]['current']['temperature'] + result[0]['location']['degreetype'] + ' '
                        + "Скорость ветра: " + result[0]['current']['windspeed'] + ' ' + 'Ощущается как: ' + result[0]['current']['feelslike'] + result[0]['location']['degreetype']
                        + ' ' + 'Влажность: ' + result[0]['current']['humidity']
                }
                historyOfWeather.push(newWeather)
                fs.writeFileSync('./db/history.txt', JSON.stringify(historyOfWeather))
            }
            else {
                bot.sendMessage(msg.chat.id, 'брат ты не зареган введи регистер');
            }
        })
})

app.get("/history", function (request, response) {
    response.render('history.ejs', {
        title: 'History of weather',
        historyOfWeather: JSON.parse(fs.readFileSync('./db/history.txt')),
    })
})

app.get("/distribution", function (request, response) {
    response.render('distribution.ejs', {

    })
})
app.post('/sendMessage', function (request, response) {
    let users = JSON.parse(fs.readFileSync(filePath));
    let message = request.body.messageForAll;
    for (let i = 0; i < users.length; i++) {
        bot.sendMessage(users[i]['chatId'], message)
    }
    response.end()
})

bot.on('message', function (msg) {
    // saveUser(msg.chat.first_name, msg.chat.id)
})

app.listen(8080)