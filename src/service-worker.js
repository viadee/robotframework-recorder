import './constants.js';
import './translator/robot-translator.js';
import './background.js';
import {
  createContextMenus, handleContextMenuClick
} from './context-menu.js';

// Open side panel when extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Set up context menus
createContextMenus();
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
