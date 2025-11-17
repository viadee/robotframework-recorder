/* global chrome t getCurrentLanguage */

import logger from './logger.js';
import { filename } from './constants.js';
import { initializeTranslator } from './translator/robot-translator.js';

const storage = chrome.storage.local;

let currentLanguage = 'en';
async function initLanguage() {
  try {
    currentLanguage = await getCurrentLanguage();
  } catch (err) {
    logger.debug('Could not get language, defaulting to en', err);
    currentLanguage = 'en';
  }
}

function displayStatus(msgKeyOrText) {
  const el = document.getElementById('status-field');
  if (!el) return;
  // If msgKeyOrText matches a translation key, use it; otherwise use raw text
  if (typeof msgKeyOrText === 'string' && t(msgKeyOrText, currentLanguage) !== msgKeyOrText) {
    el.innerText = t(msgKeyOrText, currentLanguage);
  } else {
    el.innerText = msgKeyOrText;
  }
}
function downloadBlob(content, name, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function copyToClipboard(text) {
  if (!navigator.clipboard) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    return;
  }
  navigator.clipboard.writeText(text).catch((err) => {
    logger.error('Clipboard write failed:', err);
  });
}

// Render when we already have pre-generated lines (e.g. stored script)
function renderActionsFromLines(lines) {
  const container = document.getElementById('actions-list');
  if (!container) return;
  container.innerHTML = '';
  if (!lines || lines.length === 0) {
    container.innerHTML = `<em>${t('noActions', currentLanguage)}</em>`;
    return;
  }

  lines.forEach((text, idx) => {
    const row = document.createElement('div');
    row.className = 'script-line-row';
    row.dataset.index = String(idx);

    const indexSpan = document.createElement('span');
    indexSpan.className = 'script-line-index';
    indexSpan.textContent = String(idx + 1);

    const input = document.createElement('input');
    input.className = 'script-line-input';
    input.value = text;
    input.readOnly = true;

    const controls = document.createElement('div');
    controls.className = 'script-line-controls';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'av-icon-btn av-icon-copy';
    copyBtn.setAttribute('aria-label', t('copyThisLine', currentLanguage));
    copyBtn.title = t('copyThisLine', currentLanguage);
    copyBtn.addEventListener('click', () => {
      copyToClipboard(text);
      displayStatus('lineCopied');
    });

    const exportBtn = document.createElement('button');
    exportBtn.className = 'av-icon-btn av-icon-export';
    exportBtn.setAttribute('aria-label', t('exportThisLine', currentLanguage));
    exportBtn.title = t('exportThisLine', currentLanguage);
    exportBtn.addEventListener('click', () => {
      downloadBlob(`${text}\n`, `line-${idx + 1}.robot`, 'text/plain');
      displayStatus('lineExported');
    });

    controls.appendChild(copyBtn);
    controls.appendChild(exportBtn);

    row.appendChild(indexSpan);
    row.appendChild(input);
    row.appendChild(controls);

    container.appendChild(row);
  });
}

function renderActions(list, translator, demo, verify) {
  const container = document.getElementById('actions-list');
  if (!container) return;
  container.innerHTML = '';
  if (!list || list.length === 0) {
    container.innerHTML = `<em>${t('noActions', currentLanguage)}</em>`;
    return;
  }

  // Build events with mapping to source action index so edits target the
  // underlying action data instead of the translated line text.
  const events = [];
  for (let i = 0; i < list.length && i < list.length; i++) {
    if (i > 0) {
      const v = translator._generateVerify(list[i], verify);
      if (v) events.push({ text: v, actionIdx: i, part: 'verify' });
    }
    const p = translator._generatePath(list[i]);
    if (p) events.push({ text: p, actionIdx: i, part: 'path' });
    const d = translator._generateDemo(demo);
    if (d) events.push({ text: d, actionIdx: i, part: 'demo' });
  }

  events.forEach((evt, idx) => {
    const text = evt.text;
    const row = document.createElement('div');
    row.className = 'script-line-row';
    row.dataset.index = String(idx);
    row.dataset.actionIdx = String(evt.actionIdx);
    row.dataset.part = evt.part;

    const indexSpan = document.createElement('span');
    indexSpan.className = 'script-line-index';
    indexSpan.textContent = String(idx + 1);

    const input = document.createElement('input');
    input.className = 'script-line-input';
    input.value = text;
    input.readOnly = true;

    const controls = document.createElement('div');
    controls.className = 'script-line-controls';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'av-btn av-btn--ghost';
    copyBtn.textContent = t('copy', currentLanguage);
    copyBtn.title = t('copyThisLine', currentLanguage);
    copyBtn.addEventListener('click', () => {
      copyToClipboard(text);
      displayStatus('lineCopied');
    });

    const exportBtn = document.createElement('button');
    exportBtn.className = 'av-btn av-btn--ghost';
    // prefer a translation key for export; fall back to download
    exportBtn.textContent = t('export', currentLanguage) || t('download', currentLanguage);
    exportBtn.title = t('exportThisLine', currentLanguage);
    exportBtn.addEventListener('click', () => {
      downloadBlob(`${text}\n`, `line-${idx + 1}.robot`, 'text/plain');
      displayStatus('lineExported');
    });

    const editBtn = document.createElement('button');
    editBtn.className = 'av-btn av-btn--ghost';
    editBtn.title = t('editUnderlying', currentLanguage);
    editBtn.textContent = t('edit', currentLanguage);
    editBtn.setAttribute('aria-label', t('editUnderlying', currentLanguage));
    editBtn.addEventListener('click', async () => {
      // Inline edit in the same input element (no extra input fields)
      const storedRes = await storage.get(['list', 'demo', 'verify', 'target', 'syntax']);
      const storedList = storedRes.list || [];
      const actionIndex = parseInt(row.dataset.actionIdx, 10);
      const part = row.dataset.part;
      const item = storedList[actionIndex];
      if (!item) return;

      if (part !== 'path') {
        displayStatus('onlyPathEditable');
        return;
      }

      // Pre-fill input with the underlying path (not the translated line)
      const original = item.path || '';
      input.value = original;
      input.readOnly = false;
      input.focus();
      input.select();

      // Replace the Edit button with Save and Cancel buttons (textual)
      editBtn.className = 'av-btn av-btn--primary';
      editBtn.textContent = t('save', currentLanguage);
      editBtn.setAttribute('aria-label', t('save', currentLanguage));

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'av-btn av-btn--ghost';
      cancelBtn.textContent = t('cancel', currentLanguage);
      cancelBtn.setAttribute('aria-label', t('cancel', currentLanguage));
      controls.appendChild(cancelBtn);

      const cleanup = () => {
        input.readOnly = true;
        editBtn.className = 'av-btn av-btn--ghost';
        editBtn.textContent = t('edit', currentLanguage);
        cancelBtn.remove();
      };

      cancelBtn.addEventListener('click', () => {
        input.value = original;
        cleanup();
      });

      // Save function (one-time)
      const saveFn = async () => {
        // apply edited text to underlying item.path (simple, no validation)
        item.path = input.value;
        item.value = undefined;
        storedList[idx] = item;
        try {
          await storage.set({ list: storedList });
          const storedDemo = storedRes.demo || false;
          const storedVerify = storedRes.verify || false;
          const storedTranslator = initializeTranslator(
            storedRes.target || 'SeleniumLibrary',
            storedRes.syntax || 'rpa'
          );
          const storedScriptText = storedTranslator.generateOutput(
            storedList,
            storedList.length || storedList.length,
            storedDemo,
            storedVerify
          );
          await storage.set({ script: storedScriptText });
          displayStatus('actionSaved');
          // locally re-render to show updated script
          const expected = storedTranslator.generateOutput(
            storedList,
            storedList.length || storedList.length,
            storedDemo,
            storedVerify
          ) || '';
          const hasStoredScript = storedScriptText && storedScriptText.trim() !== '';
          const scriptDiffers = hasStoredScript && (storedScriptText.trim() !== expected.trim());
          if (scriptDiffers) {
            const outLines = storedScriptText.split('\n').filter(l => l.trim().length > 0);
            renderActionsFromLines(outLines);
          } else {
            renderActions(storedList, storedTranslator, storedDemo, storedVerify);
          }
        } catch (err) {
          logger.error('Failed to save action:', err);
          displayStatus('saveFailed');
        }
        cleanup();
      };

      // Attach Save handler to the modified Edit (now Save) button
      editBtn.addEventListener('click', saveFn, { once: true });

      // Keyboard shortcuts inside input
      const keyHandler = (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          saveFn();
        } else if (ev.key === 'Escape') {
          ev.preventDefault();
          input.value = original;
          cleanup();
        }
      };
      input.addEventListener('keydown', keyHandler, { once: true });
    });

    controls.appendChild(copyBtn);
    controls.appendChild(exportBtn);
    controls.appendChild(editBtn);

    row.appendChild(indexSpan);
    row.appendChild(input);
    row.appendChild(controls);

    container.appendChild(row);
  });
}


async function loadActions() {
  try {
    const res = await storage.get(['list', 'script', 'demo', 'verify', 'target', 'syntax']);
    const list = res.list || [];
    const script = res.script || '';
    const demo = res.demo || false;
    const verify = res.verify || false;
    const target = res.target || 'SeleniumLibrary';
    const syntax = res.syntax || 'rpa';
    // initialize translator
    const translator = initializeTranslator(target, syntax);
    // If stored script differs from translator output, prefer stored script.
    // This ensures edits made in the popup (which update `script`) appear.
    const expected = translator.generateOutput(list, list.length || list.length, demo, verify) || '';
    const useScript = script && script.trim() !== '' && script.trim() !== expected.trim();
    if (useScript) {
      // Render lines from the raw stored script
      const lines = script.split('\n').filter(l => l.trim().length > 0);
      renderActionsFromLines(lines);
    } else {
      renderActions(list, translator, demo, verify);
    }
    displayStatus((script || expected) ? 'scriptAvailable' : 'noScriptGenerated');
    return { list, script };
  } catch (err) {
    logger.error('Could not load actions:', err);
    displayStatus('saveFailed');
    return { list: [], script: '' };
  }
}

// React to external storage changes so popup and other pages stay in sync
if (storage && storage.onChanged && typeof storage.onChanged.addListener === 'function') {
  storage.onChanged.addListener((changes, area) => {
    // only respond to local storage changes
    if (area !== 'local') return;
    const interesting = ['list', 'script', 'demo', 'verify', 'target', 'syntax'];
    const keys = Object.keys(changes || {});
    if (keys.some(k => interesting.includes(k))) {
      // reload to reflect current state
      loadActions().catch(err => logger.error('Failed to reload actions after storage change', err));
    }
  });
}

async function exportRobot() {
  try {
    // Ask background to generate file via runtime message (keeps same translator logic)
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ operation: 'save' }, r => resolve(r));
    });
    displayStatus('exportStarted');
  } catch (err) {
    logger.error('Export failed:', err);
    displayStatus('exportFailed');
  }
}

async function exportJSON(list) {
  const json = JSON.stringify(list, null, 2);
  downloadBlob(json, 'actions.json', 'application/json');
}

async function clearScript() {
  try {
    await storage.remove(['list', 'script']);
    displayStatus('actionSaved');
    await loadActions();
  } catch (err) {
    logger.error('Clear failed:', err);
  }
}

function init() {
  // initialize language then wire UI text and handlers
  initLanguage().then(() => {
    // set document title and heading according to language
    try {
      document.title = t('pageTitle', currentLanguage) || document.title;
    } catch (e) {
      // ignore if document not available
    }
    const heading = document.getElementById('actions-heading');
    if (heading) heading.textContent = t('actionsHeading', currentLanguage) || heading.textContent;
    document.getElementById('refresh').addEventListener('click', () => loadActions());
    // Set UI texts for buttons using translations
    document.getElementById('refresh').textContent = t('refresh', currentLanguage);
    document.getElementById('export-robot').textContent = t('exportRobot', currentLanguage);
    document.getElementById('export-json').textContent = t('exportJson', currentLanguage);
    document.getElementById('copy-script').textContent = t('copyScript', currentLanguage);
    document.getElementById('clear-script').textContent = t('clear', currentLanguage);
    document.getElementById('export-robot').addEventListener('click', () => exportRobot());
    document.getElementById('export-json').addEventListener('click', async () => {
      const { list } = await loadActions();
      exportJSON(list);
    });
    document.getElementById('copy-script').addEventListener('click', async () => {
      const { script } = await loadActions();
      if (script) copyToClipboard(script);
    });
    document.getElementById('clear-script').addEventListener('click', () => clearScript());

    // Initial load
    loadActions();
  });
}

document.addEventListener('DOMContentLoaded', init);
