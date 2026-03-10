import './constants.js';
import './translator/robot-translator.js';
import './background.js';
import {
  createContextMenus, handleContextMenuClick
} from './context-menu.js';

// Ensure side panel path is set on install and SW startup
chrome.sidePanel.setOptions({ path: 'src/popup.html', enabled: true })
  .catch(err => console.warn('sidePanel.setOptions failed:', err));

// Open side panel on extension icon click (explicit, more reliable than openPanelOnActionClick)
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (err) {
    console.warn('sidePanel.open:', err);
  }
});

// Set up context menus
createContextMenus();
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
