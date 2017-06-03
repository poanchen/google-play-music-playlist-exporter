document.getElementById("info").innerHTML = localStorage.info;
// document.getElementById("contents").innerHTML = localStorage.songs;
var progress = document.getElementById("progress");
document.getElementById("grant-button-clicked").onclick = function() {
  progress.innerHTML += "[INFO] Grant button has been clicked...<br>";
  setTimeout(function() {
    // https://developer.spotify.com/web-api/authorization-guide
    // The user is redirected back to your specified URI
    chrome.tabs.query({url: "https://www.jenrenalcare.com/**"}, function(tabs) {
      tabs.forEach(function(tab) {
        progress.innerHTML += "[INFO] Requesting your access token right now...<br>";
        // Your application requests refresh and access tokens
        post("https://accounts.spotify.com/api/token", {}, urlencode({
          grant_type: 'authorization_code',
          code: getParam(tab.url, 'code'),
          redirect_uri: "https://www.jenrenalcare.com/upload/thank-you.html",
          client_id: "3aa81ba3bbea466ba09fef04a5feea41",
          client_secret: "c47f40315044462d8b52bf747e8b2e1f"
        }), function(response) {
          progress.innerHTML += "[INFO] We have got your access token...<br>";
          progress.innerHTML += "[INFO] Let's check if your access token works...<br>";
          progress.innerHTML += "[INFO] Trying to get the user id using the access token...<br>";
          var tokenType = response.token_type;
          var accessToken = response.access_token;
          // The tokens are returned to your application
          // Use the access token to access the Spotify Web API me to get user id
          get("https://api.spotify.com/v1/me", {
            Authorization: tokenType + ' ' + accessToken
          }, null, function(response) {
            var userId = response.id;
            progress.innerHTML += "[INFO] Seems like your user id is " + userId + "...<br>";
            progress.innerHTML += "[INFO] We are now ready to create " + localStorage.playlistTitle + " playlist...<br>";
            progress.innerHTML += "[INFO] Sit tight...<br>";
            // Create a brand new playlist in Spotify
            post("https://api.spotify.com/v1/users/" + userId + "/playlists", {
              Authorization: tokenType + ' ' + accessToken,
              "Content-type": "application/json"
            }, JSON.stringify({
              name: localStorage.playlistTitle
            }), function(response) {
              var playlistId = response.id;
              progress.innerHTML += "[INFO] " + localStorage.playlistTitle + " playlist has been created...<br>";
              progress.innerHTML += "[INFO] The playlist's id is " + playlistId + "...<br>";
              progress.innerHTML += "[INFO] Let's begin to add all your songs to the playlist...<br>";
              var songs = JSON.parse(localStorage.songs);
              var i = 1;
              for (key in songs) {
                progress.innerHTML += "[INFO] Working on " + i++ + "/" + Object.keys(songs).length + " songs...<br>";
                progress.innerHTML += "[INFO] Check to see if " + songs[key].title + " by " + songs[key].artist + " is in Spotify...<br>";
                get("https://api.spotify.com/v1/search", {
                  Authorization: tokenType + ' ' + accessToken
                }, "q=" + songs[key].title + "%20album:" + songs[key].album + "%20artist:" + songs[key].artist + "&type=track", function(response) {
                  if (response.tracks.items.length) {
                    var uri = response.tracks.items[0].uri;
                    var title = response.tracks.items[0].name;
                    var artist = response.tracks.items[0].artists[0].name;
                    var albumn = response.tracks.items[0].album.name;
                    progress.innerHTML += "[INFO] Seems like " + title + " by " + artist + " has been found...<br>";
                    progress.innerHTML += "[INFO] The song's uri is " + uri + "...<br>";
                    progress.innerHTML += "[INFO] Adding the song " + title + " to the playlist right now...<br>";
                    post("https://api.spotify.com/v1/users/" + userId + "/playlists/" + playlistId + "/tracks", {
                      Authorization: tokenType + ' ' + accessToken,
                      "Content-type": "application/json"
                    }, JSON.stringify({
                      uris: [uri]
                    }), function(response) {
                      progress.innerHTML += "[INFO] Seems like " + title + " by " + artist + " has been added to the playlist...<br>";
                    });
                  } else {
                    progress.innerHTML += "[WARNING] Seems like Spotify does not have " + songs[key].title + " by " + songs[key].artist + "...<br>";
                  }
                });
              };
            });
          });
        });
      });
    });
  }, 2000);
};

// https://stackoverflow.com/a/9718723 by DonCallisto (https://stackoverflow.com/users/814253/doncallisto)
function getParam(url, field) {
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

function urlencode(data) {
  var url = '';
  for (key in data) {
    url += key + '=' + data[key] + '&';
  }
  return url.substring(0, url.length-1);
}

function get(url, header, param, success) {
  var request = new XMLHttpRequest();
  request.open('GET', url + '?' + param);
  for (key in header) {
    request.setRequestHeader(key, header[key]);
  }
  request.onreadystatechange = function() {
    if (request.readyState === XMLHttpRequest.DONE) {
      if (request.status === 200) {
        success(JSON.parse(request.response));
      }
    }
  };
  request.send();
}

function post(url, header, param, success) {
  var request = new XMLHttpRequest();
  request.open('POST', url, true);
  for (key in header) {
    request.setRequestHeader(key, header[key]);
  }
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