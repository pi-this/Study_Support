// Get references to all HTML elements
const modeSelect = document.getElementById('modeSelect');
const customSettings = document.getElementById('customSettings');
const customInput = document.getElementById('customSiteInput');
const customList = document.getElementById('customSiteList');
const listContainer = document.getElementById('vocabListDisplay');
const clearListBtn = document.getElementById('clearList');
const addCustomSiteBtn = document.getElementById('addCustomSite');

// 1. INITIAL LOAD: Pull everything from storage when popup opens
chrome.storage.local.get({
  currentMode: 'off',
  vocabList: [],
  customSites: []
}, (data) => {
  // Set the dropdown to the saved mode
  modeSelect.value = data.currentMode;
  
  // Show or hide the custom input box based on the loaded mode
  customSettings.style.display = (data.currentMode === 'custom') ? 'block' : 'none';
  
  // Display the saved Spanish words
  renderVocab(data.vocabList);
  
  // Display the custom safe sites list
  renderCustomSites(data.customSites);
});

// 2. MODE CHANGE: Handle when the user picks a different study mode
modeSelect.addEventListener('change', () => {
  const newMode = modeSelect.value;
  
  // Show/Hide the custom site input section
  customSettings.style.display = (newMode === 'custom') ? 'block' : 'none';
  
  // Save mode and tell background.js to close illegal tabs immediately
  chrome.storage.local.set({ currentMode: newMode }, () => {
    chrome.runtime.sendMessage({ action: "checkTabsImmediately" });
  });
});

// 3. CUSTOM SITES: Add a new site to your custom whitelist
addCustomSiteBtn.addEventListener('click', () => {
  const site = customInput.value.trim().toLowerCase();
  if (site) {
    chrome.storage.local.get({ customSites: [] }, (data) => {
      const newList = [...data.customSites, site];
      chrome.storage.local.set({ customSites: newList }, () => {
        customInput.value = ''; // Clear input
        renderCustomSites(newList);
        // Trigger cleanup in case a newly forbidden tab is open
        chrome.runtime.sendMessage({ action: "checkTabsImmediately" });
      });
    });
  }
});

// 4. DISPLAY HELPERS: Functions to update the HTML lists
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
    
    li.innerHTML = `
      <span>${site}</span>
      <button class="remove-site" data-index="${index}" style="padding: 0 5px; cursor: pointer;">x</button>
    `;
    
    customList.appendChild(li);
  });

  // Add click listeners to all the 'x' buttons
  document.querySelectorAll('.remove-site').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const indexToRemove = e.target.getAttribute('data-index');
      removeSite(indexToRemove);
    });
  });
}

// Function to actually remove the site from storage
function removeSite(index) {
  chrome.storage.local.get({ customSites: [] }, (data) => {
    const newList = data.customSites.filter((_, i) => i != index);
    chrome.storage.local.set({ customSites: newList }, () => {
      renderCustomSites(newList);
      // Immediately re-run rules in case the removed site was open
      chrome.runtime.sendMessage({ action: "checkTabsImmediately" });
    });
  });
}


// 5. CLEAR LIST: Delete all saved Spanish words
clearListBtn.addEventListener('click', () => {
  if (confirm("Are you sure you want to clear your vocab list?")) {
    chrome.storage.local.set({ vocabList: [] }, () => {
      renderVocab([]);
    });
  }
});
