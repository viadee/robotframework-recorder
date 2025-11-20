# RobotFramework Recorder

![Build Status](https://github.com/robotframework-recorder/Robotcorder/workflows/on-push%20jobs/badge.svg)

> A browser extension that generates [RobotFramework](http://robotframework.org/) automation scripts for SeleniumLibrary and Browser. 

Fork based on https://github.com/sohwendy/Robotcorder

## How-to

### Using the extension itself


### Understanding and extending the generated "script templates"

For understanding and extending the generated scripts, see upstream
- [robotframework-browser](https://robotframework-browser.org/) documentation
- [SeleniumLibrary](https://robotframework.org/SeleniumLibrary/) documentation

For understanding the XPATH selectors see [Xpath Cheatsheet](https://devhints.io/xpath)

For extra guides you can check out https://robotframework-recorder.com/docs/development-howtos/browser for generic browser automation documentation and 
https://robotframework-recorder.com/docs/development-howtos/browser/playwright for playwright based Browser library documentation.

## Screenshots
### Main view

<img src="robotframework-recorder-assets/main-view.png" width="480" />

### Settings

<img src="robotframework-recorder-assets/settings-view.png" width="480" />

### Scan output

<img src="robotframework-recorder-assets/scan-output.png" width="480" />

## Features

1. Recording user actions
2. Scanning the html page
3. Validating XPATH selectors

## New Fratures (2025)

Create a exportable List of Commands instead of plain text
Added an overview page for recordings.

### New Features RF Recorder (December 2020)
Choose between generating locators for Robotframework Browser (playwright based) or SeleniumLibrary
Choose between RPA or Test focused Robot Framework syntax

### New Features (Robotcorder, 22 Sept 2018)
Edit the locators.
go to chrome://extensions  
click on Extension options  
edit and update the locators

## Download
Coming to chrome web store soon. For now see https://github.com/robotframework-recorder/Robotcorder/releases for manual installation of latest release.
<!--  [Robotcorder - Chrome Web Store](https://chrome.google.com/webstore/detail/robotcorder/ifiilbfgcemdapeibjfohnfpfmfblmpd) 
-->

## Package
``` $ script/export.command ```
or
``` $ npm run export ```

## Development setup (Deutsch)

Wenn du lokal an diesem Projekt arbeiten möchtest, hier ein kurzes Setup:

1. Abhängigkeiten installieren

```bash
# Installiere Abhängigkeiten
npm install
```

2. Yarn verfügbar machen (optional)

Das Projekt nutzt `yarn` in den `package.json`-Skripten. Du kannst Yarn global installieren oder Corepack (empfohlen bei neueren Node-Versionen) benutzen:

```bash
# Global per npm
npm install -g yarn

# Oder (Node >= 16.10) Corepack aktivieren und Yarn bereitstellen
corepack enable
corepack prepare yarn@stable --activate
```

Hinweis: Husky-Pre-Commit-Hook verwendet `npx yarn test` — das bevorzugt die lokal installierte Yarn-Version aus `node_modules` und erfordert keine globale Installation, solange `npm install` ausgeführt wurde.

3. Tests & Linter

```bash
# Lint (statisch)
npm run lint

# Voller Testlauf (inkl. Linter + Unit-Tests)
npm test
```

4. Husky pre-commit

Vor jedem Commit läuft der pre-commit Hook und führt `npx yarn test` aus. Falls du den Hook einmal temporär überspringen willst:

```bash
git commit -m "message" --no-verify
```

Wenn du Husky dauerhaft deaktivieren willst (nicht empfohlen), kannst du in der aktuellen Shell `export HUSKY=0` setzen.

5. Chrome Store ZIP erstellen

Erzeuge ein ZIP-Paket für den Chrome Web Store (im `dist`-Ordner):

```bash
mkdir -p dist
zip -r dist/robocorp-recorder-chrome.zip manifest.json src assets vendors robotframework-recorder-assets static script README.md LICENSE -x "*/test/*" "*/node_modules/*" ".github/*" "dist/*" "*.DS_Store"
```

Das erzeugte Archiv kannst du dann im Chrome Web Store Developer Dashboard hochladen.


## Contributing
1. Fork it
2. Create your feature branch (git checkout -b my-new-feature)
3. Commit your changes (git commit -am 'Add some feature')
4. Push to the branch (git push origin my-new-feature)
5. Create new Pull Request

## Change Log
Refer to [CHANGELOG.md](https://github.com/robotframework-recorder/Robotcorder/blob/master/CHANGELOG.md)

<!--
## Github Pages
Found in /docs.
Refer to [Robotcorder-Page](https://sohwendy.github.io/Robotcorder-Page/) for instruction how to update github page.


[![forthebadge](https://forthebadge.com/images/badges/made-with-javascript.svg)](https://forthebadge.com)
[![forthebadge](https://forthebadge.com/images/badges/contains-technical-debt.svg)](https://forthebadge.com)


[![forthebadge](https://forthebadge.com/images/badges/check-it-out.svg)](https://forthebadge.com)
[![forthebadge](https://forthebadge.com/images/badges/does-not-contain-msg.svg)](https://forthebadge.com)
[![forthebadge](https://forthebadge.com/images/badges/powered-by-water.svg)](https://forthebadge.com)

-->


