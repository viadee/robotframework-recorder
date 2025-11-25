/* global document chrome IntroTour t getCurrentLanguage setLanguage */
import logger from './logger.js';

const debug = false;
const host = chrome;
const storage = host.storage.local;

let currentLanguage = 'en';
let introTour = null;
// Line-based script model: each line is { id, text }
let scriptLines = [];
let nextLineId = 1;

function analytics(_) {}

// use centralized logger (imported above)

const copyStatus = (className) => {
  const copyButton = document.getElementById('copy');
  if (!copyButton) {
    logger.debug('copyStatus: copy button not found');
    return;
  }
  copyButton.classList.add(className);
  setTimeout(() => { if (copyButton) copyButton.classList.remove(className); }, 3000);
};

/**
 * Copy script output to clipboard using native Clipboard API
 */
async function copyToClipboard() {
  try {
    const scriptOutput = scriptLines.map(l => l.text).join('\n');
    await navigator.clipboard.writeText(scriptOutput);
    copyStatus('copy-ok');
    analytics(['_trackEvent', 'copy', 'ok']);
  } catch (err) {
    copyStatus('copy-fail');
    analytics(['_trackEvent', 'copy', 'nok']);
    logger.error('Copy failed:', err);
  }
}
/* eslint-disable no-use-before-define */
// Helpers for line-based script model
function getTextFromScriptLines() {
  return scriptLines.map(l => l.text).join('\n');
}

function moveLine(index, delta) {
  const to = index + delta;
  if (to < 0 || to >= scriptLines.length) return;
  const [item] = scriptLines.splice(index, 1);
  scriptLines.splice(to, 0, item);
  storage.set({ script: getTextFromScriptLines() });
  renderScriptLines();
}

function deleteLine(index) {
  scriptLines.splice(index, 1);
  storage.set({ script: getTextFromScriptLines() });
  renderScriptLines();
}

function addLine(afterIndex = scriptLines.length) {
  const newLine = { id: nextLineId++, text: '' };
  scriptLines.splice(afterIndex, 0, newLine);
  storage.set({ script: getTextFromScriptLines() });
  renderScriptLines();
}
/* eslint-enable no-use-before-define */

function renderScriptLines() {
  const container = document.getElementById('script-lines');
  if (!container) return;
  container.innerHTML = '';
  scriptLines.forEach((line, index) => {
    const row = document.createElement('div');
    row.className = 'script-line-row';
    row.dataset.lineId = String(line.id);

    const indexSpan = document.createElement('span');
    indexSpan.className = 'script-line-index';
    indexSpan.textContent = String(index + 1);

    const input = document.createElement('input');
    input.className = 'script-line-input';
    input.value = line.text;
    // Make popup inputs read-only: editing happens in Actions-View
    input.readOnly = true;

    const controls = document.createElement('div');
    controls.className = 'script-line-controls';

    const up = document.createElement('button');
    up.className = 'btn btn-small';
    up.textContent = '↑';
    up.title = 'Move up';
    up.addEventListener('click', () => moveLine(index, -1));

    const down = document.createElement('button');
    down.className = 'btn btn-small';
    down.textContent = '↓';
    down.title = 'Move down';
    down.addEventListener('click', () => moveLine(index, 1));

    const del = document.createElement('button');
    del.className = 'btn btn-small btn-danger';
    del.textContent = '✕';
    del.title = 'Delete line';
    del.addEventListener('click', () => deleteLine(index));

    controls.appendChild(up);
    controls.appendChild(down);
    controls.appendChild(del);

    row.appendChild(indexSpan);
    row.appendChild(input);
    row.appendChild(controls);

    container.appendChild(row);
  });
}

function updateValueByMessage(elementId, message) {
  if (message || message === '') {
    const field = document.querySelector(elementId);
    if (elementId === '#script-output' || elementId === '#script-lines') {
      // Set internal model and render
      const raw = message === null || message === undefined ? '' : message.toString();
      scriptLines = raw.split('\n').map(ln => ({ id: nextLineId++, text: ln }));
      renderScriptLines();
    } else {
      field.innerText = message.toString();
    }
  } else {
    logger.debug(`Tried to update value of ${elementId} by ${message}`);
  }
}

function displayScript(message) {
  updateValueByMessage('#script-lines', message);
}
function displayStatus(message) {
  updateValueByMessage('#status-field', message);
}


function show(ids, visible) {
  const elements = ids.map(id => document.getElementById(id));

  elements.forEach((elem) => {
    if (elem) visible ? elem.classList.remove('hidden') : elem.classList.add('hidden');
    else logger.debug('Tried to toggle visibility of non-existent element');
  });
}

function hide(array) {
  show(array, false);
}

function enable(array, isEnabled) {
  array.forEach((id) => {
    const element = document.getElementById(id);
    if (!element) {
      logger.debug(`enable: element ${id} not found`);
      return;
    }
    if (isEnabled) element.classList.remove('disabled'); else element.classList.add('disabled');
  });
}

function toggleHidden(id) {
  const el = document.getElementById(id);
  if (!el) {
    logger.debug(`toggleHidden: element ${id} not found`);
    return;
  }
  el.classList.toggle('hidden');
}

function setActive(id) {
  const el = document.getElementById(id);
  if (!el) {
    logger.debug(`setActive: element ${id} not found`);
    return;
  }
  el.classList.add('btn-active');
}

function setInactive(array) {
  array.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) {
      logger.debug(`setInactive: element ${id} not found`);
      return;
    }
    el.classList.remove('btn-active');
  });
}

function toggle(e) {
  logger.debug(e.target.id);
  // Hide all buttons by default and explicitly show buttons to show
  // Except when the button is clear-script or copy (they do not change the "operating mode")
  if (!['clear-script', 'copy'].includes(e.target.id)) {
    hide(['record', 'scan', 'pause', 'xpath-console', 'resume', 'stop', 'script-container']);
    enable(['settings-panel'], false);
  }

  if (e.target.id === 'pause') {
    show(['resume', 'stop'], true);
  } else if (e.target.id === 'resume' || e.target.id === 'record') {
    show(['pause', 'stop', 'status-field'], true);
    hide(['settings-panel', 'xpath-inputs'], true);
    setInactive(['xpath-console', 'settings', 'scan']);
  } else if (e.target.id === 'stop' || e.target.id === 'save') {
    show(['record', 'scan', 'xpath-console', 'status-field', 'script-container'], true);
    hide(['xpath-inputs', 'settings-panel'], true);
    setInactive(['xpath-console', 'settings', 'scan']);
  } else if (e.target.id === 'settings') {
    show(['record', 'scan', 'xpath-console', 'settings-panel'], true);
    hide(['script-container', 'xpath-inputs', 'status-field'], true);
    setActive('settings');
    setInactive(['scan', 'xpath-console']);
  } else if (e.target.id === 'xpath-console') {
    show(['record', 'scan', 'xpath-console', 'xpath-inputs', 'status-field'], true);
    hide(['settings-panel']);
    setInactive(['settings', 'scan']);
    setActive('xpath-console');
  } else if (e.target.id === 'scan') {
    show(['record', 'scan', 'xpath-console', 'status-field', 'script-container'], true);
    hide(['xpath-inputs', 'settings-panel'], true);
    setActive('scan');
    setInactive(['xpath-console', 'settings']);
  }

  if ((e.canSave === false) || (e.target.id === 'record') || (e.target.id === 'clear-script')) {
    document.getElementById('save').disabled = true;
    document.getElementById('copy').disabled = true;
  } else if (e.target.id === 'scan' || e.target.id === 'stop') {
    document.getElementById('save').disabled = false;
    document.getElementById('copy').disabled = false;
  }
  if (e.demo) { document.getElementById('demo').checked = e.demo === true; }
  if (e.verify) { document.getElementById('verify').checked = e.verify === true; }

  if (e.library_target) {
    const rfbrowserSelected = e.library_target === 'Browser';
    document.getElementById('target_rfbrowser').checked = rfbrowserSelected;
    document.getElementById('target_seleniumlibrary').checked = !rfbrowserSelected;
  }
  if (e.syntax) {
    const rpaSelected = e.syntax === 'rpa';
    document.getElementById('syntax_rpa').checked = rpaSelected;
    document.getElementById('syntax_testing').checked = !rpaSelected;
  }
}

function busy(e) {
  if ((e.isBusy === true) || (e.isBusy === false)) {
    ['scan', 'record', 'stop', 'save', 'save', 'copy', 'resume'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) {
        logger.debug(`busy: element ${id} not found`);
        return;
      }
      el.disabled = e.isBusy;
    });
  }
}

function runtimeSendMessage(message, retries = 3, delay = 500) {
  return new Promise((resolve, reject) => {
    const attempt = (retriesLeft) => {
      host.runtime.sendMessage(message, (response) => {
        if (host.runtime && host.runtime.lastError) {
          const error = host.runtime.lastError;

          // Retry on connection errors
          if (retriesLeft > 0 && error.message.includes('message port closed')) {
            logger.debug(`Retry (${retries - retriesLeft + 1}/${retries}):`, error.message);
            setTimeout(() => attempt(retriesLeft - 1), delay);
            return;
          }

          reject(error);
        } else {
          resolve(response);
        }
      });
    };
    attempt(retries - 1);
  });
}


async function operation(e) {
  toggle(e);
  try {
    const resp = await runtimeSendMessage({ operation: e.target.id });
    // FIXME: change in displayStatus signature is reason why now status sometimes shows Object object.
    // Go back to old signature or figure out other way around
    displayStatus(resp);
  } catch (err) {
    const errorMsg = err && (err.message || JSON.stringify(err));
    const portClosedPatterns = ['message port closed', 'The message port closed before a response was received'];
    const isPortClosed = errorMsg && portClosedPatterns.some(p => errorMsg.includes(p));
    if (isPortClosed) {
      // Don't show this common service-worker disconnect error to the user.
      // Log a warning with stack trace for debugging instead.
      const stackOrErr = err && err.stack ? err.stack : err;
      const warnMsg = `Runtime connection closed during operation ${e.target.id}:`;
      logger.warn(warnMsg, stackOrErr);
    } else {
      logger.error(`operation error (${e.target.id}):`, errorMsg);
      displayStatus(`Error: ${errorMsg}`);
    }
  }
  analytics(['_trackEvent', e.target.id, '^-^']);
}

async function xpathValidate(event) {
  const xpath = document.getElementById('textinput-xpath').value;
  try {
    const response = await runtimeSendMessage({ operation: 'xpath-validate', xpath });
    logger.info('XPath validation response:', response);
  } catch (err) {
    const errorMsg = err && (err.message || JSON.stringify(err));
    const portClosedPatterns = ['message port closed', 'The message port closed before a response was received'];
    const isPortClosed = errorMsg && portClosedPatterns.some(p => errorMsg.includes(p));
    if (isPortClosed) {
      const stackOrErr = err && err.stack ? err.stack : err;
      logger.warn('Runtime connection closed during xpath-validate:', stackOrErr);
    } else {
      logger.error('xpath-validate error:', errorMsg);
    }
  }
}

async function updateSettings(e) {
  const demo = document.getElementById('demo').checked;
  const verify = document.getElementById('verify').checked;
  const rfbrowserRadio = document.getElementById('target_rfbrowser');
  const rpaSyntax = document.getElementById('syntax_rpa');
  const target = rfbrowserRadio.checked
    ? 'Browser'
    : 'SeleniumLibrary';
  const syntax = rpaSyntax.checked
    ? 'rpa'
    : 'testing';

  try {
    const response = await runtimeSendMessage({
      operation: 'settings', demo, verify, target, syntax
    });
    logger.info('Settings updated:', response);
  } catch (err) {
    const errorMsg = err && (err.message || JSON.stringify(err));
    const portClosedPatterns = ['message port closed', 'The message port closed before a response was received'];
    const isPortClosed = errorMsg && portClosedPatterns.some(p => errorMsg.includes(p));
    if (isPortClosed) {
      const stackOrErr = err && err.stack ? err.stack : err;
      logger.warn('Runtime connection closed during settings update:', stackOrErr);
    } else {
      logger.error('settings error:', errorMsg);
    }
  }

  analytics(['_trackEvent', 'setting', e.target.id]);
}

function info(e) {
  if (introTour) {
    introTour.toggle();
  }
}

/**
 * Update all UI elements with translations for the given language
 */
function updateUITranslations(language) {
  // Buttons
  document.getElementById('record').textContent = t('record', language);
  document.getElementById('stop').textContent = t('stop', language);
  document.getElementById('resume').textContent = t('resume', language);
  document.getElementById('pause').textContent = t('pause', language);
  document.getElementById('scan').textContent = t('scanPage', language);
  document.getElementById('xpath-console').textContent = t('validateXPath', language);
  document.getElementById('copy').textContent = t('copy', language);
  document.getElementById('save').textContent = t('download', language);
  document.getElementById('clear-script').textContent = t('clear', language);
  // Add-line button
  const addBtn = document.getElementById('add-line');
  if (addBtn) {
    addBtn.textContent = t('addLine', language);
    addBtn.title = t('addLineTitle', language);
  }

  // Titles
  document.getElementById('record').title = t('recordTitle', language);
  document.getElementById('stop').title = t('stopTitle', language);
  document.getElementById('resume').title = t('resumeTitle', language);
  document.getElementById('pause').title = t('pauseTitle', language);
  document.getElementById('scan').title = t('scanPageTitle', language);
  document.getElementById('xpath-console').title = t('validateXPathTitle', language);
  document.getElementById('info').title = t('infoTitle', language);
  document.getElementById('settings').title = t('settingsTitle', language);
  document.getElementById('copy').title = t('copyTitle', language);
  document.getElementById('save').title = t('downloadTitle', language);
  document.getElementById('clear-script').title = t('clearTitle', language);

  // Data-intro
  document.getElementById('record').setAttribute('data-intro', t('recordIntro', language));
  document.getElementById('scan').setAttribute('data-intro', t('scanIntro', language));
  document.getElementById('xpath-console').setAttribute('data-intro', t('xpathIntro', language));
  document.getElementById('settings').setAttribute('data-intro', t('settingsIntro', language));

  // Placeholder
  document.getElementById('textinput-xpath').placeholder = t('xpathPlaceholder', language);

  // Settings Panel
  document.getElementById('language-label').textContent = t('language', language);
  document.getElementById('target-library-label').textContent = t('targetLibrary', language);
  document.getElementById('selenium-label').textContent = t('selenium', language);
  document.getElementById('rfbrowser-label').textContent = t('rfBrowser', language);
  document.getElementById('target-syntax-label').textContent = t('targetSyntax', language);
  document.getElementById('rpa-label').textContent = t('rpa', language);
  document.getElementById('test-automation-label').textContent = t('testAutomation', language);
  document.getElementById('advanced-settings-label').textContent = t('advancedSettings', language);
  document.getElementById('demo-label').textContent = t('addSleep', language);
  document.getElementById('verify-label').textContent = t('checkPageContains', language);
}

/**
 * Handle language change
 */
async function changeLanguage(e) {
  const newLanguage = e.target.value;
  currentLanguage = newLanguage;
  setLanguage(newLanguage);
  updateUITranslations(newLanguage);
  analytics(['_trackEvent', 'language', newLanguage]);
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load current language
    currentLanguage = await getCurrentLanguage();

    const state = await storage.get({
      message: 'Record or Scan',
      operation: 'idle',
      canSave: false,
      isBusy: false,
      demo: false,
      verify: false,
      target: 'Browser',
      syntax: 'rpa',
      locators: [],
      script: '',
    });

    // Update default message with translation
    if (state.message === 'Record or Scan') {
      state.message = t('recordOrScan', currentLanguage);
    }

    displayStatus(state.message);
    displayScript(state.script);

    // Update UI translations
    updateUITranslations(currentLanguage);

    // Set language radio button
    document.getElementById(`lang_${currentLanguage}`).checked = true;

    // Prevent showing settings panel automatically on load if persisted as 'settings'
    const initialOperation = state.operation === 'settings' ? 'idle' : state.operation;
    // FIXME: rename target to current operation and toggle's first param to `state` instead of `e`
    toggle({
      target: { id: initialOperation },
      canSave: state.canSave,
      isBusy: state.isBusy,
      demo: state.demo,
      verify: state.verify,
      library_target: state.target,
      syntax: state.syntax,
    });

    // Ensure settings panel is hidden on initial load regardless
    hide(['settings-panel']);

    debug ? document.getElementById('textarea-log').classList.remove('hidden') : 0;

    [
      'record',
      'resume',
      'stop',
      'pause',
      'save',
      'scan',
      'xpath-console',
      'settings',
      'clear-script',
    ].forEach((id) => {
      document.getElementById(id).addEventListener('click', operation);
    });

    // Copy button uses native clipboard API
    document.getElementById('copy').addEventListener('click', copyToClipboard);

    ['demo', 'verify'].forEach((id) => {
      document.getElementById(id).addEventListener('change', updateSettings);
    });

    ['target', 'syntax'].forEach((cls) => {
      Array.from(document.getElementsByClassName(cls))
        .forEach(elem => elem.addEventListener('change', updateSettings));
    });

    // Language change event listener
    Array.from(document.getElementsByClassName('language-option'))
      .forEach(elem => elem.addEventListener('change', changeLanguage));

    document.getElementById('textinput-xpath').addEventListener('input', xpathValidate);

    // Add-line button
    const addBtn = document.getElementById('add-line');
    if (addBtn) addBtn.addEventListener('click', () => addLine());
    // external window option removed; keep editor inside popup

    // Initialize intro tour
    introTour = new IntroTour();
    introTour.init();

    document.getElementById('info').addEventListener('click', info);
    const openActionsBtn = document.getElementById('open-actions-view');
    if (openActionsBtn) {
      openActionsBtn.addEventListener('click', () => {
        try {
          chrome.runtime.sendMessage({ operation: 'open-actions-view' });
        } catch (err) {
          logger.warn('Could not send open-actions-view message:', err);
        }
      });
    }
  } catch (err) {
    logger.error(err);
  }
}, false);

host.storage.onChanged.addListener((changes, _) => {
  logger.debug('Localstorage event, changes: ', changes);
  for (const key in changes) {
    const newValue = changes[key].newValue;
    if (key === 'isBusy') busy({ isBusy: newValue });
    if (key === 'message') displayStatus(newValue);
    if (key === 'script') {
      displayScript(newValue || '');
    }
  }
});
