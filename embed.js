/**
 * OLake Assistant – Embeddable Floating Chat Widget
 * Drop-in script for embedding the OLake Docs Assistant on any website or docs page.
 * Usage: <script src="https://your-assistant-domain.com/embed.js" async></script>
 */
(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.__OLAKE_EMBED_LOADED__) return;
  window.__OLAKE_EMBED_LOADED__ = true;

  // Determine current script host origin
  const scripts = document.getElementsByTagName('script');
  const currentScript = document.currentScript || scripts[scripts.length - 1];
  let hostUrl = '';
  try {
    const urlObj = new URL(currentScript.src);
    hostUrl = urlObj.origin;
  } catch (e) {
    hostUrl = window.location.origin;
  }

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    .olake-widget-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483640;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      height: 48px;
      padding: 0 18px 0 14px;
      background: #193ae6;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 9999px;
      box-shadow: 0 8px 24px -4px rgba(25, 58, 230, 0.4), 0 4px 12px -2px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
    }
    .olake-widget-btn:hover {
      background: #142eb8;
      transform: translateY(-2px);
      box-shadow: 0 12px 30px -4px rgba(25, 58, 230, 0.55);
    }
    .olake-widget-btn svg {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }
    .olake-widget-frame-wrap {
      position: fixed;
      bottom: 84px;
      right: 24px;
      z-index: 2147483640;
      width: 440px;
      height: 640px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 100px);
      border-radius: 18px;
      box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      overflow: hidden;
      display: none;
      opacity: 0;
      transform: translateY(16px) scale(0.97);
      transition: opacity 0.24s ease, transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
      background: #0d1117;
    }
    .olake-widget-frame-wrap.open {
      display: block;
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    .olake-widget-frame {
      width: 100%;
      height: 100%;
      border: none;
    }
    @media (max-width: 480px) {
      .olake-widget-frame-wrap {
        bottom: 0;
        right: 0;
        width: 100vw;
        height: 100vh;
        max-width: 100vw;
        max-height: 100vh;
        border-radius: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Create floating widget button
  const btn = document.createElement('button');
  btn.className = 'olake-widget-btn';
  btn.setAttribute('aria-label', 'Open OLake Assistant');
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42" fill="none">
      <path fill="#ffffff" d="M41.785 0H0v22.548c17.383-1.832 41.72-2.29 29.8 4.123-8.074 4.343-2.538 5.945 2.308 7.348 3.154.913 6.016 1.741 4.645 3.186-2.791 2.942 2.742 4.112 5.032 4.459z"/>
    </svg>
    <span>Ask OLake</span>
  `;

  // Create popup iframe container
  const wrap = document.createElement('div');
  wrap.className = 'olake-widget-frame-wrap';
  const iframe = document.createElement('iframe');
  iframe.className = 'olake-widget-frame';
  iframe.title = 'OLake Assistant';
  iframe.src = `${hostUrl}/?embed=true`;
  wrap.appendChild(iframe);

  document.body.appendChild(wrap);
  document.body.appendChild(btn);

  let isOpen = false;
  function toggleWidget() {
    isOpen = !isOpen;
    if (isOpen) {
      wrap.classList.add('open');
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span>Close</span>
      `;
    } else {
      wrap.classList.remove('open');
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42" fill="none">
          <path fill="#ffffff" d="M41.785 0H0v22.548c17.383-1.832 41.72-2.29 29.8 4.123-8.074 4.343-2.538 5.945 2.308 7.348 3.154.913 6.016 1.741 4.645 3.186-2.791 2.942 2.742 4.112 5.032 4.459z"/>
        </svg>
        <span>Ask OLake AI</span>
      `;
    }
  }

  btn.addEventListener('click', toggleWidget);

  // Close on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) toggleWidget();
  });
})();
