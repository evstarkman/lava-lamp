/**
 * LavaLamp — A self-contained, physics-driven lava lamp component.
 * Zero dependencies. Works as UMD global or ES module.
 *
 * Usage:
 *   const lamp = new LavaLamp(document.getElementById('my-container'), { color: '#5ac8e8' });
 *   lamp.reveal(document.querySelector('.my-text'));
 *
 * @license MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LavaLamp = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // --- Internal Blob class ---
  class Blob {
    constructor(width, height, yOffset, colorHex) {
      this.baseRadius = Math.random() * 15 + 20;
      this.radius = this.baseRadius;
      this.rx = this.baseRadius;
      this.ry = this.baseRadius;
      this.x = width / 2 + (Math.random() - 0.5) * 20;
      this.y = height - 20 + yOffset;
      this.vx = (Math.random() - 0.5) * 0.01;
      this.vy = 0;
      this.cycle = Math.random() * 1500;
      this.state = 'bottom';
      this.color = colorHex;
      this.temperature = 0;
    }

    update(width, height) {
      this.cycle++;

      if (this.x < this.baseRadius + 10) this.vx += 0.001;
      if (this.x > width - this.baseRadius - 10) this.vx -= 0.001;
      this.x += this.vx;

      if (this.state === 'bottom') {
        this.vy = 0;
        this.y += (height - 20 - this.y) * 0.01;
        this.temperature += Math.random() * 0.005;
        if (Math.random() < 0.0005 && this.cycle > 1200 && this.temperature > 0.8) {
          this.state = 'rising';
          this.cycle = 0;
        }
      } else if (this.state === 'rising') {
        this.vy -= 0.0008;
        if (this.vy < -0.15) this.vy = -0.15;
        this.y += this.vy;
        this.temperature = 1;
        if (this.y < this.baseRadius + 20) {
          this.state = 'top';
          this.cycle = 0;
        }
      } else if (this.state === 'top') {
        this.vy *= 0.96;
        this.y += this.vy;
        this.temperature -= 0.003;
        if (Math.random() < 0.001 && this.cycle > 800 && this.temperature < 0.2) {
          this.state = 'falling';
          this.cycle = 0;
        }
      } else if (this.state === 'falling') {
        this.vy += 0.0008;
        if (this.vy > 0.18) this.vy = 0.18;
        this.y += this.vy;
        this.temperature -= 0.005;
        if (this.y > height - 30) {
          this.state = 'bottom';
          this.cycle = 0;
        }
      }

      this.temperature = Math.max(0.1, Math.min(1, this.temperature));
      if (this.vx > 0.08) this.vx = 0.08;
      if (this.vx < -0.08) this.vx = -0.08;

      let targetRx = this.baseRadius;
      let targetRy = this.baseRadius;

      if (Math.abs(this.vy) > 0.05) {
        targetRy = this.baseRadius * (1 + Math.abs(this.vy) * 2.5);
        targetRx = this.baseRadius * (1 - Math.abs(this.vy) * 0.8);
      } else {
        if (this.y < height * 0.25 || this.y > height * 0.8) {
          targetRy = this.baseRadius * 0.8;
          targetRx = this.baseRadius * 1.2;
        }
      }

      this.rx += (targetRx - this.rx) * 0.03;
      this.ry += (targetRy - this.ry) * 0.03;

      const leftX = 72 + this.y * (-52 / 260);
      const rightX = 108 + this.y * (52 / 260);
      const distL = this.x - leftX;
      const distR = rightX - this.x;
      const glassPadding = this.rx * 1.1;
      if (distL < glassPadding) this.vx += (glassPadding - distL) * 0.0004;
      if (distR < glassPadding) this.vx -= (glassPadding - distR) * 0.0004;
    }

    draw(ctx) {
      ctx.beginPath();
      ctx.fillStyle = this.color;
      ctx.ellipse(this.x, this.y, Math.max(5, this.rx), Math.max(5, this.ry), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    }

    drawLightEmit(glowCtx, wrapperX, wrapperY, colorRGB) {
      const globalX = wrapperX + this.x;
      const globalY = wrapperY + 40 + this.y;
      const castRadius = this.baseRadius * (12 + (this.temperature * 8));
      const heatAlpha = 0.01 + (this.temperature * 0.12);

      const radGrad = glowCtx.createRadialGradient(globalX, globalY, 0, globalX, globalY, castRadius);
      radGrad.addColorStop(0, `rgba(${colorRGB.r}, ${colorRGB.g}, ${colorRGB.b}, ${heatAlpha})`);
      radGrad.addColorStop(0.4, `rgba(${colorRGB.r}, ${colorRGB.g}, ${colorRGB.b}, ${heatAlpha * 0.3})`);
      radGrad.addColorStop(1, `rgba(${colorRGB.r}, ${colorRGB.g}, ${colorRGB.b}, 0)`);

      glowCtx.beginPath();
      glowCtx.fillStyle = radGrad;
      glowCtx.arc(globalX, globalY, castRadius, 0, Math.PI * 2);
      glowCtx.fill();
    }
  }

  // --- Main LavaLamp class ---
  class LavaLamp {
    /**
     * @param {HTMLElement} container - DOM element to render the lamp inside.
     * @param {Object} [options]
     * @param {string} [options.color='#5ac8e8'] - Wax color (hex).
     * @param {number} [options.width=180] - Lamp width in px.
     * @param {number} [options.height=430] - Lamp height in px.
     * @param {number} [options.blobCount=4] - Number of blobs.
     * @param {boolean} [options.glowEnabled=true] - Enable volumetric glow canvas.
     * @param {string} [options.wireframeColor='#111111'] - Wireframe stroke color.
     */
    constructor(container, options = {}) {
      this._container = container;
      this._opts = Object.assign({
        color: '#5ac8e8',
        width: 180,
        height: 430,
        blobCount: 4,
        glowEnabled: true,
        wireframeColor: '#111111'
      }, options);

      this._colorHex = this._opts.color;
      this._colorRGB = LavaLamp._hexToRGB(this._colorHex);
      this._animFrameId = null;
      this._revealedElements = new Set();
      this._revealStyleTag = null;
      this._destroyed = false;

      this._buildDOM();
      this._resize();
      this._initBlobs();

      this._onResize = () => this._resize();
      window.addEventListener('resize', this._onResize);

      // Start after a short delay to allow layout
      setTimeout(() => {
        this._resize();
        this._animate();
      }, 50);
    }

    // --- Public API ---

    /**
     * Make a DOM element's content only visible when illuminated by the lamp.
     * Works on text elements (headings, paragraphs, links, spans) and
     * non-text elements (applies mask-image instead of background-clip).
     * @param {HTMLElement} element
     */
    reveal(element) {
      if (!element || this._revealedElements.has(element)) return;
      this._revealedElements.add(element);

      // Ensure the shared stylesheet with gradient keyframes exists
      this._ensureRevealStyles();

      element.classList.add('ll-revealed');
      element.setAttribute('data-ll-revealed', '');
    }

    /**
     * Remove illumination from a previously revealed element.
     * @param {HTMLElement} element
     */
    unreveal(element) {
      if (!element || !this._revealedElements.has(element)) return;
      this._revealedElements.delete(element);
      element.classList.remove('ll-revealed');
      element.removeAttribute('data-ll-revealed');
    }

    /**
     * Change the wax color at runtime.
     * @param {string} hex
     */
    setColor(hex) {
      this._colorHex = hex;
      this._colorRGB = LavaLamp._hexToRGB(hex);
      if (this._blobs) {
        this._blobs.forEach(b => b.color = hex);
      }
    }

    /**
     * Destroy the lamp instance. Cleans up DOM, listeners, animation, and revealed elements.
     */
    destroy() {
      this._destroyed = true;
      if (this._animFrameId) cancelAnimationFrame(this._animFrameId);
      window.removeEventListener('resize', this._onResize);

      // Unreveal all elements
      this._revealedElements.forEach(el => {
        el.classList.remove('ll-revealed');
        el.removeAttribute('data-ll-revealed');
      });
      this._revealedElements.clear();

      // Remove injected style tag
      if (this._revealStyleTag && this._revealStyleTag.parentNode) {
        this._revealStyleTag.parentNode.removeChild(this._revealStyleTag);
      }

      // Clear CSS variables
      for (let i = 0; i < (this._opts.blobCount || 4); i++) {
        document.body.style.removeProperty(`--b${i}x`);
        document.body.style.removeProperty(`--b${i}y`);
        document.body.style.removeProperty(`--b${i}r`);
        document.body.style.removeProperty(`--b${i}a`);
      }

      // Remove DOM
      if (this._wrapper && this._wrapper.parentNode) {
        this._wrapper.parentNode.removeChild(this._wrapper);
      }
      if (this._glowCanvas && this._glowCanvas.parentNode) {
        this._glowCanvas.parentNode.removeChild(this._glowCanvas);
      }
      if (this._filterSvg && this._filterSvg.parentNode) {
        this._filterSvg.parentNode.removeChild(this._filterSvg);
      }
    }

    // --- Private: DOM construction ---

    _buildDOM() {
      const W = this._opts.width;
      const H = this._opts.height;
      const wfColor = this._opts.wireframeColor;

      // Ensure container is positioned
      const pos = getComputedStyle(this._container).position;
      if (pos === 'static') this._container.style.position = 'relative';

      // SVG filter for gooey blob merging
      this._id = Math.random().toString(36).substr(2, 6);
      this._filterSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this._filterSvg.setAttribute('style', 'width:0;height:0;position:absolute;');
      this._filterSvg.innerHTML = `<defs><filter id="ll-goo-${this._id}"><feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo"/><feComposite in="SourceGraphic" in2="goo" operator="atop"/></filter></defs>`;
      document.body.appendChild(this._filterSvg);

      // Glow canvas (sibling of container, covers the scene)
      if (this._opts.glowEnabled) {
        this._glowCanvas = document.createElement('canvas');
        Object.assign(this._glowCanvas.style, {
          position: 'absolute', top: '0', left: '0',
          width: '100%', height: '100%',
          zIndex: '1', pointerEvents: 'none',
          mixBlendMode: 'screen'
        });
        // Insert glow canvas into container's parent (the scene)
        this._container.parentNode.insertBefore(this._glowCanvas, this._container);
        this._glowCtx = this._glowCanvas.getContext('2d');
      }

      // Lamp wrapper
      this._wrapper = document.createElement('div');
      Object.assign(this._wrapper.style, {
        width: W + 'px', height: H + 'px',
        position: 'relative', zIndex: '3',
        filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.95))'
      });

      // SVG wireframe
      const wireframe = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      wireframe.setAttribute('viewBox', `0 0 ${W} ${H}`);
      Object.assign(wireframe.style, {
        position: 'absolute', top: '0', left: '0',
        width: '100%', height: '100%', zIndex: '3'
      });
      wireframe.innerHTML = `
        <polygon points="80,0 72,40 108,40 100,0" fill="#000000" stroke="${wfColor}" stroke-width="1.5"/>
        <line x1="72" y1="40" x2="20" y2="300" stroke="${wfColor}" stroke-width="1.5"/>
        <line x1="108" y1="40" x2="160" y2="300" stroke="${wfColor}" stroke-width="1.5"/>
        <polygon points="20,300 50,360 10,430 170,430 130,360 160,300" fill="#000000" stroke="${wfColor}" stroke-width="1.5"/>
      `;
      this._wrapper.appendChild(wireframe);

      // Glass container
      this._glass = document.createElement('div');
      Object.assign(this._glass.style, {
        position: 'absolute', top: '40px', left: '0',
        width: W + 'px', height: '260px',
        background: 'rgba(0, 5, 10, 0.3)',
        boxShadow: 'inset 0 0 20px rgba(120, 220, 255, 0.05)',
        clipPath: 'polygon(40% 0%, 60% 0%, 88.88% 100%, 11.11% 100%)',
        zIndex: '2'
      });

      // Lava canvas
      this._canvas = document.createElement('canvas');
      Object.assign(this._canvas.style, {
        display: 'block', width: '100%', height: '100%',
        filter: `url(#ll-goo-${this._id})`
      });
      this._ctx = this._canvas.getContext('2d');
      this._glass.appendChild(this._canvas);
      this._wrapper.appendChild(this._glass);

      this._container.appendChild(this._wrapper);
    }

    _ensureRevealStyles() {
      if (this._revealStyleTag) return;
      const n = this._opts.blobCount || 4;

      // Build the gradient layers string
      let gradients = [];
      for (let i = 0; i < n; i++) {
        gradients.push(`radial-gradient(circle at var(--b${i}x) var(--b${i}y), rgba(255,255,255,var(--b${i}a)) 0%, rgba(255,255,255,0) calc(var(--b${i}r) * 0.9), transparent var(--b${i}r))`);
      }
      const gradientStr = gradients.join(',\n    ');

      this._revealStyleTag = document.createElement('style');
      this._revealStyleTag.textContent = `
        .ll-revealed {
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
          background-color: transparent !important;
          background-image: ${gradientStr} !important;
          background-attachment: fixed !important;
          -webkit-background-clip: text !important;
          background-clip: text !important;
        }
        a.ll-revealed, a.ll-revealed:link, a.ll-revealed:visited, a.ll-revealed:hover, a.ll-revealed:active {
          text-decoration: none !important;
        }
      `;
      document.head.appendChild(this._revealStyleTag);
    }

    // --- Private: sizing ---

    _resize() {
      this._canvasWidth = this._glass.clientWidth;
      this._canvasHeight = this._glass.clientHeight;
      this._canvas.width = this._canvasWidth;
      this._canvas.height = this._canvasHeight;

      if (this._opts.glowEnabled && this._glowCanvas) {
        const scene = this._container.parentNode || this._container;
        this._glowWidth = scene.clientWidth;
        this._glowHeight = scene.clientHeight;
        this._glowCanvas.width = this._glowWidth;
        this._glowCanvas.height = this._glowHeight;
      }
    }

    // --- Private: blobs ---

    _initBlobs() {
      this._blobs = [];
      for (let i = 0; i < this._opts.blobCount; i++) {
        this._blobs.push(new Blob(
          this._glass.clientWidth || this._opts.width,
          this._glass.clientHeight || 260,
          i * 15,
          this._colorHex
        ));
      }
    }

    // --- Private: raycasting ---

    _castDynamicLight(ctx, lx, ly, radius, alpha, wrapperX, wrapperY) {
      const capL = { x: wrapperX + 72, y: wrapperY + 40 };
      const capR = { x: wrapperX + 108, y: wrapperY + 40 };

      const project = (p) => ({
        x: p.x + (p.x - lx) * 10000,
        y: p.y + (p.y - ly) * 10000
      });

      const proj_capL = project(capL);
      const proj_capR = project(capR);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(proj_capL.x, proj_capL.y);
      ctx.lineTo(capL.x, capL.y);
      ctx.lineTo(capR.x, capR.y);
      ctx.lineTo(proj_capR.x, proj_capR.y);
      ctx.lineTo(wrapperX + 10000, 10000);
      ctx.lineTo(wrapperX - 10000, 10000);
      ctx.closePath();
      ctx.clip();

      const rgb = this._colorRGB;
      const radGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius);
      radGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
      radGrad.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.4})`);
      radGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(lx, ly, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // --- Private: animation loop ---

    _animate() {
      if (this._destroyed) return;

      const ctx = this._ctx;
      const w = this._canvasWidth;
      const h = this._canvasHeight;

      ctx.clearRect(0, 0, w, h);

      const hasGlow = this._opts.glowEnabled && this._glowCtx;
      let glowCtx, glowW, glowH, wrapperX, wrapperY;

      if (hasGlow) {
        glowCtx = this._glowCtx;
        glowW = this._glowWidth;
        glowH = this._glowHeight;

        glowCtx.globalCompositeOperation = 'source-over';
        glowCtx.clearRect(0, 0, glowW, glowH);
        glowCtx.filter = 'none';
        glowCtx.globalCompositeOperation = 'screen';

        const wrapperRect = this._wrapper.getBoundingClientRect();
        const sceneRect = (this._container.parentNode || this._container).getBoundingClientRect();
        wrapperX = wrapperRect.left - sceneRect.left;
        wrapperY = wrapperRect.top - sceneRect.top;

        const bulbX = wrapperX + 90;
        const bulbY = wrapperY + 300;
        this._castDynamicLight(glowCtx, bulbX, bulbY, 120, 0.05, wrapperX, wrapperY);
      }

      // Blob-to-blob repulsion
      const blobs = this._blobs;
      for (let i = 0; i < blobs.length; i++) {
        for (let j = i + 1; j < blobs.length; j++) {
          const dx = blobs[j].x - blobs[i].x;
          const dy = blobs[j].y - blobs[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = (blobs[i].baseRadius + blobs[j].baseRadius) * 1.2;
          if (dist < minDist) {
            const overlap = minDist - dist;
            if (overlap > 5) {
              blobs[i].vx -= dx * 0.00001;
              blobs[i].vy -= dy * 0.00001;
              blobs[j].vx += dx * 0.00001;
              blobs[j].vy += dy * 0.00001;
            }
          }
        }
      }

      // Base pool
      let totalResting = 0;
      blobs.forEach(b => { if (b.y > h - 40) totalResting++; });
      const basePoolDepth = 8 + (totalResting * 4);

      ctx.beginPath();
      ctx.fillStyle = this._colorHex;
      ctx.rect(0, h - basePoolDepth, w, basePoolDepth);
      ctx.fill();
      ctx.closePath();

      ctx.beginPath();
      ctx.fillStyle = this._colorHex;
      ctx.rect(0, 0, w, 5);
      ctx.fill();
      ctx.closePath();

      // Update and draw blobs, emit light, set CSS variables
      blobs.forEach((blob, i) => {
        blob.update(w, h);
        blob.draw(ctx);

        if (hasGlow) {
          blob.drawLightEmit(glowCtx, wrapperX, wrapperY, this._colorRGB);
          this._castDynamicLight(glowCtx,
            wrapperX + blob.x, wrapperY + 40 + blob.y,
            blob.baseRadius * (15 + (blob.temperature * 10)),
            0.002 + (blob.temperature * 0.015),
            wrapperX, wrapperY
          );
        }

        // CSS variable injection for reveal system
        const globalX = (hasGlow ? wrapperX : 0) + blob.x;
        const globalY = (hasGlow ? wrapperY + 40 : 0) + blob.y;
        const trackingRadius = blob.baseRadius * (10 + (blob.temperature * 8));
        const fontAlpha = Math.min(0.40, 0.05 + (blob.temperature * 0.25));

        document.body.style.setProperty(`--b${i}x`, `${globalX}px`);
        document.body.style.setProperty(`--b${i}y`, `${globalY}px`);
        document.body.style.setProperty(`--b${i}r`, `${trackingRadius}px`);
        document.body.style.setProperty(`--b${i}a`, fontAlpha);
      });

      // Shadow projection
      if (hasGlow) {
        glowCtx.globalCompositeOperation = 'destination-out';
        glowCtx.filter = 'blur(15px)';
        glowCtx.fillStyle = 'rgba(0,0,0,1)';

        let massX = 0, massY = 0, massCount = 0.001;
        blobs.forEach(b => {
          massX += b.x * b.temperature;
          massY += b.y * b.temperature;
          massCount += b.temperature;
        });
        const opticalX = wrapperX + (massX / massCount);
        const opticalY = wrapperY + 40 + (massY / massCount);

        glowCtx.fillStyle = 'rgba(0,0,0,0.85)';

        // Cap shadow
        const capLeft = { x: wrapperX + 72, y: wrapperY + 40 };
        const capRight = { x: wrapperX + 108, y: wrapperY + 40 };
        const capProjL = { x: capLeft.x + (capLeft.x - opticalX) * 50, y: capLeft.y + (capLeft.y - opticalY) * 50 };
        const capProjR = { x: capRight.x + (capRight.x - opticalX) * 50, y: capRight.y + (capRight.y - opticalY) * 50 };

        glowCtx.beginPath();
        glowCtx.moveTo(capLeft.x, capLeft.y);
        glowCtx.lineTo(capRight.x, capRight.y);
        glowCtx.lineTo(capProjR.x, capProjR.y);
        glowCtx.lineTo(capProjL.x, capProjL.y);
        glowCtx.closePath();
        glowCtx.fill();

        // Base shadow
        const baseLeft = { x: wrapperX + 20, y: wrapperY + 300 };
        const baseRight = { x: wrapperX + 160, y: wrapperY + 300 };
        const baseProjL = { x: baseLeft.x + (baseLeft.x - opticalX) * 50, y: baseLeft.y + (baseLeft.y - opticalY) * 50 };
        const baseProjR = { x: baseRight.x + (baseRight.x - opticalX) * 50, y: baseRight.y + (baseRight.y - opticalY) * 50 };

        glowCtx.beginPath();
        glowCtx.moveTo(baseLeft.x, baseLeft.y);
        glowCtx.lineTo(baseRight.x, baseRight.y);
        glowCtx.lineTo(baseProjR.x, baseProjR.y);
        glowCtx.lineTo(baseProjL.x, baseProjL.y);
        glowCtx.closePath();
        glowCtx.fill();
      }

      this._animFrameId = requestAnimationFrame(() => this._animate());
    }

    // --- Static helpers ---

    static _hexToRGB(hex) {
      let c;
      if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        c = '0x' + c.join('');
        return { r: (c >> 16) & 255, g: (c >> 8) & 255, b: c & 255 };
      }
      return { r: 90, g: 200, b: 232 };
    }
  }

  return LavaLamp;
}));
