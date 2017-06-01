chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message === "clicked_chrome_extension_action") {
    var intervalms = 1;
    var timeoutms = 5000;
    var retries = timeoutms / intervalms;
    var songs = Immutable.OrderedMap();
    var seen = Immutable.Set();
    var topId = "";
    var playlistTitle = document.querySelector("[slot='title']").innerHTML;
    console.log('Beginning to export ' + playlistTitle + 'playlist in Google Play Music.');
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
            var info = 'Finished reading ' + songs.size + ' songs from ' + playlistTitle + 'playlist in Google Play Music.';
            var songsInJSON = JSON.stringify(songs.toJS(), undefined, 2);
            chrome.runtime.sendMessage({
              "message" : "open_new_tab",
              "info" : info,
              "contents": songsInJSON
            });
          }
        } else {
          retries = timeoutms/intervalms;
          topId = currId;
          for (var i = 0; i < songsFromPlaylistInHtml.length; i++) {
            var id = songsFromPlaylistInHtml[i].getAttribute("data-id");
            if (!seen.has(id)) {
              songs = songs.set(id, Immutable.Map({
                title: songsFromPlaylistInHtml[i].childNodes[1].textContent.trim(),
                duration: songsFromPlaylistInHtml[i].childNodes[2].textContent.trim(),
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