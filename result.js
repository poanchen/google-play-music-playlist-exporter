document.getElementById("info").innerHTML = localStorage.info;
var progress = document.getElementById("progress");
var redirectUri = "https://www.jenrenalcare.com/upload/thank-you.html";

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (tab.url.indexOf(redirectUri) != -1 && changeInfo.status == 'complete') {
    progress.innerHTML += "[INFO] Grant button has been clicked...<br>";
    retrieveAccessToken(tab.url)
      .then(retrieveUserInfo)
      .then(createAPlaylist)
      .then(getAllSongsInfo)
      .then(prepareToaddAllSongsToPlaylist)
      .then(addAllSongsToPlaylist)
      .catch(error => {
        progress.innerHTML += "[WARNING] " + error + "<br>";
      });
  }
});

const addAllSongsToPlaylist = response => {
  progress.innerHTML += "[INFO] Let's begin to add all your songs to the playlist...<br>";
  var tokenType = response.token_type;
  var accessToken = response.access_token;
  var playlistId = response.playlistId;
  var userId = response.userId;
  var songs = response.songs;
  var songRequests = [];
  // The spotify api only allows 100 songs to be sent across at a time
  // We need to batch our requests.
  while (songs.length > 0) {
    var reqSongs = (songs.length > 100) ? songs.splice(0,100) : songs.splice(0, songs.length);
    songRequests.push(new Promise(resolve => {
      post("https://api.spotify.com/v1/users/" + userId + "/playlists/" + playlistId + "/tracks", {
        Authorization: tokenType + ' ' + accessToken,
        "Content-type": "application/json"
      }, JSON.stringify({
        uris: reqSongs
      }), function(response) {
        progress.innerHTML += "[INFO] " + reqSongs.length + " Songs have been added to the playlist...<br>";
        resolve(response);
      });
    }));
  }
  return Promise.all(songRequests);
};

const prepareToaddAllSongsToPlaylist = response => {
  var songs = [];
  for (key in response) {
    if (isNumeric(key)) {
      try {
        // account for odd cases
        if (response[key] && response[key].uri) {
          songs.push(response[key].uri);
        }     
      } catch(err) {
        // probably would be a good idea to warn the user
        console.log(err);
      } 
    }
  }
  return new Promise(resolve => {
    response['songs'] = songs;
    resolve(response);
  });
};

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

const getAllSongsInfo = response => {
  var tokenType = response.token_type;
  var accessToken = response.access_token;
  var playlistId = response.id;
  var userId = response.userId;
  var songs = JSON.parse(localStorage.songs);
  var allSearchPromises = [];
  for (key in songs) {
    // https://developer.spotify.com/web-api/user-guide/#rate-limiting
    // https://github.com/spotify/web-api/issues/116
    // might to to add a delay for searching a song so that we will not get status code 429
    // however, it might be better idea to use Retry-After header?
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
    response['song'] = songs[key];
    progress.innerHTML += "[INFO] Preparing to add " + songs[key].title + " by " + songs[key].artist + " to the playlist...<br>";
    allSearchPromises.push(searchASong(response));
  }
  // Execute promises sequentially, so we can delay them and
  // avoid rate limit errors from spotify API
  return allSearchPromises.reduce((promiseChain, currentTask) => {
    return promiseChain.then(chainResults =>
        currentTask.then(currentResult =>
            [ ...chainResults, currentResult ]
        )
    );
  }, Promise.resolve([])).then(response => {
    response['token_type'] = tokenType;
    response['access_token'] = accessToken;
    response['playlistId'] = playlistId;
    response['userId'] = userId;
    return response;
  });
};

const searchASong = response => {
  return new Promise(resolve => {
    var waittime = 100; // milliseconds between calls
    var ms = Math.floor((new Date).getTime()) + waittime;
    while (Math.floor((new Date).getTime()) < ms) {
      // This is a blocking wait.
      // I tried a ton of ways to avoid this. Sadly window.timeout 
      // has odd behvaiour within a chrome extension.
    }
    get("https://api.spotify.com/v1/search", {
      Authorization: response.token_type + ' ' + response.access_token
    }, buildSearchQuery(response.song), responseFromSearch => {
      if(responseFromSearch.tracks.total == 0) {
        let songInfo = getSongInfo(responseFromSearch.tracks.href);
        progress.innerHTML += "<span style='color: red'>[WARNING] Could not find the song " + songInfo.title + " by " + songInfo.artist + " on Spotify...</span><br>";
      }
      resolve(responseFromSearch.tracks.items[0]);
    });
  });
};

const createAPlaylist = response => {
  progress.innerHTML += "[INFO] We are now ready to create " + localStorage.playlistTitle + " playlist in the Spotify...<br>";
  progress.innerHTML += "[INFO] Sit tight...<br>";
  var tokenType = response.token_type;
  var accessToken = response.access_token;
  var userId = response.id;
  return new Promise(resolve => {
    post("https://api.spotify.com/v1/users/" + userId + "/playlists", {
      Authorization: tokenType + ' ' + accessToken,
      "Content-type": "application/json"
    }, JSON.stringify({
      name: localStorage.playlistTitle
    }), response => {
      progress.innerHTML += "[INFO] " + localStorage.playlistTitle + " playlist has been created...<br>";
      progress.innerHTML += "[INFO] The playlist's id is " + response.id + "...<br>";
      response['token_type'] = tokenType
      response['access_token'] = accessToken;
      response['userId'] = userId;
      return resolve(response);
    });
  });
};

const retrieveUserInfo = response => {
  progress.innerHTML += "[INFO] Let's check if your access token works...<br>";
  progress.innerHTML += "[INFO] Trying to get the user id using the access token...<br>";
  var tokenType = response.token_type;
  var accessToken = response.access_token;
  return new Promise(resolve => {
    get("https://api.spotify.com/v1/me", {
      Authorization: tokenType + ' ' + accessToken
    }, null, response => {
      progress.innerHTML += "[INFO] Seems like your access token works...<br>";
      progress.innerHTML += "[INFO] Your user id is " + response.id + "...<br>";
      response['token_type'] = tokenType
      response['access_token'] = accessToken;
      resolve(response);
    });
  });
};

const retrieveAccessToken = url => {
  progress.innerHTML += "[INFO] Requesting your access token right now...<br>";
  return new Promise(resolve => {
    post("https://accounts.spotify.com/api/token", {}, urlencode({
      grant_type: 'authorization_code',
      code: getParam(url, 'code'),
      redirect_uri: redirectUri,
      client_id: "3aa81ba3bbea466ba09fef04a5feea41",
      client_secret: "c47f40315044462d8b52bf747e8b2e1f"
    }), response => {
      progress.innerHTML += "[INFO] We have got your access token...<br>";
      resolve(response);
    });
  })
};

// "ArtistA & ArtistB => ArtistA, ArtistB"
// useful when there are multiple (feat) artists for a song, for example,
// Title (feat. ArtistA & ArtistB) - ArtistC - Album => Title - ArtistC, ArtistA, ArtistB - Album
// Title - ArtistA & ArtistB - Album => Title - ArtistA, ArtistB - Album
const splitAmpersandAndJoin = names => {
  return names.split("&").map(artist => artist.trim()).join(", ");
}

// "ArtistA feat. ArtistB => ArtistA, ArtistB"
// useful when there are duplicate (feat) artists for a song, for example,
// Title (feat. ArtistA) - ArtistC feat. ArtistA - Album => Title - ArtistC, ArtistA, ArtistA - Album
const splitFeatWordAndJoin = names => {
  return names.split("feat.").map(artist => artist.trim()).join(", ");
}

// ArtistA, ArtistA, ArtistB, ArtistC, ArtistB
// useful when there are duplicate artists in the list, for example,
// Title - ArtistC, ArtistA, ArtistA - Album => Title - ArtistC, ArtistA - Album
const removeDuplicateArtistsIfAny = names => {
  let namesArr = names.split(",").map(artist => artist.trim()).reduce((allNames, artistName) => {
    if(!(artistName in allNames)) allNames[artistName] = 1;
    return allNames;
  }, {});
  return Object.keys(namesArr).join(", ");
}

const handleFeatNamingConvention = song => {
  let matchedResults = /^([\S\s]+)\s(\([\S\s]+\))/.exec(song.title);
  if(matchedResults == null) return song;
  let featMatchedResults = /\(feat.\s([\S\s]+)\)/.exec(matchedResults[2]);
  if(featMatchedResults == null) return song;
  return {
    title: matchedResults[1],
    artist: removeDuplicateArtistsIfAny(song.artist + ", " + splitAmpersandAndJoin(featMatchedResults[1])),
    album: song.album
  };
}

const formatGooglePlayMusicNamingConventionToSpotify = song => {
  song.artist = splitAmpersandAndJoin(song.artist);
  song.artist = splitFeatWordAndJoin(song.artist);
  song = handleFeatNamingConvention(song);
  return song;
}

const buildSearchQuery = song => {
  song = formatGooglePlayMusicNamingConventionToSpotify(song);
  return "q=" + encodeURIComponent(song.title) +
         "%20album:" + encodeURIComponent(song.album) +
         "%20artist:" + encodeURIComponent(song.artist) +
         "&type=track";
}

const getSongInfo = url => {
  let decodeUrl = decodeURIComponent(url);
  let query = decodeUrl.split("?")[1].split("&")[0];
  let matchedResults = /^query=(\S+)\+album\:(\S+)\+artist\:([\S]+)/.exec(query);
  return {
    title: matchedResults[1].split("+").join(" "),
    album: matchedResults[2].split("+").join(" "),
    artist: matchedResults[3].split("+").join(" ")
  }
}

// https://stackoverflow.com/a/9718723 by DonCallisto (https://stackoverflow.com/users/814253/doncallisto)
const getParam = (url, field) => {
  field = field.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+field+"=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(url);
  if (results == null) {
    return '';
  } else {
    return results[1];
  }
}

const urlencode = data => {
  var url = '';
  for (key in data) {
    url += key + '=' + data[key] + '&';
  }
  return url.substring(0, url.length-1);
}

const assignRequestHeader = (request, header) => {
  for (key in header) {
    request.setRequestHeader(key, header[key]);
  }
  return request;
}

const get = (url, header, param, success) => {
  var request = new XMLHttpRequest();
  request.open('GET', url + '?' + param);
  request = assignRequestHeader(request, header);
  request.onreadystatechange = function() {
    if (request.readyState === XMLHttpRequest.DONE) {
      if (request.status === 200) {
        success(JSON.parse(request.response));
      }
    }
  };
  request.send();
}

const post = (url, header, param, success) => {
  var request = new XMLHttpRequest();
  request.open('POST', url, true);
  request = assignRequestHeader(request, header);
  if (header["Content-type"] === undefined) {
    request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  }
  request.onreadystatechange = function() {
    if (request.readyState === XMLHttpRequest.DONE) {
      if (request.status === 200 || request.status === 201) {
        success(JSON.parse(request.response));
      }
    }
  };
  request.send(param);
}