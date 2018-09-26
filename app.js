'use strict';

const Gpio = require('onoff').Gpio;

const spawn = require('child_process').spawn;

const record = require('node-record-lpcm16');
const Speaker = require('speaker');
const path = require('path');
const fs = require('fs');
const GoogleAssistant = require('google-assistant');
const speakerHelper = require('./speaker-helper');


const debug = true;

// Function do handle random case
function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

// Play sound on start
spawn("play", ['soundFX/R2D2.wav'], {detached: true});

// Get all voices FX
var voicesFX = [];

fs.readdir('soundFX/voicesFX/', (err, files) => {
  files.forEach(file => {
    voicesFX.push('soundFX/voicesFX/' + file);
  });
})


/**
* GPIO used :
* 17  : bigWhiteBtn Google Assistant
*  4  : whiteBtn1 : Voice Changer
* 27  : redBtn1 : Shoot 
* 23  : redBtn2 : Shoot 
* 24  : JoyDirection
* 11  : JoyDirection
* 12  : JoyDirection
* 16  : JoyDirection
* 26  : YellowBtn : Music
**/
var switchs_pressed = []; // All preseed switchs
const switchs = {  
  'joyUp' : {
    'pin' : 24,
    'onpress' : function() {
      this.process = spawn("play", ['soundFX/up.wav', 'repeat', '99'], {detached: true, stdio:'ignore'});
    },
    'onrelease' : function() {
      try { process.kill(-this.process.pid); }
      catch (ex) { }
    }
  },
  'joyDown' : {
    'pin' : 11,
    'onpress' : function() {
      this.process = spawn("play", ['soundFX/down.wav'], {detached: true, stdio:'ignore'});
    },
    'onrelease' : function() {
      try { process.kill(-this.process.pid); }
      catch (ex) { }
    }
  },
  'joyLeft' : {
    'pin' : 12,
    'onpress' : function() {
      this.process = spawn("play", ['soundFX/Medium Vehicle Ship Space RL.wav', 'repeat', '99'], {detached: true, stdio:'ignore'});
    },
    'onrelease' : function() {
      try { process.kill(-this.process.pid); }
      catch (ex) { }
    }
  },
  'joyRight' : {
    'pin' : 16,
    'onpress' : function() {
      this.process = spawn("play", ['soundFX/Medium Vehicle Ship Space LR.wav', 'repeat', '99'], {detached: true, stdio:'ignore'});
    },
    'onrelease' : function() {
      try { process.kill(-this.process.pid); }
      catch (ex) { }
    }
  },
  'redBtn1' : {
    'pin' : 27,
    'onpress' : function() {
      spawn("play", ['soundFX/trprsht1.wav']);
    },
    'onrelease' : function() {
      var random = getRandomInt(60);
      if (random === 1) {
        spawn("play", ['soundFX/explosion1.wav']);
      }
    }
  },
  'redBtn2' : {
    'pin' : 23,
    'onpress' : function() {
      spawn("play", ['soundFX/wlkrsht2.wav']);
    },
    'onrelease' : function() {
      var random = getRandomInt(30);
      if (random === 1) {
        spawn("play", ['soundFX/explosion1.wav']);
      }
    }
  },
  'greenBtn1' : {
    'pin' : 25,
    'onpress' : function() {
	    var sound = voicesFX[Math.floor(Math.random()*voicesFX.length)];
      spawn("play", [sound]);
    }
  },
  'yellowBtn1' : {
    'pin' : 26,
    'onpress' : function() {
      if (this.process){
        try { 
          process.kill(-this.process.pid); 
          this.process = null;
        }
        catch (ex) { }
      } else {
        this.process = spawn("mplayer", ['music/stars_wars_main.wav'], {detached: true, stdio:'ignore'});
      }
    }
  },
  
  'blueBtn1' : {
    'pin' : 4,
    'onpress' : function() {
       this.process = spawn("play", ['|rec --buffer 2048 -d pitch -500 echos 0.4 0.88 100 0.7 180 .8 band 1.2k 1.5k'], {detached: true, stdio:'ignore'});
    },
    'onrelease' : function() {
      try { process.kill(-this.process.pid); }
      catch (ex) { }
    }
  },
  'blueBtn2' : {
    'pin' : 22,
    'onpress' : function() {
       this.process = spawn("play", ['|rec --buffer 2048 -d pitch 500 echos 0.4 0.88 100 0.7 180 .8 band 1.2k 1.5k'], {detached: true, stdio:'ignore'});
    },
    'onrelease' : function() {
      try { process.kill(-this.process.pid); }
      catch (ex) { }
    }
  },
  'bigWhiteBtn' : {
    'pin' : 17,
    'onpress' : function() {
      spawn("play", ['soundFX/R2D2a.wav'], {detached: true});
      this.process = assistant.start(GoogleAssistantConfig.conversation);
    },
  },
}


const GoogleAssistantConfig = {
  auth: {
    keyFilePath: path.resolve(__dirname, '../client_secret_327082524674-04lf2ahq7odk2lsrlbqs1b5bh14kg8bs.apps.googleusercontent.com.json'),
    savedTokensPath: path.resolve(__dirname, 'tokens.json'),
  },
  conversation: {
    audio: {
      sampleRateOut: 24000, // defaults to 24000
    },
    lang: 'fr-FR',
    deviceModelId: 'navette-193314-20180126203921',
    deviceId: 'my_assitant_1_193314',
  },
};

const startConversation = (conversation) => {
  console.log('Say something!');
  let openMicAgain = false;

  // setup the conversation
  conversation
    // send the audio buffer to the speaker
    .on('audio-data', (data) => {
      speakerHelper.update(data);
    })
    // done speaking, close the mic
    .on('end-of-utterance', () => record.stop())
    // just to spit out to the console what was said (as we say it)
    .on('transcription', data => console.log('Transcription:', data.transcription, ' --- Done:', data.done))
    // what the assistant said back
    .on('response', text => console.log('Assistant Text Response:', text))
    // if we've requested a volume level change, get the percentage of the new level
    .on('volume-percent', percent => console.log('New Volume Percent:', percent))
    // the device needs to complete an action
    .on('device-action', action => console.log('Device Action:', action))
    // once the conversation is ended, see if we need to follow up
    .on('ended', (error, continueConversation) => {
      
      if (error) console.log('Conversation Ended Error:', error);
      else if (continueConversation) openMicAgain = true;
      else console.log('Conversation Complete');
    })
    // catch any errors
    .on('error', (error) => {
      console.log('Conversation Error:', error);
    });

  // pass the mic audio to the assistant
  const mic = record.start({ threshold: 0 });
  mic.on('data', data => conversation.write(data));

  // setup the speaker
  const speaker = new Speaker({
    channels: 1,
    sampleRate: GoogleAssistantConfig.conversation.audio.sampleRateOut,
  });
  speakerHelper.init(speaker);
  speaker
    .on('open', () => {
      console.log('Assistant Speaking');
      speakerHelper.open();
    })
    .on('close', () => {
      console.log('Assistant Finished Speaking');
      if (openMicAgain) assistant.start(GoogleAssistantConfig.conversation);
    });
};

const assistant = new GoogleAssistant(GoogleAssistantConfig.auth);

// setup the assistant

assistant
  .on('ready', () => {
    // start a conversation!
    //assistant.start(GoogleAssistantConfig.conversation);
  })
  .on('started', startConversation)
  .on('ended', (error, continueConversation) => {

      if (error) console.log('Conversation Ended Error:', error);
      else console.log('Conversation Complete');
    })
  .on('error', (error) => {
    console.log('Assistant Error:', error);
  });



for (var alias in switchs) {
  let button = switchs[alias];
  if (button.pin) {
    
    // Set pull up resistor.
    spawn("gpio", ['-g', 'mode', button.pin, 'up'], {detached: true, stdio:'ignore'});
    
    // Set watcher.
    button.watcher = new Gpio(button.pin, 'in', 'both');
    
    // Set previous value to remove multiple same values watch
    button.previousval = null;
    
    button.watcher.watch(function (err, value) {
      if (debug) console.log(alias + ":" + value);
      if (value !== button.previousVal) {
        if (value == 0) {
          if (debug) console.log(alias + ": press");
          if (button.onpress) {
            button.onpress();
          }
        } else {
          if (debug) console.log(alias  + ": release");
          if (button.onrelease) {
            button.onrelease();
          }
        }
      }
      button.previousVal = value;
    });
  }
}

process.on('SIGINT', function () {
  for (var alias in switchs) {
    if (switchs[alias].watcher) {
      switchs[alias].watcher.unexport();
    }
  }
});






