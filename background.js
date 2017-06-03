chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, {"message" : "clicked_chrome_extension_action"});
  });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message === "open_new_tab") {
    chrome.tabs.create({"url": chrome.extension.getURL('result.html')});
    localStorage.info = request.info;
    localStorage.songs = request.contents;
    localStorage.playlistTitle = request.playlistTitle;
  }
});