/* global document chrome ClipboardJS IntroTour t getCurrentLanguage setLanguage */
const debug = false;
const host = chrome;
const storage = host.storage.local;

let currentLanguage = 'en';
let introTour = null;

/*eslint-disable */
/* 
const gaAccount = 'UA-88380525-1';
const version = '0.3.0';
var _gaq = _gaq || [];
_gaq.push(['_setAccount', gaAccount]);
_gaq.push(['_trackPageview']);
(function() {
  var ga = document.createElement('script');
  ga.type = 'text/javascript';
  ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(ga, s);
})();
*/
/* eslint-enable */

/*
function analytics(data) {
  const versionData = data;
  if (gaAccount) {
    versionData[2] = `${version} ${data[2]}`;
    _gaq.push(versionData);
    logger(gaAccount && versionData);
  }
}
*/
function analytics(_) {}

const logger = {
  debug: (data, rest) => {
    console.debug(data, rest);
  },
  error: (data, rest) => {
    console.error(data, rest);
  }
};

const clipboard = new ClipboardJS('#copy');

const copyStatus = (className) => {
  const copyButton = document.getElementById('copy');
  copyButton.classList.add(className);
  setTimeout(() => { copyButton.classList.remove(className); }, 3000);
};

clipboard.on('success', (e) => {
  copyStatus('copy-ok');
  analytics(['_trackEvent', 'copy', 'ok']);

  e.clearSelection();
});

clipboard.on('error', (e) => {
  copyStatus('copy-fail');
  analytics(['_trackEvent', 'copy', 'nok']);
  logger.error('Action:', e.action);
  logger.error('Trigger:', e.trigger);
});

function updateValueByMessage(elementId, message) {
  if (message || message === '') {
    const field = document.querySelector(elementId);
    field.innerText = message.toString();
  } else {
    logger.debug(`Tried to update value of ${elementId} by ${message}`);
  }
}

function displayScript(message) {
  updateValueByMessage('#script-output', message);
}

function displayStatus(message) {
  updateValueByMessage('#status-field', message);
}


function show(ids, visible) {
  const elements = ids.map(id => document.getElementById(id));

  elements.forEach((elem) => {
    if (elem) visible ? elem.classList.remove('hidden') : elem.classList.add('hidden');
    else logger.error('Tried to toggle visibility of non-existent element');
  });
}

function hide(array) {
  show(array, false);
}

function enable(array, isEnabled) {
  array.forEach((id) => {
    const element = document.getElementById(id);
    isEnabled ? element.classList.remove('disabled') : element.classList.add('disabled');
  });
}

function toggleHidden(id) {
  document.getElementById(id).classList.toggle('hidden');
}

function setActive(id) {
  document.getElementById(id).classList.add('btn-active');
}

function setInactive(array) {
  array.forEach((id) => {
    document.getElementById(id).classList.remove('btn-active');
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
      document.getElementById(id).disabled = e.isBusy;
    });
  }
}

function runtimeSendMessage(message) {
  return new Promise((resolve, reject) => {
    host.runtime.sendMessage(message, (response) => {
      if (host.runtime && host.runtime.lastError) reject(host.runtime.lastError);
      else resolve(response);
    });
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
    logger.error('operation error:', err);
  }
  analytics(['_trackEvent', e.target.id, '^-^']);
}

async function xpathValidate(event) {
  const xpath = document.getElementById('textinput-xpath').value;
  try {
    const response = await runtimeSendMessage({ operation: 'xpath-validate', xpath });
    console.log('Response from the content script:', response);
  } catch (err) {
    logger.error('operation error:', err);
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
    console.log('Response from the content script:', response);
  } catch (err) {
    logger.error('operation error:', err);
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

    // FIXME: rename target to current operation and toggle's first param to `state` instead of `e`
    toggle({
      target: { id: state.operation },
      canSave: state.canSave,
      isBusy: state.isBusy,
      demo: state.demo,
      verify: state.verify,
      library_target: state.target,
      syntax: state.syntax,
    });

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
    
    // Initialize intro tour
    introTour = new IntroTour();
    introTour.init();
    
    document.getElementById('info').addEventListener('click', info);
  } catch (err) {
    console.error(err);
  }
}, false);

host.storage.onChanged.addListener((changes, _) => {
  logger.debug('Localstorage event, changes: ', changes);
  for (const key in changes) {
    const newValue = changes[key].newValue;
    if (key === 'isBusy') busy({ isBusy: newValue });
    if (key === 'message') displayStatus(newValue);
    if (key === 'script') displayScript(newValue || '');
  }
});
