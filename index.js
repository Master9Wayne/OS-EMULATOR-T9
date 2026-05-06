/* ============================================
   MODERN OS EMULATOR - JAVASCRIPT
   ============================================ */

// ============ THEME MANAGEMENT ============
class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('themeToggle');
        this.isDarkMode = this.getStoredTheme() || true; // Default: dark mode
        this.init();
    }

    init() {
        this.applyTheme();
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.updateToggleIcon();
    }

    getStoredTheme() {
        const stored = localStorage.getItem('osemu-theme');
        return stored === null ? true : stored === 'dark';
    }

    applyTheme() {
        const body = document.body;
        if (this.isDarkMode) {
            body.classList.remove('light-mode');
        } else {
            body.classList.add('light-mode');
        }
        this.updateToggleIcon();
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('osemu-theme', this.isDarkMode ? 'dark' : 'light');
        this.applyTheme();
    }

    updateToggleIcon() {
        const icon = this.themeToggle.querySelector('i');
        if (this.isDarkMode) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            this.themeToggle.setAttribute('aria-label', 'Switch to light mode');
        } else {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            this.themeToggle.setAttribute('aria-label', 'Switch to dark mode');
        }
    }
}

// ============ DROPDOWN MENU ============
class DropdownMenu {
    constructor() {
        this.dropdowns = document.querySelectorAll('.nav-dropdown');
        this.init();
    }

    init() {
        // Add click handler to each dropdown toggle
        this.dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            if (toggle) {
                toggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleDropdown(dropdown);
                });
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-dropdown')) {
                this.closeAll();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAll();
            }
        });
    }

    toggleDropdown(dropdown) {
        const content = dropdown.querySelector('.dropdown-content');
        const isOpen = content.style.visibility === 'visible';
        
        this.closeAll();
        
        if (!isOpen) {
            content.style.visibility = 'visible';
            content.style.opacity = '1';
            content.style.pointerEvents = 'auto';
        }
    }

    closeAll() {
        this.dropdowns.forEach(dropdown => {
            const content = dropdown.querySelector('.dropdown-content');
            if (content) {
                content.style.visibility = 'hidden';
                content.style.opacity = '0';
                content.style.pointerEvents = 'none';
            }
        });
    }
}

// ============ SMOOTH SCROLL ============
class SmoothScroller {
    constructor() {
        this.init();
    }

    init() {
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => this.handleScroll(e, link));
        });
    }

    handleScroll(e, link) {
        const href = link.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);
        
        if (target) {
            const headerHeight = 80;
            const targetPosition = target.offsetTop - headerHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    }
}

// ============ SCROLL ANIMATIONS ============
class ScrollAnimations {
    constructor() {
        this.observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            this.observerOptions
        );
        this.init();
    }

    init() {
        document.querySelectorAll('.module-card, .team-member').forEach(el => {
            this.observer.observe(el);
        });
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
            }
        });
    }
}

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
    new DropdownMenu();
    new SmoothScroller();
    new ScrollAnimations();

    // Add fade-in animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);

    console.log('✨ OS Emulator loaded successfully!');
});

// Utility: Log theme change
window.addEventListener('storage', (e) => {
    if (e.key === 'osemu-theme') {
        location.reload();
    }
});