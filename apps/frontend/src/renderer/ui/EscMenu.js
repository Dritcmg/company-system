export class EscMenu {
  constructor() {
    this.isOpen = false;
    this._createHtml();
    this._addListeners();
  }

  _createHtml() {
    const overlay = document.createElement('div');
    overlay.id = 'esc-menu';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:none;flex-direction:column;align-items:center;justify-content:center;z-index:9999;color:white;font-family:monospace;';
    overlay.innerHTML = `
      <div style="background:rgba(20,20,30,0.9);padding:40px;border:2px solid #555;border-radius:12px;text-align:center;min-width:400px;box-shadow:0 0 30px rgba(0,0,0,0.5);">
        <h1 style="margin:0 0 10px 0;font-size:32px;">🦊 TYCOON CLAWS</h1>
        <p style="margin:0 0 30px 0;color:#aaa;letter-spacing:2px;">AI VIRTUAL OFFICE SYSTEM</p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:40px;text-align:left;">
          <div style="border:1px solid #444;padding:15px;border-radius:8px;background:rgba(0,0,0,0.3);">
            <h3 style="margin:0 0 10px 0;color:#FFB74D;">Gráficos</h3>
            <div style="display:flex;gap:5px;">
              <button class="quality-btn" data-level="low" style="background:#333;color:white;border:none;padding:5px 10px;cursor:pointer;">LOW</button>
              <button class="quality-btn" data-level="medium" style="background:#333;color:white;border:none;padding:5px 10px;cursor:pointer;">MED</button>
              <button class="quality-btn" data-level="high" style="background:#FFB74D;color:black;border:none;padding:5px 10px;cursor:pointer;">HIGH</button>
            </div>
          </div>
          <div style="border:1px solid #444;padding:15px;border-radius:8px;background:rgba(0,0,0,0.3);">
            <h3 style="margin:0 0 10px 0;color:#FFB74D;">Controles</h3>
            <div style="font-size:12px;line-height:1.5;">
              WASD: Mover<br>
              SHIFT: Correr<br>
              E: Interagir<br>
              R: Reunião<br>
              ESC: Menu
            </div>
          </div>
        </div>

        <button id="resume-btn" style="background:#FFB74D;color:black;border:none;padding:15px 40px;font-weight:bold;cursor:pointer;font-size:18px;border-radius:4px;transition:0.2s;">CONTINUAR</button>
      </div>
    `;
    document.body.appendChild(overlay);
    this.el = overlay;
  }

  _addListeners() {
    this.el.querySelector('#resume-btn').onclick = () => this.toggle();
    this.el.querySelectorAll('.quality-btn').forEach(btn => {
      btn.onclick = () => {
        const level = btn.dataset.level;
        window.dispatchEvent(new CustomEvent('graphics-quality', { detail: level }));
        this.el.querySelectorAll('.quality-btn').forEach(b => {
          b.style.background = '#333';
          b.style.color = 'white';
        });
        btn.style.background = '#FFB74D';
        btn.style.color = 'black';
      };
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.el.style.display = this.isOpen ? 'flex' : 'none';
    if (!this.isOpen && document.pointerLockElement !== document.body) {
      // document.body.requestPointerLock();
    }
  }
}
