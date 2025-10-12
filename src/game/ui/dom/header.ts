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
}

export class Header {
  private container: HTMLElement;
  private dropdown: HTMLDivElement | null = null;
  private menuButton: HTMLButtonElement | null = null;

  constructor(callbacks: HeaderCallbacks) {
    this.container = this.createElement();
    this.addTitle();
    this.addSpacer();
    this.menuButton = this.addMenuButton();
    this.dropdown = this.createDropdown(callbacks);
    
    document.body.appendChild(this.dropdown);
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
    const btnToggleMobile = this.createDropdownButton('hd-toggle-mobile', 'Toggle Mobile UI', callbacks.onToggleMobile);
    
    dropdown.appendChild(btnNew);
    dropdown.appendChild(btnHelp);
    dropdown.appendChild(btnBuild);
    dropdown.appendChild(btnToggleMobile);
    
    return dropdown;
  }

  private createDropdownButton(id: string, text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = id;
    btn.textContent = text;
    btn.onclick = () => {
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
    }
  }

  /**
   * Show dropdown menu
   */
  showDropdown(): void {
    if (this.dropdown) {
      this.dropdown.hidden = false;
    }
  }

  /**
   * Hide dropdown menu
   */
  hideDropdown(): void {
    if (this.dropdown) {
      this.dropdown.hidden = true;
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
