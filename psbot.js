const {google}  = require('googleapis');
const sheets    = google.sheets('v4');
const Discord   = require("discord.js");
const client    = new Discord.Client();
const config    = require("./config.json");
const gapi      = require("./gapi.json");
const request   = require('request');
const cheerio   = require('cheerio');

// Functions
function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function sortLast(data) {
  return data.sort(function(a, b){return b.slice(-1)[0] - a.slice(-1)[0]});
}

function markdown(dataArr) {
  dataArr.unshift("```diff");
  dataArr.push("```");
  return dataArr;
}

function find_str(array, searchparam){
  data        = [];
  filteredArr = [];
  for(var i=0;i<array.length;i++){
    if (armor != undefined) {
      armor.forEach(function(searchparam) {
        if(array[i][3] === searchparam.toUpperCase()){
          filteredArr.push(array[i]);
        }
      });
    } else if (clss != undefined) {
      if (clss === 'all') {
        filteredArr.push(array[i]);
      } else if(array[i][3] === searchparam.toUpperCase()){
        filteredArr.push(array[i]);
      }
    } else if (argument != undefined) {
      if(array[i][2] === toTitleCase(searchparam)){
        filteredArr.push(array[i]);
      }
    } else {
      if(array[i][1] === searchparam){
        filteredArr.push(array[i]);
      }
    }
  }
  return sortLast(filteredArr);
}

function getspaces(str) {
  var limit = 10;
  return limit - str.length;
}

function formatArr(dataArr) {
  formattedArr = [];
  dataArr.forEach(function(data) {
    if (data[0] === 'M') {
      formattedArr.push('- ' + data[2] + ' '.repeat(getspaces(data[2])) + " (" + data[3] + ") " + data[7]);
    } else {
      formattedArr.push('+ ' + data[2] + ' '.repeat(getspaces(data[2])) +  " (" + data[3] + ") " + data[7]);
    }
  });
  return formattedArr;
}

function requestData(range) {
  data = {
    spreadsheetId: gapi.sheetid,
    range: range,
    majorDimension: 'ROWS',
    auth: gapi.auth,
  };
  return data;
}

function logRequest(user, command, request) {
  var d = new Date();
  console.log(d.toLocaleString() + ' Requestor=' + user + ' Command=' + command + ' Request=' + request);
}

//Bot status
client.on("ready", () => {
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
  client.user.setActivity('All your LF are belong to me.');
});
client.on("guildCreate", guild => {
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
});
client.on("guildDelete", guild => {
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
});

client.on("message", message => {

  //
  // Declare variables that rely on discord data.
  //
  // Set user to nickname if set, otherwise username.
  if (message.author.lastMessage.member.nickname === null) {
    user = toTitleCase(message.author.username);
  } else {
    user = toTitleCase(message.author.lastMessage.member.nickname);
  }

  if(message.author.bot) return;
  if(message.content.indexOf(config.prefix) !== 0) return;
  
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if(command === "lf") {

    // Declare variables for LF command
    armor        = undefined;
    clss         = undefined;
    argument     = undefined;

    // If an argument was passed, see if it is a class or armor type.
    if (args[0] != undefined) {
      switch (args[0].toLowerCase()) {
        case 'brd':
        case 'bard':
          clss = 'brd';
          break;
        case 'bst':
        case 'beast':
        case 'beastlord':
          clss = 'bst';
          break;
        case 'clr':
        case 'cleric':
          clss = 'clr';
          break;
        case 'dru':
        case 'druid':
          clss = 'dru';
          break;
        case 'enc':
        case 'ench':
        case 'enchanter':
          clss = 'enc';
          break;
        case 'mag':
        case 'magician':
          clss = 'mag';
          break;
        case 'mnk':
        case 'monk':
          clss = 'mnk';
          break;
        case 'nec':
        case 'necro':
        case 'necromancer':
          clss = 'nec';
          break;
        case 'pal':
        case 'paladin':
          clss = 'pal';
          break;
        case 'pal':
        case 'paladin':
          clss = 'pal';
          break;
        case 'rng':
        case 'ranger':
          clss = 'rng';
          break;
        case 'rog':
        case 'rogue':
          clss = 'rog';
          break;
        case 'sk':
        case 'shd':
        case 'shadowknight':
          clss = 'shd';
          break;
        case 'shm':
        case 'shaman':
          clss = 'shm';
          break;
        case 'war':
        case 'warrior':
          clss = 'war';
          break;
        case 'wiz':
        case 'wizard':
          clss = 'wiz';
          break;
        case 'all':
          clss = 'all';
          break;
        case 'top10':
          clss = 'top10';
          break;
        case 'chain':
          armor = [ 'rng', 'rog', 'shm' ] ;
          break;
        case 'leather':
          armor = [ 'bst', 'dru', 'mnk' ];
          break;
        case 'plate':
          armor = [ 'brd', 'clr', 'pal', 'shd', 'war' ];
          break;
        case 'cloth':
        case 'silk':
          armor = [ 'enc', 'mag', 'nec', 'wiz' ];
          break;
      }
    }

    // Check supplied argument to determine searchparam.
    if(args[0] === undefined) {
      searchparam = user;
    } else if (clss !== undefined) {
      searchparam = clss;
    } else if (armor !== undefined) {
      searchparam = armor;
    } else {
      argument    = args[0];
      searchparam = args[0];
    }

    // Make the request.
    var apiReq = requestData('D3:K100');
    sheets.spreadsheets.values.get(apiReq, function(err, response) {
      if (err) {
        console.error(err);
        message.channel.send('Error connecting to the spreadsheet.');
        return;
      } else {
        var output = markdown(formatArr(find_str(response.data.values, searchparam)));
        message.channel.send(output);
        logRequest(user, command, output);
      }
    });
  }

  if (command === "flags") {

    // Declare variables for flags command
    var character   = args[0];
    var url         = 'http://allaclone.p2002.com/magelo/flags.php?char='
    var request_url = url + character

    if(args[0] === undefined) {
      message.channel.send('`Command: flags - Please provide a character to search for`');
      return;
    }

    //  Make the request
    request(request_url, function (error, response, html) {
      if ( response.statusCode == 404 ) {
        message.channel.send('`Error retrieving flags for ' + character + '.` `Status: ' + response.statusCode + '` `Request URL:` ' + request_url);
      }
      if ( !error && response.statusCode == 200 ) {
        var flagArr = []
        var $ = cheerio.load(html);
        $('.check0').each(function(i, element){
          var flag = $(this).parent().next().text();
          flagArr.push('-' + flag);
        });
        if (!Array.isArray(flagArr) || !flagArr.length) {
          message.channel.send('`Could not find the provided character.`');
        } else {
          message.channel.send(markdown(flagArr));
        }
        logRequest(user, command, flagArr);
      }
    });
  }

  if(command === 'fatno') {
    message.channel.send("https://i1.ytimg.com/vi/h7l2loPApbc/hqdefault.jpg");
  }
  if(command === 'wat') {
    message.channel.send("https://media.giphy.com/media/3WmWdBzqveXaE/giphy.gif");
  }

  if(command === 'help') {
    var help = 'Help Section :robot:\n' +
      '```' +
      'Commands:\n' +
      'Note: Discord username or nickname must match the user column from the spreadsheet.\n' +
      '!lf              - Prints LF for all your characters.\n' +
      '!lf ${character} - Prints LF for the given character.\n' +
      '!lf ${class}     - Prints LF for the given class.\n' +
      '!lf ${armor}     - Prints LF for the given armor type.\n' +
      '```';
    message.channel.send(help);
  }

});

client.login(config.token);
