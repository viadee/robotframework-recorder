// Side panel config — runs first, before heavy module init.
// These are persistent settings Chrome remembers across SW restarts.
chrome.sidePanel.setOptions({ path: 'src/popup.html', enabled: true })
  .catch(err => console.warn('sidePanel.setOptions failed:', err));
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(err => console.warn('setPanelBehavior failed:', err));

// Static imports (required — dynamic import() is banned in SW)
import './background.js';
import {
  createContextMenus, handleContextMenuClick
} from './context-menu.js';

// Context menus persist — only recreate on install/update
chrome.runtime.onInstalled.addListener(() => {
  createContextMenus();
});

chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
