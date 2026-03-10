import './constants.js';
import './translator/robot-translator.js';
import './background.js';
import {
  createContextMenus, handleContextMenuClick
} from './context-menu.js';

// Ensure side panel is configured on every SW startup
// TEMP: using test-panel.html to debug blank panel issue
chrome.sidePanel.setOptions({ path: 'src/test-panel.html', enabled: true })
  .catch(err => console.warn('sidePanel.setOptions failed:', err));

// Tell Chrome to open the side panel immediately on icon click (native, no SW delay)
// This is a persistent setting — Chrome remembers it even after SW terminates
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(err => console.warn('setPanelBehavior failed:', err));

// Also set it on install to guarantee it's configured from the start
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(err => console.warn('setPanelBehavior onInstalled failed:', err));
});

// Set up context menus
createContextMenus();
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
