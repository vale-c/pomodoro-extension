let timer: NodeJS.Timeout | null = null;
let timeLeft = 25 * 60; // 25 minutes in seconds
let isRunning = false;
let isSession = true;
let sessionDuration = 25 * 60;
let breakDuration = 5 * 60;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ timeLeft, isRunning, isSession, sessionDuration: 25, breakDuration: 5, isDarkMode: false });
});

function startTimer() {
  if (timer) return;
  
  isRunning = true;
  chrome.storage.local.set({ isRunning });
  
  timer = setInterval(() => {
    timeLeft--;
    chrome.storage.local.set({ timeLeft });
    
    if (timeLeft <= 0) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      isRunning = false;
      isSession = !isSession;
      timeLeft = isSession ? sessionDuration : breakDuration;
      chrome.storage.local.set({ timeLeft, isRunning, isSession });
      playSound(isSession ? 'session' : 'break');
    }
  }, 1000);
}

function pauseTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  isRunning = false;
  chrome.storage.local.set({ isRunning });
}

function resetTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  isSession = true;
  timeLeft = sessionDuration;
  isRunning = false;
  chrome.storage.local.set({ timeLeft, isRunning, isSession });
}

function playSound(type: 'session' | 'break') {
  const audio = new Audio(chrome.runtime.getURL(type === 'session' ? 'session-end.mp3' : 'break-end.mp3'));
  audio.play();
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'startTimer') startTimer();
  if (request.action === 'pauseTimer') pauseTimer();
  if (request.action === 'resetTimer') resetTimer();
  sendResponse({ success: true });
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.sessionDuration) {
    sessionDuration = changes.sessionDuration.newValue * 60;
    if (isSession && !isRunning) {
      timeLeft = sessionDuration;
      chrome.storage.local.set({ timeLeft });
    }
  }
  if (changes.breakDuration) {
    breakDuration = changes.breakDuration.newValue * 60;
    if (!isSession && !isRunning) {
      timeLeft = breakDuration;
      chrome.storage.local.set({ timeLeft });
    }
  }
});