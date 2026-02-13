import { t, getCurrentLanguage, setLanguage } from './translations.js';

const storage = chrome.storage.local;

let currentLanguage = 'en';

export function update() {
  const values = document.getElementById('custom-locators').value;
  const array = values ? values.split(',') : ['for', 'name', 'id', 'title', 'href', 'class'];
  storage.set({ locators: array });
}

/**
 * Update UI translations
 */
function updateUITranslations(language) {
  document.getElementById('language-label').textContent = t('language', language);
  document.getElementById('custom-locators-heading').textContent = t('customLocators', language);
  document.getElementById('hint').textContent = t('customLocatorsHint', language);
  document.getElementById('reset').textContent = t('reset', language);
  document.getElementById('update').textContent = t('update', language);
}

/**
 * Handle language change
 */
async function changeLanguage(e) {
  const newLanguage = e.target.value;
  currentLanguage = newLanguage;
  setLanguage(newLanguage);
  updateUITranslations(newLanguage);
}

document.addEventListener('DOMContentLoaded', async () => {
  currentLanguage = await getCurrentLanguage();

  const state = await storage.get({ locators: [] });
  document.getElementById('custom-locators').value = state.locators.join(',');

  updateUITranslations(currentLanguage);

  document.getElementById(`lang_${currentLanguage}`).checked = true;

  document.getElementById('update').addEventListener('click', update);

  Array.from(document.getElementsByClassName('language-option'))
    .forEach(elem => elem.addEventListener('change', changeLanguage));
});
