// Minimal service worker — side panel only
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(err => console.warn('setPanelBehavior:', err));
