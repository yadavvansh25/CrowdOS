import { expect, test, vi, beforeEach } from 'vitest';
import { initUI } from '../src/UIController.js';

beforeEach(() => {
  document.body.innerHTML = `
    <button id="normal-btn">Normal</button>
    <button aria-label="Emergency">Emergency</button>
    <a href="#" class="nav-item" data-tab="incident">Incident</a>
  `;
});

test('initUI injects toast container', () => {
  initUI();
  const toastContainer = document.querySelector('.fixed.bottom-4.left-1\\/2');
  expect(toastContainer).not.toBeNull();
});

test('Emergency button triggers pulse animation', () => {
  initUI();
  const emBtn = document.querySelector('button[aria-label="Emergency"]');
  emBtn.click();
  
  // Checking if the pulse overlay is appended to the body
  const overlay = document.querySelector('.border-error.animate-pulse');
  expect(overlay).not.toBeNull();
});
