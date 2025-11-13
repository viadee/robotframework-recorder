export const url = 'https://github.com/viadee/robotframework-recorder';

export const tab = { active: true, currentWindow: true };

export const logo = {
  stop: '/assets/mark-128.png',
  record: '/assets/btn-record.png',
  scan: '/assets/icon-target.png',
  action: '/assets/mark-128.png',
  pause: '/assets/icon-pause.png'
};
// This does not seem to propagate correctly to background.js
export const filename = 'robot_script.robot';

export const statusMessage = {
  stop: 'Stopped',
  record: 'Recording action...',
  succesfulRecord: 'Recorded script',
  scan: 'Scanning html document...',
  failure: 'Operation failed. Please try refreshing the web page.',
  idle: 'Idle',
};

export const instruction = `robotframework-recorder
  Generate a Robot Framework automation script by
  – Recording actions
  – Scanning the page for automatable inputs
   Automating automation 🤖`;

export const defaultLocatorOrder = ['for', 'name', 'id', 'title', 'href', 'class'];
