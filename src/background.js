/* global chrome URL Blob */
/* global instruction filename statusMessage url tab logo initializeTranslator */

import {
  url, logo, filename, statusMessage, instruction
} from './constants.js';

import { initializeTranslator } from './translator/robot-translator.js';
import logger from './logger.js';

const host = chrome;

let list = [];
let script;
const storage = host.storage.local;
const content = host.tabs;
const icon = host.action;
const maxLength = 5000;
let recordTab = 0;
let demo = false;
let verify = false;
let target = 'SeleniumLibrary';
let syntax = 'rpa';

async function setupStorageDefaults() {
  const defaults = {
    locators: ['for', 'name', 'id', 'title', 'href', 'class'],
    operation: 'stop',
    message: instruction,
    demo: false,
    verify: false,
    canSave: false,
    isBusy: false,
    target: 'SeleniumLibrary'
  };

  const existing = await chrome.storage.local.get(Object.keys(defaults));
  const toInit = {};

  for (const [key, value] of Object.entries(defaults)) {
    if (existing[key] === undefined) {
      toInit[key] = value;
    }
  }
  if (Object.keys(toInit).length > 0) {
    await chrome.storage.local.set(toInit);
    logger.info('Storage initialized with defaults:', toInit);
  } else {
    logger.info('Storage already initialized');
  }
}

async function initState() {
  const saved = await chrome.storage.local.get({
    list: [],
    recordTab: 0,
    demo: false,
    verify: false
  });
  Object.assign({
    list, recordTab, demo, verify
  }, saved);
  list = saved.list;
  recordTab = saved.recordTab;
  demo = saved.demo;
  verify = saved.verify;
  logger.info('State loaded:', {
    list, recordTab, demo, verify
  });
}

async function saveState() {
  await chrome.storage.local.set({
    list, recordTab, demo, verify
  });
  logger.info('State saved');
}

(async () => {
  await setupStorageDefaults();
  await initState();
})();

async function selection(item) {
  const prevItem = list[list.length - 1];
  const shouldReplace = item.trigger === 'change' && prevItem && prevItem.trigger === 'click';
  const timeGapOkay = !prevItem || Math.abs(item.time - prevItem.time) > 20;

  if (shouldReplace) {
    list[list.length - 1] = item;
  } else if (!prevItem || timeGapOkay || item.trigger !== 'click') {
    list.push(item);
  }

  await saveState();
}

// Using centralized logger imported above

function handleError(error) {
  const lastError = host.runtime.lastError;
  const message = (lastError && lastError.message) || (error && error.message) || String(error);
  logger.debug('Chrome/API error:', message);
  storage.set({ message: statusMessage.failure, canSave: false });
}

function contentSendMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    content.sendMessage(tabId, message, (response) => {
      if (host.runtime && host.runtime.lastError) reject(host.runtime.lastError);
      else resolve(response);
    });
  });
}

host.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  recordTab = sender.tab || message.recordTab || recordTab;
  const [tab] = await content.query({ active: true });
  if (tab !== null && tab !== undefined) {
    recordTab = tab;
  } else if (sender.tab) {
    recordTab = sender.tab;
  }
  try {
    const items = await storage.get(['target', 'syntax']);
    const translator = initializeTranslator(items.target, items.syntax);
    let { operation } = message;
    logger.debug(message);

    if (operation === 'record') {
      list = [];
      icon.setIcon({ path: logo[operation] });

      list = [{
        type: 'url', path: recordTab.url, time: 0, trigger: 'record', title: recordTab.title
      }];
      await saveState();
      storage.set({ message: statusMessage.record, operation: 'record', canSave: false });

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content.js']
        });
        logger.info('content.js injected into', tab.url);
      } catch (err) {
        logger.error('Injection failed:', err);
      }

      // FIXME: just passing handleError does not work. Need some advanced solution.
      try {
        const response = await contentSendMessage(recordTab.id, { operation });
        logger.info('Response from the content script:', response);
      } catch (err) {
        handleError(err);
      }
    } else if (operation === 'pause') {
      icon.setIcon({ path: logo.pause });

      try {
        const response = await contentSendMessage(recordTab.id, { operation: 'stop' });
        logger.info('Response from the content script:', response);
      } catch (err) {
        handleError(err);
      }

      storage.set({ operation: 'pause', canSave: false, isBusy: false });
    } else if (operation === 'resume') {
      operation = 'record';

      icon.setIcon({ path: logo.record });

      try {
        const response = await contentSendMessage(recordTab.id, { operation });
        logger.info('Response from the content script:', response);
      } catch (err) {
        handleError(err);
      }

      storage.set({ message: statusMessage.record, operation, canSave: false });
    } else if (operation === 'scan') {
      if (recordTab) {
        list = [{
          type: 'url', path: recordTab.url, time: 0, trigger: 'scan', title: recordTab.title
        }];
        await saveState();
        // TODO: message.locators should be set here
        await storage.set({
          message: statusMessage.scan,
          operation: 'scan',
          canSave: false,
          isBusy: true
        });

        try {
          const response = await contentSendMessage(recordTab.id, { operation, locators: message.locators });
          logger.info('Response from the content script:', response);
        } catch (error) {
          handleError(error);
        }
      } else {
        await storage.set({
          message: statusMessage.failedScan, operation: 'scan', canSave: false, isBusy: false
        });
      }
    } else if (operation === 'stop') {
      icon.setIcon({ path: logo[operation] });

      script = translator.generateOutput(list, maxLength, demo, verify);
      if (script) {
        await storage.set({
          message: statusMessage.succesfulRecord, script, operation: 'stop', canSave: true
        });

        try {
          const response = await contentSendMessage(recordTab.id, { operation: 'stop' });
          logger.info('Response from the content script:', response);
        } catch (error) {
          handleError(error);
        }
      } else {
        await storage.set({ message: statusMessage.failedRecord, operation, canSave: false });
        try {
          const response = await contentSendMessage(recordTab.id, { operation: 'stop' });
          logger.info('Response from the content script:', response);
        } catch (error) {
          handleError(error);
        }
      }
    } else if (operation === 'save') {
      (async () => {
        try {
          const file = translator.generateFile(list, maxLength, demo, verify);
          logger.debug(file);
          const blob = new Blob([file], { type: 'text/plain;charset=utf-8' });
          const reader = new FileReader();
          reader.onload = () => {
            chrome.downloads.download({ url: reader.result, filename });
            sendResponse({ ok: true });
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          sendResponse({ ok: false, error: err.message });
        }
      })();
      return true;
    } else if (operation === 'settings') {
      ({
        demo, verify, target, syntax
      } = message);
      storage.set({
        demo, verify, target, syntax
      });
    } else if (operation === 'load') {
      // TODO: this is what causes scan to run after page is refreshed
      // TODO: ensure state.locators has a value
      const state = await storage.get({
        operation: 'stop',
        locators: []
      });

      try {
        const response = await contentSendMessage(sender.tab.id,
          { operation: state.operation, locators: state.locators });
        logger.info('Response from the content script:', response);
      } catch (error) {
        handleError(error);
      }
    } else if (operation === 'info') {
      host.tabs.create({ url });
    } else if (operation === 'append') {
      selection(message.script);
      icon.setIcon({ path: logo.action });
      setTimeout(() => { icon.setIcon({ path: logo.record }); }, 1000);
    } else if (operation === 'action') {
      icon.setIcon({ path: logo.stop });
      list = list.concat(message.scripts);
      await saveState();
      script = translator.generateOutput(list, maxLength, demo, verify);

      await storage.set({
        message: statusMessage.idle, script, operation: 'stop', isBusy: false, canSave: true
      });
    } else if (operation === 'clear-script') {
      list = [];
      await saveState();
      await storage.set({ message: 'Cleared', canSave: false });
      await storage.remove('script');
    } else if (operation === 'xpath-validate') {
      try {
        const response = await contentSendMessage(recordTab.id, { operation: 'xpath-validate', xpath: message.xpath });
        logger.info('Response from the content script:', response);
      } catch (error) {
        handleError(error);
      }
    } else if (operation === 'display') {
      await storage.set({ message: message.message });
    } else if (operation === 'open-actions-view') {
      // Open a dedicated Actions Viewer page in a new tab (uses extension page context)
      try {
        host.tabs.create({ url: chrome.runtime.getURL('src/actions-view.html') });
      } catch (err) {
        logger.warn('Could not open actions view:', err);
      }
    }
    // https://github.com/mozilla/webextension-polyfill/issues/130 lets chrome now that our callback succeeded
    sendResponse({});
  } catch (error) {
    logger.error('Error reading from storage:', error);
    sendResponse({});
  }
  return true;
});
