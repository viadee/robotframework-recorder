import './constants.js';
import './translator/robot-translator.js';
import './background.js';
import {
  createContextMenus, handleContextMenuClick
} from './context-menu.js';

// Open side panel when extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(err => console.warn('setPanelBehavior failed:', err));

// Fallback: if setPanelBehavior didn't register in time, handle click explicitly
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (err) {
    // open() may fail if panel is already open or not supported — ignore
    console.warn('sidePanel.open fallback:', err);
  }
});

// Set up context menus
createContextMenus();
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
