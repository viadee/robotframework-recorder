/* global document */

/**
 * Modern lightweight intro/tutorial system
 * Replaces ChardinJS with a minimal, modern implementation
 */

class IntroTour {
  constructor() {
    this.isActive = false;
    this.currentStep = 0;
    this.steps = [];
    this.overlay = null;
    this.tooltip = null;
  }

  /**
   * Initialize tour from data-intro attributes
   */
  init() {
    const elements = document.querySelectorAll('[data-intro]');
    this.steps = Array.from(elements).map(el => ({
      element: el,
      intro: el.getAttribute('data-intro'),
      position: el.getAttribute('data-position') || 'bottom'
    }));
  }

  /**
   * Start or toggle the tour
   */
  toggle() {
    if (this.isActive) {
      this.stop();
    } else {
      this.start();
    }
  }

  /**
   * Start the tour
   */
  start() {
    if (this.steps.length === 0) return;
    
    this.isActive = true;
    this.currentStep = 0;
    this._createUI();
    this._showStep(0);
  }

  /**
   * Stop the tour
   */
  stop() {
    this.isActive = false;
    this._removeUI();
  }

  /**
   * Show specific step
   */
  _showStep(index) {
    if (index >= this.steps.length) {
      this.stop();
      return;
    }

    this.currentStep = index;
    const step = this.steps[index];
    const rect = step.element.getBoundingClientRect();

    // Update overlay
    this.overlay.style.boxShadow = `0 0 0 9999px rgba(0, 0, 0, 0.7), 
      inset 0 0 0 1px rgba(0, 192, 181, 0.3)`;
    this.overlay.style.top = `${rect.top}px`;
    this.overlay.style.left = `${rect.left}px`;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;
    this.overlay.style.borderRadius = '4px';

    // Update tooltip
    this._positionTooltip(step, rect);
    this.tooltip.querySelector('.intro-text').textContent = step.intro;

    // Update button text
    const nextBtn = this.tooltip.querySelector('.intro-next');
    nextBtn.textContent = index === this.steps.length - 1 ? '✓ Done' : 'Next ›';
  }

  /**
   * Position tooltip relative to element
   */
  _positionTooltip(step, rect) {
    const padding = 12;
    let top, left;
    const tooltipWidth = 280;
    const tooltipHeight = 100;

    switch (step.position) {
      case 'bottom':
        top = rect.bottom + padding;
        left = Math.max(0, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 10));
        break;
      case 'top':
        top = rect.top - tooltipHeight - padding;
        left = Math.max(0, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 10));
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - padding;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + padding;
        break;
      default:
        top = rect.bottom + padding;
        left = Math.max(0, Math.min(rect.left, window.innerWidth - tooltipWidth - 10));
    }

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
  }

  /**
   * Create UI elements (overlay and tooltip)
   */
  _createUI() {
    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'intro-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      z-index: 9998;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(this.overlay);

    // Tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'intro-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      z-index: 9999;
      background: white;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 280px;
      font-size: 14px;
      line-height: 1.4;
      transition: all 0.3s ease;
      border-left: 4px solid #00c0b5;
    `;

    this.tooltip.innerHTML = `
      <div class="intro-text" style="margin-bottom: 12px; color: #333;"></div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button class="intro-skip" style="
          padding: 4px 12px;
          border: none;
          background: #f0f0f0;
          color: #666;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">Skip</button>
        <button class="intro-next" style="
          padding: 4px 12px;
          border: none;
          background: #00c0b5;
          color: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        ">Next ›</button>
      </div>
    `;

    document.body.appendChild(this.tooltip);

    // Event listeners
    this.overlay.addEventListener('click', () => this.stop());
    this.tooltip.querySelector('.intro-skip').addEventListener('click', () => this.stop());
    this.tooltip.querySelector('.intro-next').addEventListener('click', () => {
      this.currentStep++;
      if (this.currentStep < this.steps.length) {
        this._showStep(this.currentStep);
      } else {
        this.stop();
      }
    });

    // Keyboard support
    this._keyHandler = (e) => {
      if (!this.isActive) return;
      if (e.key === 'Escape') this.stop();
      if (e.key === 'ArrowRight') {
        this.currentStep++;
        if (this.currentStep < this.steps.length) {
          this._showStep(this.currentStep);
        } else {
          this.stop();
        }
      }
      if (e.key === 'ArrowLeft' && this.currentStep > 0) {
        this.currentStep--;
        this._showStep(this.currentStep);
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  /**
   * Remove UI elements
   */
  _removeUI() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
  }
}

// Export for use
if (typeof exports !== 'undefined') {
  exports.IntroTour = IntroTour;
}
