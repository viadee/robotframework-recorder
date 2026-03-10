// Side panel — opens instantly on icon click (persistent setting)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(err => console.warn('setPanelBehavior:', err));

// Background message handler (record, stop, scan, etc.)
import './background.js';

// Context menus
import { createContextMenus, handleContextMenuClick } from './context-menu.js';

chrome.runtime.onInstalled.addListener(() => createContextMenus());
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
