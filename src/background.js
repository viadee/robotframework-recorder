/**
 * Background service worker for RobotFramework Recorder.
 *
 * Architecture:
 * - Message handlers are registered in a handler map for clean dispatch.
 * - All mutable state is synced to chrome.storage after every mutation,
 *   so it survives service worker termination/restart.
 * - Every handler returns a response object for consistency.
 */

import {
  logo, filename, statusMessage, instruction, DEFAULT_TARGET, DEFAULT_SYNTAX
} from './constants.js';

import { initializeTranslator } from './translator/robot-translator.js';
import logger from './logger.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INFO_URL = 'https://github.com/viadee/robotframework-recorder';
const MAX_ACTIONS = 5000;
const storage = chrome.storage.local;

// ---------------------------------------------------------------------------
// Mutable state — always kept in sync with chrome.storage via saveState()
// ---------------------------------------------------------------------------

let list = [];
let script;
let recordTab = 0;
let demo = false;
let verify = false;
let target = DEFAULT_TARGET;
let syntax = DEFAULT_SYNTAX;

// ---------------------------------------------------------------------------
// State persistence
// ---------------------------------------------------------------------------

/** Restore mutable state from chrome.storage (called on service worker wake). */
async function loadState() {
  const saved = await storage.get({
    list: [],
    recordTab: 0,
    demo: false,
    verify: false,
    target: DEFAULT_TARGET,
    syntax: DEFAULT_SYNTAX,
  });
  list = saved.list;
  recordTab = saved.recordTab;
  demo = saved.demo;
  verify = saved.verify;
  target = saved.target;
  syntax = saved.syntax;
  logger.info('State loaded:', { list: list.length, recordTab, demo, verify, target, syntax });
}

/** Persist mutable state to chrome.storage. Call after every mutation. */
async function saveState() {
  await storage.set({ list, recordTab, demo, verify, target, syntax });
  logger.info('State saved');
}

/** Set storage defaults for first install. */
async function setupStorageDefaults() {
  const defaults = {
    locators: ['for', 'name', 'id', 'title', 'href', 'class'],
    operation: 'stop',
    message: instruction,
    demo: false,
    verify: false,
    canSave: false,
    isBusy: false,
    target: DEFAULT_TARGET,
    syntax: DEFAULT_SYNTAX,
  };

  const existing = await storage.get(Object.keys(defaults));
  const toInit = {};
  for (const [key, value] of Object.entries(defaults)) {
    if (existing[key] === undefined) toInit[key] = value;
  }
  if (Object.keys(toInit).length > 0) {
    await storage.set(toInit);
    logger.info('Storage initialized with defaults:', toInit);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function handleError(error) {
  const lastError = chrome.runtime.lastError;
  const message = (lastError && lastError.message) || (error && error.message) || String(error);
  console.error('RF Recorder error:', message, error);
  storage.set({ message: statusMessage.failure, canSave: false });
}

/** Send a message to a content script tab, returning a promise. */
function contentSendMessage(tabId, msg) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, msg, (response) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(response);
    });
  });
}

/** Safely send a message to the content script, logging errors. */
async function sendToContent(tabId, msg) {
  try {
    const response = await contentSendMessage(tabId, msg);
    logger.info('Content script response:', response);
    return response;
  } catch (err) {
    handleError(err);
    return null;
  }
}

/** Get the active tab, falling back to sender tab. */
async function resolveActiveTab(sender) {
  const [activeTab] = await chrome.tabs.query({ active: true });
  return activeTab ?? sender?.tab ?? null;
}

/** Append an action item to the list with dedup logic. */
async function appendAction(item) {
  const prev = list[list.length - 1];
  const shouldReplace = item.trigger === 'change' && prev?.trigger === 'click';
  const timeGapOk = !prev || Math.abs(item.time - prev.time) > 20;

  if (shouldReplace) {
    list[list.length - 1] = item;
  } else if (!prev || timeGapOk || item.trigger !== 'click') {
    list.push(item);
  }

  await saveState();
}

// ---------------------------------------------------------------------------
// Message handlers — each receives { message, sender, tab, translator }
// and returns a response object.
// ---------------------------------------------------------------------------

async function handleRecord({ tab }) {
  list = [{
    type: 'url', path: tab.url, time: 0, trigger: 'record', title: tab.title,
  }];
  await saveState();

  chrome.action.setIcon({ path: logo.record });
  await storage.set({ message: statusMessage.record, operation: 'record', canSave: false });

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/content.js'],
    });
    logger.info('content.js injected into', tab.url);
  } catch (err) {
    logger.error('Injection failed:', err);
  }

  await sendToContent(tab.id, { operation: 'record' });
  return { ok: true };
}

async function handlePause({ tab }) {
  chrome.action.setIcon({ path: logo.pause });
  await sendToContent(tab.id, { operation: 'stop' });
  await storage.set({ operation: 'pause', canSave: false, isBusy: false });
  return { ok: true };
}

async function handleResume({ tab }) {
  chrome.action.setIcon({ path: logo.record });
  await sendToContent(tab.id, { operation: 'record' });
  await storage.set({ message: statusMessage.record, operation: 'record', canSave: false });
  return { ok: true };
}

async function handleScan({ message, tab }) {
  if (!tab) {
    await storage.set({
      message: statusMessage.failedScan, operation: 'scan', canSave: false, isBusy: false,
    });
    return { ok: false, error: 'No active tab' };
  }

  list = [{
    type: 'url', path: tab.url, time: 0, trigger: 'scan', title: tab.title,
  }];
  await saveState();

  await storage.set({
    message: statusMessage.scan, operation: 'scan', canSave: false, isBusy: true,
  });

  await sendToContent(tab.id, { operation: 'scan', locators: message.locators });
  return { ok: true };
}

async function handleStop({ tab, translator }) {
  chrome.action.setIcon({ path: logo.stop });

  script = translator.generateOutput(list, MAX_ACTIONS, demo, verify);

  if (script) {
    await storage.set({
      message: statusMessage.succesfulRecord, script, operation: 'stop', canSave: true,
    });
  } else {
    await storage.set({
      message: statusMessage.failedRecord, operation: 'stop', canSave: false,
    });
  }

  await sendToContent(tab.id, { operation: 'stop' });
  return { ok: true, hasScript: !!script };
}

async function handleSave({ translator, sendResponse }) {
  try {
    const file = translator.generateFile(list, MAX_ACTIONS, demo, verify);
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
  // Return null to signal "don't call sendResponse from dispatcher"
  return null;
}

async function handleSettings({ message }) {
  ({ demo, verify, target, syntax } = message);
  await saveState();
  await storage.set({ demo, verify, target, syntax });
  return { ok: true };
}

async function handleLoad({ sender }) {
  const state = await storage.get({ operation: 'stop', locators: [] });
  await sendToContent(sender.tab.id, {
    operation: state.operation, locators: state.locators,
  });
  return { ok: true };
}

async function handleInfo() {
  chrome.tabs.create({ url: INFO_URL });
  return { ok: true };
}

async function handleAppend({ message, translator }) {
  await appendAction(message.script);
  // Generate live script preview so the side panel shows actions in real-time
  script = translator.generateOutput(list, MAX_ACTIONS, demo, verify);
  await storage.set({ script });
  chrome.action.setIcon({ path: logo.action });
  setTimeout(() => chrome.action.setIcon({ path: logo.record }), 1000);
  return { ok: true };
}

async function handleAction({ message, translator }) {
  chrome.action.setIcon({ path: logo.stop });
  list = list.concat(message.scripts);
  await saveState();

  script = translator.generateOutput(list, MAX_ACTIONS, demo, verify);
  await storage.set({
    message: statusMessage.idle, script, operation: 'stop', isBusy: false, canSave: true,
  });
  return { ok: true };
}

async function handleClearScript() {
  list = [];
  await saveState();
  await storage.set({ message: 'Cleared', canSave: false });
  await storage.remove('script');
  return { ok: true };
}

async function handleXpathValidate({ message, tab }) {
  await sendToContent(tab.id, { operation: 'xpath-validate', xpath: message.xpath });
  return { ok: true };
}

async function handleDisplay({ message }) {
  await storage.set({ message: message.message });
  return { ok: true };
}

async function handleOpenActionsView() {
  try {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/actions-view.html') });
  } catch (err) {
    logger.warn('Could not open actions view:', err);
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Handler registry
// ---------------------------------------------------------------------------

const handlers = {
  record: handleRecord,
  pause: handlePause,
  resume: handleResume,
  scan: handleScan,
  stop: handleStop,
  save: handleSave,
  settings: handleSettings,
  load: handleLoad,
  info: handleInfo,
  append: handleAppend,
  action: handleAction,
  'clear-script': handleClearScript,
  'xpath-validate': handleXpathValidate,
  display: handleDisplay,
  'open-actions-view': handleOpenActionsView,
};

// ---------------------------------------------------------------------------
// Message dispatcher
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      // Resolve active tab — but don't overwrite recordTab with extension pages
      const tab = await resolveActiveTab(sender);
      const isExtensionTab = tab?.url?.startsWith('chrome-extension://');
      if (tab && !isExtensionTab) {
        recordTab = tab;
      } else if (sender.tab && !sender.tab.url?.startsWith('chrome-extension://')) {
        recordTab = sender.tab;
      }

      // Initialize translator with current settings
      const items = await storage.get({ target: DEFAULT_TARGET, syntax: DEFAULT_SYNTAX });
      const translator = initializeTranslator(items.target, items.syntax);

      const { operation } = message;
      logger.debug('Received:', operation, message);

      const handler = handlers[operation];
      if (!handler) {
        logger.warn('Unknown operation:', operation);
        sendResponse({ ok: false, error: `Unknown operation: ${operation}` });
        return;
      }

      const result = await handler({ message, sender, tab: recordTab, translator, sendResponse });

      // null result means handler called sendResponse itself (e.g. save)
      if (result !== null) {
        sendResponse(result);
      }
    } catch (error) {
      logger.error('Message handler error:', error);
      sendResponse({ ok: false, error: error.message });
    }
  })();

  // Keep the message channel open for async response
  return true;
});

// ---------------------------------------------------------------------------
// Initialization (runs on service worker start/restart)
// ---------------------------------------------------------------------------

(async () => {
  await setupStorageDefaults();
  await loadState();
})();
