chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message === "clicked_chrome_extension_action") {
    var intervalms = 1;
    var timeoutms = 5000;
    var retries = timeoutms / intervalms;
    var songs = Immutable.OrderedMap();
    var seen = Immutable.Set();
    var topId = "";
    var playlistTitle = document.querySelector("[slot='title']").innerHTML.trim();
    // use with caution as Google Play Music might change their front-end
    // which leads this to not working
    var numberOfSongsInText = document.querySelector(
      "div.style-scope.gpm-detail-page-header span[slot='metadata']"
    ).childNodes[0].innerHTML;
    var numberOfSongs = 0;
    if (/\d+\ssong[s]?/.test(numberOfSongsInText)) {
      var numbers = numberOfSongsInText.match(/\d+/);
      if (numbers.length == 1) {
        numberOfSongs = numbers[0];
      }
    }
    console.log('Beginning to export ' + playlistTitle + ' playlist in Google Play Music.');
    if (numberOfSongs) {
      console.log('There are in total of ' + numberOfSongs + ' song(s) according to Google Play Music.');
    }
    document.querySelector("#mainContainer").scrollTop = 0; // scroll to top to begin with
    var interval = setInterval(function() {
      var songsFromPlaylistInHtml = document.querySelectorAll("table.song-table tbody tr.song-row");
      if (songsFromPlaylistInHtml.length > 0) {
        var currId = songsFromPlaylistInHtml[0].getAttribute("data-id");
        if (currId == topId) {
          retries--;
          var scrollDiv = document.querySelector("#mainContainer");
          var isAtBottom = scrollDiv.scrollTop == (scrollDiv.scrollHeight - scrollDiv.offsetHeight)
          if (isAtBottom || retries <= 0) {
            clearInterval(interval);
            var info = 'Finished reading ' + songs.size + ' songs from ' + playlistTitle + ' playlist in Google Play Music.';
            if (parseInt(numberOfSongs) != parseInt(songs.size)) {
              var lostSongs = parseInt(numberOfSongs) - parseInt(songs.size);
              info += ' (with ' + lostSongs + ' lost).';
            }
            var songsInJSON = JSON.stringify(songs.toJS(), undefined, 2);
            chrome.runtime.sendMessage({
              "message": "open_new_tab",
              "info": info,
              "playlistTitle": playlistTitle,
              "contents": songsInJSON,
              "numberOfSongs": numberOfSongs
            });
          }
        } else {
          retries = timeoutms/intervalms;
          topId = currId;
          for (var i = 0; i < songsFromPlaylistInHtml.length; i++) {
            var id = songsFromPlaylistInHtml[i].getAttribute("data-id");
            if (!seen.has(id)) {
              songs = songs.set(id, Immutable.Map({
                // Instead of hard-coded in the index for the title, artist, and album.
                // we should actually check first and then use it.
                // More info: please visit https://github.com/poanchen/google-play-music-playlist-exporter/issues/1#issuecomment-316921298
                title: songsFromPlaylistInHtml[i].childNodes[1].textContent.trim(),
                artist: songsFromPlaylistInHtml[i].childNodes[3].textContent.trim(),
                album: songsFromPlaylistInHtml[i].childNodes[4].textContent.trim()
              }));
              seen = seen.add(id);
            }
          }
          songsFromPlaylistInHtml[songsFromPlaylistInHtml.length-1].scrollIntoView(true); // scroll to the next page
        }
      }
    }, intervalms);
  }
});