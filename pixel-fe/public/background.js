// Background service worker for Pixel Chrome Extension
// Handles tab capture and background tasks

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

// When extension icon is clicked in toolbar, safely notify or inject into tab
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id || !tab?.url) return;

  // Ignore restricted browser internal pages
  if (
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('chrome-extension://') ||
    tab.url.startsWith('edge://') ||
    tab.url.startsWith('about:')
  ) {
    console.warn('Pixel cannot inject into internal browser page:', tab.url);
    return;
  }

  try {
    // Try sending message to existing content script in tab
    await chrome.tabs.sendMessage(tab.id, { type: 'PIXEL_TOGGLE_POPUP' });
  } catch (err) {
    // If receiving end does not exist (e.g. tab opened before extension loaded),
    // inject content.js on the fly into the active tab
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      // Allow brief moment for mount then toggle
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { type: 'PIXEL_TOGGLE_POPUP' }).catch(() => {});
      }, 150);
    } catch (injectErr) {
      console.warn('Could not inject content script:', injectErr.message);
    }
  }
});
