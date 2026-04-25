// Define your modes and their allowed sites
const modeRules = {
  spanish: ["edmentum.com", "spanishdict.com", "chrome://"],
  animation: ["khanacademy.o// 1. Configuration
const modeRules = { 
    spanish: ["edmentum.com", "spanishdict.com", "docs.google.com"], 
    animation: ["khanacademy.org"] 
}; 

const workSequence = ["spanish", "animation", "animation"];
const REQUIRED_TIME_PER_SITE = 3600/2; // 30 minutes

// 2. Main Enforcement Function
async function enforceRules() {
    const data = await chrome.storage.local.get({ currentMode: 'off', unlocked: false });
    
    // Force the correct mode based on the sequence if not unlocked
    if (!data.unlocked) {
        const status = await chrome.storage.local.get({ currentSequenceIndex: 0 });
        const requiredMode = workSequence[status.currentSequenceIndex];
        
        if (data.currentMode !== requiredMode) {
            await chrome.storage.local.set({ currentMode: requiredMode });
            // Re-run to ensure the logic uses the newly set mode
            return enforceRules(); 
        }
    }

    // Exit if the mode is manually turned off and unlocked
    if (data.currentMode === 'off') return;

    // Get all tabs (includes incognito if permission is granted in settings)
    const allTabs = await chrome.tabs.query({});
    const allowedSites = modeRules[data.currentMode] || [];

    allTabs.forEach(tab => {
        // SAFETY: Do NOT close internal browser pages. 
        // This prevents the "lockout" loop where you can't open settings or new tabs.
        if (!tab.url || 
            tab.url.startsWith("chrome://") || 
            tab.url.startsWith("about:") || 
            tab.url.startsWith("chrome-extension://")) {
            return;
        }

        // DISTRACTION REMOVAL: Only close actual websites (http) that aren't allowed
        const isSafe = allowedSites.some(site => tab.url.includes(site));
        if (!isSafe && (tab.url.startsWith("http://") || tab.url.startsWith("https://"))) {
            chrome.tabs.remove(tab.id);
        }
    });
}

// 3. Timer Logic (Runs every second)
setInterval(async () => {
    const data = await chrome.storage.local.get({ 
        unlocked: false, 
        currentSequenceIndex: 0, 
        secondsElapsed: 0 
    });

    if (data.unlocked) return;

    // "lastFocusedWindow: true" ensures we track time even in Incognito windows
    const activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!activeTabs.length) return;

    const activeTab = activeTabs[0];
    const activeUrl = activeTab.url;
    const currentRequiredMode = workSequence[data.currentSequenceIndex];
    const allowedForCurrentMode = modeRules[currentRequiredMode];

    // Check if the user is on a valid school site
    const isOnCorrectSite = allowedForCurrentMode.some(site => activeUrl && activeUrl.includes(site));

    if (isOnCorrectSite) {
        let newSeconds = data.secondsElapsed + 1;

        if (newSeconds >= REQUIRED_TIME_PER_SITE) {
            let nextIndex = data.currentSequenceIndex + 1;
            
            if (nextIndex >= workSequence.length) {
                // SEQUENCE COMPLETE
                await chrome.storage.local.set({ 
                    unlocked: true, 
                    secondsElapsed: 0, 
                    currentMode: 'off' 
                });
                console.log("All work finished! Modes unlocked.");
            } else {
                // MOVE TO NEXT SUBJECT
                await chrome.storage.local.set({ 
                    currentSequenceIndex: nextIndex, 
                    secondsElapsed: 0 
                });
                console.log("Stage complete. Moving to next mode.");
            }
        } else {
            // INCREMENT TIME
            await chrome.storage.local.set({ secondsElapsed: newSeconds });
        }
    }
}, 1000);

// 4. Event Listeners
// Check rules when a tab is updated (e.g., navigating to a new site)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) enforceRules();
});

// Listener for messages from popup.js
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "checkTabsImmediately") {
        enforceRules();
    }
});
rg", "chrome://"]
};

async function enforceRules() {
  const data = await chrome.storage.local.get({ currentMode: 'off', customSites: [] });
  if (data.currentMode === 'off') return;

  // Use the standard rules OR the custom rules from storage
  let allowedSites = modeRules[data.currentMode] || [];
  
  if (data.currentMode === 'custom') {
    allowedSites = [...data.customSites, "chrome://"]; // Always allow chrome
  }

  const allTabs = await chrome.tabs.query({});
  allTabs.forEach(tab => {
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url === "about:blank") return;
    const isSafe = allowedSites.some(site => tab.url.includes(site));
    if (!isSafe) chrome.tabs.remove(tab.id);
  });
}

// 1. Listen for URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) enforceRules();
});

// 2. Listen for "Immediate Check" message from the popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "checkTabsImmediately") {
    enforceRules();
  }
});


// 1. Setup the Right-Click Menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveSpanishWord",
    title: "Add '%s' to Study List",
    contexts: ["selection"]
  });
});

// 2. Handle Saving Words
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "saveSpanishWord") {
    chrome.storage.local.get({vocabList: []}, (data) => {
      const newList = [...data.vocabList, info.selectionText];
      chrome.storage.local.set({vocabList: newList});
    });
  }
});
