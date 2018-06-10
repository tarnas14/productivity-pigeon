'use strict';

let state = {
  urls: [],
  enabled: true
};

let stats = []

chrome.runtime.onMessage.addListener(
  function(request, sender, callback){
    if(request.directive == 'togglePigeon') {
      state.enabled = !state.enabled;
      chrome.storage.sync.set({'state': state});
      callback(state.enabled);
    }
    else if(request.directive == 'addSite') {
      state.urls.push(request.site);
      chrome.storage.sync.set({'state': state});
      callback();
    }
    else if(request.directive == 'removeSite') {
      state.urls.splice(state.urls.indexOf(request.site), 1);
      chrome.storage.sync.set({'state': state});
      callback();
    }
    else if(request.directive == 'test') {
      console.log('yes');
      callback();
    }
  }
);

const strip = url => {
  const matches = url.toLowerCase().match(/\:\/\/(www\.)?((.[^/]*)\.(.[^/]*))\//);
  return matches && matches[2];
}

const matchURL = (url) => {
  const stripped = strip(url);
  return (stripped && state.urls.indexOf(stripped) > -1);
};

const hitBlocked = (url) => {
  // defer state setting till next event loop
  // this happens onBeforeRequest, we want to be as fast as possible
  window.setTimeout(() => {
    const locale = window.navigator.languages
      ? window.navigator.languages[0]
      : window.navigator.language || window.navigator.userLanguage;
    const today = new Intl.DateTimeFormat(locale).format(Date.now());

    stats.splice(0, 0, {
      when: today,
      where: strip(url)
    });

    chrome.storage.sync.set({'stats': stats});
  });
};

chrome.webRequest.onBeforeRequest.addListener((tab) => {
  if(matchURL(tab.url) && state.enabled) {
    hitBlocked(tab.url);
    return {
      redirectUrl: chrome.extension.getURL('blocked.html')
    };
  }
}, {
  urls: ['<all_urls>']
}, ['blocking']);

chrome.storage.sync.get('state', (data) => {
  if(data.state) state = data.state;
  else chrome.storage.sync.set({state});
});

chrome.storage.sync.get('stats', ({stats: syncedStats}) => {
  if (syncedStats) {
    stats = syncedStats;
    return;
  }

  chrome.storage.sync.set({stats});
});
