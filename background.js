// Define your modes and their allowed sites
const modeRules = {
  spanish: ["edmentum.com", "spanishdict.com", "chrome://"],
  animation: ["khanacademy.org", "chrome://"]
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