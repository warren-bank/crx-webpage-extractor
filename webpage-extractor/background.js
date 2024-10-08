chrome.browserAction.onClicked.addListener(tab => {
  chrome.tabs.sendMessage(tab.id, 'toggle_webpage_extractor_active_mode')
})
