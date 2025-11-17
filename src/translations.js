/* global chrome */

const translations = {
  en: {
    // Buttons
    record: 'Record',
    stop: 'Stop',
    resume: 'Resume',
    pause: 'Pause',
    scanPage: 'Scan Page',
    validateXPath: 'Validate XPath',
    copy: 'Copy',
    download: 'Download',
    clear: 'Clear',
    update: 'Update',
    reset: 'Reset',

    // Titles
    recordTitle: 'Record user action',
    stopTitle: 'Stop the recording',
    resumeTitle: 'Resume with the recording',
    pauseTitle: 'Pause the recording',
    scanPageTitle: 'Scan entire page',
    validateXPathTitle: 'Show/hide XPath console',
    infoTitle: 'Toggle instructions',
    settingsTitle: 'show/hide settings',
    copyTitle: 'Copy to clipboard',
    downloadTitle: 'Download test script',
    clearTitle: 'Clear script',
    xpathPlaceholder: '//xpath-to-validate',

    // Data-intro
    recordIntro: 'Start recording actions',
    scanIntro: 'Generate a script referencing interactive elements on the page',
    xpathIntro: 'Open interactive XPath console',
    settingsIntro: 'Settings',

    // Settings Panel
    targetLibrary: 'Target Library',
    selenium: 'RPA.Browser.Selenium / SeleniumLibrary',
    rfBrowser: 'RobotFramework Browser',
    targetSyntax: 'Target RF Syntax',
    rpa: 'RPA (Tasks)',
    testAutomation: 'Test Automation (Test cases)',
    advancedSettings: 'Advanced settings',
    addSleep: 'Add a sleep after each action (for creating easy-to-showcase demo scripts)',
    checkPageContains: 'Check page contains element before performing the action',

    // Options Page
    customLocators: 'Custom Locators',
    customLocatorsHint: 'Add your own flavoured locators! Separate with a commas.',
    language: 'Language',
    
    // Default message
    recordOrScan: 'Record or Scan'
  },
  de: {
    // Buttons
    record: 'Aufzeichnen',
    stop: 'Stopp',
    resume: 'Fortsetzen',
    pause: 'Pause',
    scanPage: 'Seite scannen',
    validateXPath: 'XPath validieren',
    copy: 'Kopieren',
    download: 'Herunterladen',
    clear: 'Löschen',
    update: 'Aktualisieren',
    reset: 'Zurücksetzen',

    // Titles
    recordTitle: 'Benutzeraktionen aufzeichnen',
    stopTitle: 'Aufzeichnung beenden',
    resumeTitle: 'Aufzeichnung fortsetzen',
    pauseTitle: 'Aufzeichnung pausieren',
    scanPageTitle: 'Gesamte Seite scannen',
    validateXPathTitle: 'XPath-Konsole anzeigen/verbergen',
    infoTitle: 'Anweisungen anzeigen/verbergen',
    settingsTitle: 'Einstellungen anzeigen/verbergen',
    copyTitle: 'In Zwischenablage kopieren',
    downloadTitle: 'Testskript herunterladen',
    clearTitle: 'Skript löschen',
    xpathPlaceholder: '//xpath-zum-validieren',

    // Data-intro
    recordIntro: 'Aktionen aufzeichnen starten',
    scanIntro: 'Skript generieren, das auf interaktive Elemente auf der Seite verweist',
    xpathIntro: 'Interaktive XPath-Konsole öffnen',
    settingsIntro: 'Einstellungen',

    // Settings Panel
    targetLibrary: 'Zielbibliotek',
    selenium: 'RPA.Browser.Selenium / SeleniumLibrary',
    rfBrowser: 'RobotFramework Browser',
    targetSyntax: 'RF-Zielssyntax',
    rpa: 'RPA (Tasks)',
    testAutomation: 'Testautomatisierung (Testfälle)',
    advancedSettings: 'Erweiterte Einstellungen',
    addSleep: 'Nach jeder Aktion eine Pause hinzufügen (zum Erstellen von leicht demonstrierbaren Demo-Skripten)',
    checkPageContains: 'Überprüfen, ob die Seite das Element enthält, bevor die Aktion ausgeführt wird',

    // Options Page
    customLocators: 'Benutzerdefinierte Locator',
    customLocatorsHint: 'Fügen Sie Ihre eigenen Locator hinzu! Mit Kommas trennen.',
    language: 'Sprache',
    
    // Default message
    recordOrScan: 'Aufzeichnen oder Scannen'
  }
};

/**
 * Get the current language setting or detect from browser locale
 */
async function getCurrentLanguage() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ language: null }, (result) => {
      if (result.language) {
        resolve(result.language);
      } else {
        // Auto-detect from browser language
        const browserLang = chrome.i18n.getUILanguage();
        const lang = browserLang.startsWith('de') ? 'de' : 'en';
        resolve(lang);
      }
    });
  });
}

/**
 * Get translated string for given key and language
 */
function t(key, language = 'en') {
  if (translations[language] && translations[language][key]) {
    return translations[language][key];
  }
  // Fallback to English
  if (translations.en[key]) {
    return translations.en[key];
  }
  return key;
}

/**
 * Get all translations for a language
 */
function getTranslations(language = 'en') {
  return translations[language] || translations.en;
}

/**
 * Set the current language
 */
function setLanguage(language) {
  chrome.storage.local.set({ language });
}

if (typeof exports !== 'undefined') {
  exports.getCurrentLanguage = getCurrentLanguage;
  exports.t = t;
  exports.getTranslations = getTranslations;
  exports.setLanguage = setLanguage;
}
