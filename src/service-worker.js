// Side panel — opens instantly on icon click (persistent setting)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(err => console.warn('setPanelBehavior:', err));

// Background message handler (record, stop, scan, etc.)
import './background.js';
