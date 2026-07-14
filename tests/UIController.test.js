import { expect, test, vi, beforeEach, afterEach } from 'vitest';
import { initUI } from '../src/UIController.js';

// Setup realistic DOM before each test
beforeEach(() => {
  document.body.innerHTML = `
    <button id="normal-btn">Normal</button>
    <button aria-label="Emergency">Emergency</button>
    <a href="#" class="nav-item" data-tab="incident">Incident</a>
    <a href="#">Generic Link</a>
  `;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  // Clean up any leftover toast containers
  document.querySelectorAll('.fixed.bottom-4').forEach(el => el.remove());
  delete window.showToast;
});

test('initUI injects toast container into body', () => {
  initUI();
  const toastContainer = document.querySelector('.fixed.bottom-4');
  expect(toastContainer).not.toBeNull();
});

test('showToast creates a toast element with the message', () => {
  initUI();
  window.showToast('Test message');
  const toastContainer = document.querySelector('.fixed.bottom-4');
  expect(toastContainer.children.length).toBe(1);
  expect(toastContainer.innerHTML).toContain('Test message');
});

test('showToast auto-removes after timeout', () => {
  initUI();
  window.showToast('Ephemeral');
  const toastContainer = document.querySelector('.fixed.bottom-4');
  expect(toastContainer.children.length).toBe(1);
  // Advance past the 3000ms + 300ms removal timeout
  vi.advanceTimersByTime(3400);
  expect(toastContainer.children.length).toBe(0);
});

test('Emergency button triggers pulse overlay and toast', () => {
  initUI();
  const emBtn = document.querySelector('button[aria-label="Emergency"]');
  emBtn.click();
  
  const overlay = document.querySelector('.border-error.animate-pulse');
  expect(overlay).not.toBeNull();

  // Toast should be shown
  const toastContainer = document.querySelector('.fixed.bottom-4');
  expect(toastContainer.innerHTML).toContain('EMERGENCY PROTOCOL ACTIVATED');
});

test('Emergency overlay auto-removes after 4s', () => {
  initUI();
  const emBtn = document.querySelector('button[aria-label="Emergency"]');
  emBtn.click();
  
  const overlay = document.querySelector('.border-error.animate-pulse');
  expect(overlay).not.toBeNull();
  vi.advanceTimersByTime(4100);
  expect(document.querySelector('.border-error.animate-pulse')).toBeNull();
});

test('Emergency button clicks incident tab if present', () => {
  initUI();
  const incTab = document.querySelector('.nav-item[data-tab="incident"]');
  const clickSpy = vi.fn();
  incTab.addEventListener('click', clickSpy);

  const emBtn = document.querySelector('button[aria-label="Emergency"]');
  emBtn.click();

  expect(clickSpy).toHaveBeenCalledTimes(1);
});

test('Generic link without id gets click handler', () => {
  initUI();
  window.showToast = vi.fn();
  const link = document.querySelector('a[href="#"]:not(.nav-item)');
  link.click();
  expect(window.showToast).toHaveBeenCalledWith(expect.stringContaining('executed'));
});

test('Keydown Enter on button fires click', () => {
  initUI();
  window.showToast = vi.fn();
  const link = document.querySelector('a[href="#"]:not(.nav-item)');
  const clickSpy = vi.fn();
  link.addEventListener('click', clickSpy);

  const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
  link.dispatchEvent(enterEvent);
  expect(clickSpy).toHaveBeenCalled();
});

test('Keydown Space on button fires click', () => {
  initUI();
  window.showToast = vi.fn();
  const link = document.querySelector('a[href="#"]:not(.nav-item)');
  const clickSpy = vi.fn();
  link.addEventListener('click', clickSpy);

  const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
  link.dispatchEvent(spaceEvent);
  expect(clickSpy).toHaveBeenCalled();
});

test('initUI works when Emergency button is absent', () => {
  document.body.innerHTML = `<button id="btn1">Click</button>`;
  // Should not throw
  expect(() => initUI()).not.toThrow();
});
