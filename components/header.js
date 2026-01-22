// components/header.js
class CTIHeader extends HTMLElement {
    constructor() {
        super();
        this.auth = window.authService;
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.updateUserInfo();
        this.addEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background: rgba(10, 15, 28, 0.9);
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(42, 111, 255, 0.2);
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    z-index: 1000;
                }
                
                .header-container {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 0 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    height: 70px;
                }
                
                .logo {
                    display: flex;
                    align-items: center;
                    font-family: 'Montserrat', sans-serif;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #F8FAFC;
                    text-decoration: none;
                }
                
                .logo i {
                    color: #2A6FFF;
                    margin-right: 0.5rem;
                    text-shadow: 0 0 10px #2A6FFF;
                }
                
                .nav-links {
                    display: flex;
                    list-style: none;
                    gap: 2rem;
                }
                
                .nav-links a {
                    color: #F8FAFC;
                    text-decoration: none;
                    font-weight: 500;
                    font-size: 0.9rem;
                    transition: color 0.3s ease;
                    position: relative;
                }
                
                .nav-links a:hover {
                    color: #00F5FF;
                }
                
                .nav-links a.active:after {
                    content: '';
                    position: absolute;
                    bottom: -5px;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: linear-gradient(90deg, #2A6FFF, #00D4AA);
                }
                
                .user-section {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #64748B;
                }
                
                .user-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #2A6FFF, #9D4EDD);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 600;
                }
                
                .btn {
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.3s ease;
                    font-size: 0.9rem;
                    border: none;
                    cursor: pointer;
                }
                
                .btn-outline {
                    border: 1px solid #2A6FFF;
                    color: #2A6FFF;
                    background: transparent;
                }
                
                .btn-outline:hover {
                    background: #2A6FFF;
                    color: white;
                }
                
                .user-dropdown {
                    position: relative;
                }
                
                .dropdown-menu {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    background: rgba(10, 15, 28, 0.95);
                    border: 1px solid rgba(42, 111, 255, 0.2);
                    border-radius: 6px;
                    min-width: 200px;
                    display: none;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                }
                
                .dropdown-menu.show {
                    display: block;
                }
                
                .dropdown-item {
                    padding: 0.8rem 1rem;
                    color: #F8FAFC;
                    text-decoration: none;
                    display: block;
                    transition: background 0.3s ease;
                }
                
                .dropdown-item:hover {
                    background: rgba(42, 111, 255, 0.1);
                }
                
                .dropdown-divider {
                    height: 1px;
                    background: rgba(255, 255, 255, 0.1);
                    margin: 0.5rem 0;
                }
            </style>
            
            <div class="header-container">
                <a href="Platform.html" class="logo">
                    <i class="fas fa-shield-alt"></i>
                    CTI-Blockchain
                </a>
                
                <nav>
                    <ul class="nav-links">
                        <li><a href="Platform.html">Dashboard</a></li>
                        <li><a href="ThreatFeed.html">Threat Feed</a></li>
                        <li><a href="ThreatSearch.html">Search</a></li>
                        <li><a href="IocSubmission.html">Submit IOC</a></li>
                        <li><a href="BlockChainExplorer.html">Blockchain</a></li>
                    </ul>
                </nav>
                
                <div class="user-section">
                    <div class="user-info">
                        <div class="user-avatar" id="userAvatar">U</div>
                        <span id="userName">User</span>
                    </div>
                    <button class="btn btn-outline" id="logoutBtn">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </div>
        `;
    }

    updateUserInfo() {
        if (!this.auth || !this.auth.isAuthenticated()) return;
        
        const user = this.auth.getUser();
        if (!user) return;
        
        const avatar = this.shadowRoot.getElementById('userAvatar');
        const name = this.shadowRoot.getElementById('userName');
        
        if (avatar) {
            avatar.textContent = user.name 
                ? user.name.charAt(0).toUpperCase() 
                : user.email.charAt(0).toUpperCase();
        }
        
        if (name) {
            name.textContent = user.name || user.email.split('@')[0];
        }
    }

    addEventListeners() {
        const logoutBtn = this.shadowRoot.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (this.auth) {
                    this.auth.logout();
                } else {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                    window.location.href = 'login.html';
                }
            });
        }
    }
}

// Register the custom element
customElements.define('cti-header', CTIHeader);
