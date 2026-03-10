// Background must be imported statically — Chrome MV3 requires
// event listeners (onMessage) to be registered synchronously at top level.
// ES module imports are hoisted, so this runs first regardless of position.
import './background.js';

// Side panel config — these are persistent, Chrome remembers them.
// Runs after imports but still during SW initialization.
chrome.sidePanel.setOptions({ path: 'src/popup.html', enabled: true })
  .catch(err => console.warn('sidePanel.setOptions failed:', err));
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(err => console.warn('setPanelBehavior failed:', err));

// Context menus only need to be created on install/update (they persist)
chrome.runtime.onInstalled.addListener(async () => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(err => console.warn('setPanelBehavior onInstalled:', err));
  const { createContextMenus } = await import('./context-menu.js');
  createContextMenus();
});

// Lazy-load context menu handler only when user actually clicks a menu item
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { handleContextMenuClick } = await import('./context-menu.js');
  handleContextMenuClick(info, tab);
});
