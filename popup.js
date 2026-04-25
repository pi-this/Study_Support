// Get references to all HTML elements
const modeSelect = document.getElementById('modeSelect');
const customSettings = document.getElementById('customSettings');
const customInput = document.getElementById('customSiteInput');
const customList = document.getElementById('customSiteList');
const listContainer = document.getElementById('vocabListDisplay');
const clearListBtn = document.getElementById('clearList');
const addCustomSiteBtn = document.getElementById('addCustomSite');

// New Timer Elements (from the previous main.html update)
const taskDisplay = document.getElementById('current-task-display');
const timerDisplay = document.getElementById('timer-display');
const progressBar = document.getElementById('progress-bar');

const workSequence = ["spanish", "animation"];
const GOAL_SECONDS = 3600;

// At the top with your other element references
const resetTimerBtn = document.getElementById('resetTimerBtn');

// Add the reset functionality
resetTimerBtn.addEventListener('click', () => {
  if (confirm("Are you sure you want to reset your study progress and start Spanish mode over?")) {
    chrome.storage.local.set({
      currentSequenceIndex: 0,
      secondsElapsed: 0,
      unlocked: false,
      currentMode: 'spanish' 
    }, () => {
      // Immediately tell background.js to enforce the rules for Spanish mode
      chrome.runtime.sendMessage({ action: "checkTabsImmediately" });
      updateTimerUI(); // Refresh the progress bar immediately
    });
  }
});

// 1. TIMER & LOCK LOGIC: Runs every second
function updateTimerUI() {
  chrome.storage.local.get(['secondsElapsed', 'currentSequenceIndex', 'unlocked'], (data) => {
    if (data.unlocked) {
      taskDisplay.innerText = "All Tasks Complete!";
      timerDisplay.innerText = "Unlocked";
      progressBar.style.width = "100%";
      progressBar.style.background = "#28a745";
      modeSelect.disabled = false; // Enable dropdown
    } else {
      const currentTask = workSequence[data.currentSequenceIndex] || "spanish";
      const remaining = GOAL_SECONDS - (data.secondsElapsed || 0);
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;

      taskDisplay.innerText = currentTask.charAt(0).toUpperCase() + currentTask.slice(1);
      timerDisplay.innerText = `${mins}:${secs.toString().padStart(2, '0')} remaining`;
      progressBar.style.width = `${((data.secondsElapsed || 0) / GOAL_SECONDS) * 100}%`;
      
      // FORCE the dropdown to match the required work mode
      modeSelect.value = currentTask;
      modeSelect.disabled = true; 
      customSettings.style.display = 'none'; // Hide custom settings while locked
    }
  });
}




// 2. INITIAL LOAD: Pull vocab and custom sites
chrome.storage.local.get({
  currentMode: 'off',
  vocabList: [],
  customSites: [],
  unlocked: false
}, (data) => {
  if (data.unlocked) {
    modeSelect.value = data.currentMode;
    customSettings.style.display = (data.currentMode === 'custom') ? 'block' : 'none';
  }
  renderVocab(data.vocabList);
  renderCustomSites(data.customSites);
});

// 3. MODE CHANGE: Only allowed if data.unlocked is true (handled by updateTimerUI)
modeSelect.addEventListener('change', () => {
  const newMode = modeSelect.value;
  customSettings.style.display = (newMode === 'custom') ? 'block' : 'none';
  
  chrome.storage.local.set({ currentMode: newMode }, () => {
    chrome.runtime.sendMessage({ action: "checkTabsImmediately" });
  });
});

// --- KEEP YOUR EXISTING HELPER FUNCTIONS BELOW ---

addCustomSiteBtn.addEventListener('click', () => {
  const site = customInput.value.trim().toLowerCase();
  if (site) {
    chrome.storage.local.get({ customSites: [] }, (data) => {
      const newList = [...data.customSites, site];
      chrome.storage.local.set({ customSites: newList }, () => {
        customInput.value = '';
        renderCustomSites(newList);
        chrome.runtime.sendMessage({ action: "checkTabsImmediately" });
      });
    });
  }
});

function renderVocab(list) {
  listContainer.innerHTML = '';
  list.forEach(word => {
    const li = document.createElement('li');
    li.textContent = word;
    listContainer.appendChild(li);
  });
}

function renderCustomSites(sites) {
  customList.innerHTML = '';
  sites.forEach((site, index) => {
    const li = document.createElement('li');
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.marginBottom = "3px";
    li.innerHTML = `<span>${site}</span><button class="remove-site" data-index="${index}">x</button>`;
    customList.appendChild(li);
  });

  document.querySelectorAll('.remove-site').forEach(btn => {
    btn.addEventListener('click', (e) => removeSite(e.target.getAttribute('data-index')));
  });
}

function removeSite(index) {
  chrome.storage.local.get({ customSites: [] }, (data) => {
    const newList = data.customSites.filter((_, i) => i != index);
    chrome.storage.local.set({ customSites: newList }, () => {
      renderCustomSites(newList);
      chrome.runtime.sendMessage({ action: "checkTabsImmediately" });
    });
  });
}

clearListBtn.addEventListener('click', () => {
  if (confirm("Clear vocab list?")) {
    chrome.storage.local.set({ vocabList: [] }, () => renderVocab([]));
  }
});

// Start the UI heartbeat
setInterval(updateTimerUI, 1000);
updateTimerUI();
