/**
 * Header Bar - Top navigation with game controls
 * 
 * Contains game title, menu button, and optional dropdown menu.
 */

export interface HeaderCallbacks {
  onNewGame: () => void;
  onHelp: () => void;
  onBuildMenu: () => void;
  onToggleMobile: () => void;
  onChangelog: () => void;
}

export class Header {
  private container: HTMLElement;
  private dropdown: HTMLDivElement | null = null;
  private menuButton: HTMLButtonElement | null = null;
  private readonly handlePointerDownBound = this.handlePointerDown.bind(this);
  private readonly handleKeyDownBound = this.handleKeyDown.bind(this);

  constructor(callbacks: HeaderCallbacks) {
    this.container = this.createElement();
    this.addTitle();
    this.addSpacer();
    this.menuButton = this.addMenuButton();
    this.dropdown = this.createDropdown(callbacks);

    document.body.appendChild(this.dropdown);

    document.addEventListener('pointerdown', this.handlePointerDownBound);
    document.addEventListener('keydown', this.handleKeyDownBound);
  }

  private createElement(): HTMLElement {
    const header = document.createElement('header');
    // Styles come from style.css
    return header;
  }

  private addTitle(): void {
    const h1 = document.createElement('h1');
    h1.textContent = 'Colony Game';
    this.container.appendChild(h1);
  }

  private addSpacer(): void {
    const spacer = document.createElement('div');
    spacer.className = 'spacer';
    this.container.appendChild(spacer);
  }

  private addMenuButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = 'btnMenu';
    btn.textContent = '☰';
    btn.title = 'Menu';
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.onclick = () => this.toggleDropdown();
    this.container.appendChild(btn);
    return btn;
  }

  private createDropdown(callbacks: HeaderCallbacks): HTMLDivElement {
    const dropdown = document.createElement('div');
    dropdown.id = 'headerDropdown';
    dropdown.hidden = true;
    
    const btnNew = this.createDropdownButton('hd-new', 'New Game', callbacks.onNewGame);
    const btnHelp = this.createDropdownButton('hd-help', 'Help', callbacks.onHelp);
    const btnBuild = this.createDropdownButton('hd-build', 'Build Menu', callbacks.onBuildMenu);
    const btnChangelog = this.createDropdownButton('hd-changelog', 'Change Logs', callbacks.onChangelog);
    const btnToggleMobile = this.createDropdownButton('hd-toggle-mobile', 'Toggle Mobile UI', callbacks.onToggleMobile);
    
    dropdown.appendChild(btnNew);
    dropdown.appendChild(btnHelp);
    dropdown.appendChild(btnBuild);
    dropdown.appendChild(btnChangelog);
    dropdown.appendChild(btnToggleMobile);
    
    return dropdown;
  }

  private createDropdownButton(id: string, text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = id;
    btn.textContent = text;
    btn.onclick = () => {
      // Play UI click for header actions
      try { (window as any).game?.audioManager?.play('ui.click.primary'); } catch {}
      onClick();
      this.hideDropdown();
    };
    return btn;
  }

  /**
   * Toggle dropdown menu visibility
   */
  toggleDropdown(): void {
    if (this.dropdown) {
      this.dropdown.hidden = !this.dropdown.hidden;
      this.menuButton?.setAttribute('aria-expanded', String(!this.dropdown.hidden));
      try {
        (window as any).game?.audioManager?.play(this.dropdown.hidden ? 'ui.panel.close' : 'ui.panel.open');
      } catch {}
    }
  }

  /**
   * Show dropdown menu
   */
  showDropdown(): void {
    if (this.dropdown) {
      this.dropdown.hidden = false;
      this.menuButton?.setAttribute('aria-expanded', 'true');
      try { (window as any).game?.audioManager?.play('ui.panel.open'); } catch {}
    }
  }

  /**
   * Hide dropdown menu
   */
  hideDropdown(): void {
    if (this.dropdown) {
      this.dropdown.hidden = true;
      this.menuButton?.setAttribute('aria-expanded', 'false');
      try { (window as any).game?.audioManager?.play('ui.panel.close'); } catch {}
    }
  }

  private handlePointerDown(event: PointerEvent): void {
    if (!this.dropdown || this.dropdown.hidden) return;
    const target = event.target as Node | null;
    if (!target) return;
    if (this.dropdown.contains(target)) return;
    if (this.menuButton && this.menuButton.contains(target)) return;
    this.hideDropdown();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if ((event.key === 'Escape' || event.key === 'Esc') && this.dropdown && !this.dropdown.hidden) {
      this.hideDropdown();
    }
  }

  /**
   * Get the header element
   */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Get the dropdown element
   */
  getDropdown(): HTMLDivElement | null {
    return this.dropdown;
  }
}
