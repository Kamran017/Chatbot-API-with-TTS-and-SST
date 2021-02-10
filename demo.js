const express = require('express')
const Gtts = require('gtts') // google text to speech api
const tmp = require('tmp')
const PORT = 8080 || process.env.PORT
const _ = require('lodash');
const speech = require('@google-cloud/speech'); // google speech to text api
const request = require("request-promise");//library for requesting to CBOT
const fs = require('fs');
const mrkdwn = require('html-to-mrkdwn');// for bot response
const { concatLimit } = require('async');
var app = express()
var bodyParser = require('body-parser');
const { pathMatch } = require('tough-cookie');
const { Root } = require('protobufjs');
const gTTS = require('gtts');
app.use(express.json({ extended: true }))
app.use(express.static(__dirname))

// Add headers
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.get('/getMain', async function (req, res) {
    
    res.sendFile(process.cwd()+"/main.html")
})




//for user input
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

// text to speech function
function tts(text){
    // const app = express()
    // Save Method
    const gtts = new Gtts(text, 'tr')
    const tmpFile = '1.mp3'
    
    gtts.save(tmpFile, (err, result) => {
      if (err) throw err
      console.log(`Success! Open file ${tmpFile} to hear the result.`)
    })
}
//speech to text function
function sst(){
    // Creates a client
    const speechClient = new speech.SpeechClient();

    // The path to the audio file to transcribe
    const filePath = '1.wav';

    // Reads a local audio file and converts it to base64
    const file = fs.readFileSync(filePath);
    const audioBytes = file.toString('base64');
    const audio = {
    content: audioBytes,
    };

    // The audio file's encoding, sample rate in hertz, and BCP-47 language code
    const config = {
    encoding: 'LINEAR16',
    sampleRateHertz: 48000,
    languageCode: 'tr-TR',
    audioChannelCount: 2,
    enableSeparateRecognitionPerChannel: true
    };

    const request = {
    audio,
    config,
    };

    // Detects speech in the audio file
    speechClient
    .recognize(request)
    .then((data) => {
        const results = _.get(data[0], 'results', []);
        const transcription = results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
        console.log(`Transcription: ${transcription}`);
    })
    .catch(err => {
        console.error('ERROR:', err);
    });

}

//send results to the CBOT
async function sendRequest(botUrl,botToken, msg) {
    try {
        let resp = await request({
            url: botUrl,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Cbot-Token": botToken
            },
            json: {
                userId: "6457707",
                message: msg,
                referrer: "WIDGET"
            }
        });
        // console.log("RESP", JSON.stringify(resp, null, 2)); // print result as json
        return resp
    } catch (err) {
        console.error(err);
        process.exit(1); //close process when error occurs
    }
}



// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())


app.post('/sendRequest', async function (req, res) {
    // get bot parameters from front end side
    var str=req.body["text"]
    var botUrl=req.body["url"]
    var botToken=req.body["token"]
    try {
        var botResp=await sendRequest(botUrl,botToken,str)
        botResp= mrkdwn(botResp.message[0].message); 
        res.end(botResp.text)
    } catch (error) {
        console.log(error)
    }
})

// convert text to speech 
app.get('/speech', function(req, res) {
    var language='';
    if(req.query.lang=="turkish"){
        language="tr"
    }  
    else if(req.query.lang=="germany"){
        language="de"
    } 
    else if(req.query.lang=="spanish"){
        language="es"
    } 
    else if(req.query.lang=="english"){
        language="en"
    } 
    const gtts = new Gtts(req.query.text, language);
    res.set({'Content-Type': 'audio/mpeg'});
    gtts.stream().pipe(res);
})

// listen to port 8000
app.listen(8000)

