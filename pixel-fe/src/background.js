// Background service worker for Pixel Chrome Extension
// Handles tab capture, background tasks, and universal injection across all browser tabs

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_TAB') {
    handleCapture(sender.tab, message.cropData, sendResponse);
    return true; // Keep channel open for async sendResponse
  }
});

async function handleCapture(tab, cropData, sendResponse) {
  try {
    // Capture visible viewport of current window
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);

    // Account for Retina / High-DPI display scaling
    const tabWidth = tab?.width || 1;
    const tabHeight = tab?.height || 1;
    const scaleX = bitmap.width / tabWidth;
    const scaleY = bitmap.height / tabHeight;

    const targetWidth = Math.max(1, Math.round(cropData.width * scaleX));
    const targetHeight = Math.max(1, Math.round(cropData.height * scaleY));
    const targetX = Math.round(cropData.x * scaleX);
    const targetY = Math.round(cropData.y * scaleY);

    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      bitmap,
      targetX, targetY, targetWidth, targetHeight,
      0, 0, targetWidth, targetHeight
    );

    const outBlob = await canvas.convertToBlob({ type: 'image/png' });
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      sendResponse({ success: true, base64 });
    };
    reader.readAsDataURL(outBlob);
  } catch (err) {
    console.error('Pixel tab capture failed:', err);
    sendResponse({ success: false, error: err.message });
  }
}

// Helper to check if a URL is eligible for content script injection
function isInjectableUrl(url) {
  if (!url) return false;
  return (
    !url.startsWith('chrome://') &&
    !url.startsWith('chrome-extension://') &&
    !url.startsWith('edge://') &&
    !url.startsWith('about:') &&
    !url.startsWith('view-source:') &&
    !url.startsWith('devtools://') &&
    !url.includes('chromewebstore.google.com')
  );
}

// When extension is installed or reloaded, inject into ALL currently open tabs immediately!
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !isInjectableUrl(tab.url)) continue;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });
      } catch (e) {
        // Tab may have closed or restricted, ignore
      }
    }
  } catch (err) {
    console.warn('Error during onInstalled broadcast injection:', err);
  }
});

// When extension icon is clicked in toolbar, safely notify or inject into tab
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id || !isInjectableUrl(tab?.url)) return;

  try {
    // Try sending message to existing content script in tab
    await chrome.tabs.sendMessage(tab.id, { type: 'PIXEL_TOGGLE_POPUP' });
  } catch (err) {
    // If not injected yet, inject on the fly and open
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { type: 'PIXEL_TOGGLE_POPUP' }).catch(() => {});
      }, 150);
    } catch (injectErr) {
      console.warn('Could not inject content script:', injectErr.message);
    }
  }
});
