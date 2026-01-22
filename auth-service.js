// auth-service.js
class AuthService {
    constructor() {
        this.tokenKey = 'authToken';
        this.userKey = 'user';
        this.refreshTokenKey = 'authRefreshToken';
        this.tokenExpiryKey = 'authTokenExpiry';
        this.API_BASE_URL = 'http://localhost:3000/api/auth';
        this.initialize();
    }

    initialize() {
        // Load login attempts from localStorage
        this.loginAttempts = parseInt(localStorage.getItem('loginAttempts') || '0');
        this.MAX_ATTEMPTS = 5;
        this.LOCK_DURATION = 15 * 60 * 1000; // 15 minutes
    }

    // Get authentication token
    getToken() {
        // Try localStorage first
        let token = localStorage.getItem(this.tokenKey);
        
        // If not in localStorage, try sessionStorage
        if (!token) {
            token = sessionStorage.getItem(this.tokenKey);
        }
        
        // If not in sessionStorage, try cookies
        if (!token) {
            token = this.getCookie(this.tokenKey);
        }
        
        return token;
    }

    // Get refresh token
    getRefreshToken() {
        return localStorage.getItem(this.refreshTokenKey) || 
               sessionStorage.getItem(this.refreshTokenKey) ||
               this.getCookie(this.refreshTokenKey);
    }

    // Get user data
    getUser() {
        const userData = localStorage.getItem(this.userKey) || 
                        sessionStorage.getItem(this.userKey);
        return userData ? JSON.parse(userData) : null;
    }

    // Check if user is authenticated
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;

        // Check if token is expired
        const expiry = localStorage.getItem(this.tokenExpiryKey) || 
                      sessionStorage.getItem(this.tokenExpiryKey);
        if (expiry && new Date(expiry) < new Date()) {
            this.logout();
            return false;
        }

        return true;
    }

    // Check if user has specific role
    hasRole(role) {
        const user = this.getUser();
        return user && user.role === role;
    }

    // Check if user has any of the specified roles
    hasAnyRole(roles) {
        const user = this.getUser();
        return user && roles.includes(user.role);
    }

    // Get user permissions
    getPermissions() {
        const user = this.getUser();
        if (!user) return [];
        
        // Define permissions based on roles
        const rolePermissions = {
            'admin': [
                'view_dashboard', 'view_threats', 'submit_iocs', 'edit_iocs', 
                'delete_iocs', 'view_analytics', 'export_data', 'manage_users',
                'view_blockchain', 'ai_analysis'
            ],
            'analyst': [
                'view_dashboard', 'view_threats', 'submit_iocs', 'edit_iocs',
                'view_analytics', 'export_data', 'view_blockchain', 'ai_analysis'
            ],
            'user': [
                'view_dashboard', 'view_threats', 'submit_iocs', 'view_blockchain'
            ],
            'student': [
                'view_dashboard', 'view_threats', 'view_blockchain'
            ],
            'assistant': [
                'view_dashboard', 'view_threats', 'submit_iocs', 'ai_analysis'
            ]
        };
        
        return rolePermissions[user.role] || [];
    }

    // Check if user has specific permission
    hasPermission(permission) {
        const permissions = this.getPermissions();
        return permissions.includes(permission);
    }

    // Login method (compatible with your existing login page)
    async login(email, password, rememberMe = false) {
        try {
            // Check if account is locked
            if (this.isAccountLocked()) {
                throw new Error('ACCOUNT_LOCKED');
            }

            const response = await fetch(`${this.API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle failed login attempt
                this.handleFailedLogin();
                throw data;
            }

            // Reset login attempts on success
            this.resetLoginAttempts();

            // Store authentication data
            const storage = rememberMe ? localStorage : sessionStorage;
            
            storage.setItem(this.tokenKey, data.token);
            storage.setItem(this.userKey, JSON.stringify(data.user));
            
            // Store refresh token if provided
            if (data.refreshToken) {
                storage.setItem(this.refreshTokenKey, data.refreshToken);
            }
            
            // Store token expiry
            if (data.expiresIn) {
                const expiry = new Date();
                expiry.setSeconds(expiry.getSeconds() + data.expiresIn);
                storage.setItem(this.tokenExpiryKey, expiry.toISOString());
            }

            // Also set cookies for compatibility
            this.setCookie(this.tokenKey, data.token, data.expiresIn || 8 * 60 * 60);
            
            if (data.refreshToken) {
                this.setCookie(this.refreshTokenKey, data.refreshToken, 7 * 24 * 60 * 60);
            }

            // Dispatch login event
            window.dispatchEvent(new CustomEvent('auth:login', { detail: data.user }));
            
            return { success: true, ...data };

        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                error: error.error || error.message || 'Login failed' 
            };
        }
    }

    // Logout method
    logout() {
        // Clear all storage
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        localStorage.removeItem(this.refreshTokenKey);
        localStorage.removeItem(this.tokenExpiryKey);
        
        sessionStorage.removeItem(this.tokenKey);
        sessionStorage.removeItem(this.userKey);
        sessionStorage.removeItem(this.refreshTokenKey);
        sessionStorage.removeItem(this.tokenExpiryKey);
        
        // Clear cookies
        this.deleteCookie(this.tokenKey);
        this.deleteCookie(this.refreshTokenKey);
        
        // Clear login attempts
        this.resetLoginAttempts();
        
        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        // Redirect to login page
        window.location.href = 'login.html';
    }

    // Refresh token
    async refreshToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            
            // Update tokens
            const storage = localStorage.getItem(this.tokenKey) ? localStorage : sessionStorage;
            storage.setItem(this.tokenKey, data.token);
            
            if (data.refreshToken) {
                storage.setItem(this.refreshTokenKey, data.refreshToken);
            }
            
            if (data.expiresIn) {
                const expiry = new Date();
                expiry.setSeconds(expiry.getSeconds() + data.expiresIn);
                storage.setItem(this.tokenExpiryKey, expiry.toISOString());
            }

            return data.token;

        } catch (error) {
            console.error('Token refresh error:', error);
            this.logout();
            throw error;
        }
    }

    // Get auth headers for API requests
    async getAuthHeaders() {
        // Check if token is about to expire
        const expiry = localStorage.getItem(this.tokenExpiryKey) || 
                      sessionStorage.getItem(this.tokenExpiryKey);
        
        if (expiry) {
            const expiryDate = new Date(expiry);
            const now = new Date();
            const fiveMinutes = 5 * 60 * 1000;
            
            // If token expires in less than 5 minutes, refresh it
            if (expiryDate.getTime() - now.getTime() < fiveMinutes) {
                try {
                    const newToken = await this.refreshToken();
                    return {
                        'Authorization': `Bearer ${newToken}`,
                        'Content-Type': 'application/json'
                    };
                } catch (error) {
                    console.error('Failed to refresh token:', error);
                    // Continue with current token
                }
            }
        }

        const token = this.getToken();
        return {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
        };
    }

    // Validate current token
    async validateToken() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const response = await fetch(`${this.API_BASE_URL}/me`, {
                headers: await this.getAuthHeaders()
            });

            if (response.ok) {
                const user = await response.json();
                // Update user data if needed
                const currentUser = this.getUser();
                if (JSON.stringify(user) !== JSON.stringify(currentUser)) {
                    const storage = localStorage.getItem(this.tokenKey) ? localStorage : sessionStorage;
                    storage.setItem(this.userKey, JSON.stringify(user));
                }
                return true;
            }
            
            // If unauthorized, try to refresh token
            if (response.status === 401) {
                try {
                    await this.refreshToken();
                    return true;
                } catch (refreshError) {
                    return false;
                }
            }
            
            return false;

        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    // Check if account is locked
    isAccountLocked() {
        const lockUntil = localStorage.getItem('accountLockedUntil');
        if (lockUntil && Date.now() < parseInt(lockUntil)) {
            return true;
        }
        return false;
    }

    // Handle failed login attempt
    handleFailedLogin() {
        this.loginAttempts++;
        localStorage.setItem('loginAttempts', this.loginAttempts.toString());
        
        if (this.loginAttempts >= this.MAX_ATTEMPTS) {
            const lockUntil = Date.now() + this.LOCK_DURATION;
            localStorage.setItem('accountLockedUntil', lockUntil.toString());
            localStorage.setItem('loginAttempts', '0');
            this.loginAttempts = 0;
        }
    }

    // Reset login attempts
    resetLoginAttempts() {
        this.loginAttempts = 0;
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('accountLockedUntil');
    }

    // Session management
    startSessionTimer() {
        // Auto-logout after 8 hours of inactivity
        const inactivityTimeout = 8 * 60 * 60 * 1000;
        
        let inactivityTimer;
        
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                if (this.isAuthenticated()) {
                    this.showSessionExpiryWarning();
                }
            }, inactivityTimeout);
        };
        
        // Reset timer on user activity
        ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimer, { passive: true });
        });
        
        resetTimer();
    }

    // Show session expiry warning
    showSessionExpiryWarning() {
        if (!this.isAuthenticated()) return;
        
        // Create warning modal
        const warningModal = document.createElement('div');
        warningModal.id = 'sessionWarning';
        warningModal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                <div style="background: var(--bg-card); padding: 2rem; border-radius: 10px; max-width: 400px; text-align: center;">
                    <h3 style="color: var(--accent); margin-bottom: 1rem;">
                        <i class="fas fa-clock"></i> Session About to Expire
                    </h3>
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                        Your session will expire due to inactivity. Do you want to stay logged in?
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button id="extendSession" style="background: var(--primary); color: white; border: none; padding: 0.5rem 1.5rem; border-radius: 5px; cursor: pointer;">
                            Stay Logged In
                        </button>
                        <button id="logoutNow" style="background: transparent; color: var(--accent); border: 1px solid var(--accent); padding: 0.5rem 1.5rem; border-radius: 5px; cursor: pointer;">
                            Logout Now
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(warningModal);
        
        // Add event listeners
        document.getElementById('extendSession').addEventListener('click', () => {
            warningModal.remove();
            this.startSessionTimer();
        });
        
        document.getElementById('logoutNow').addEventListener('click', () => {
            warningModal.remove();
            this.logout();
        });
        
        // Auto-logout after 60 seconds if no action
        setTimeout(() => {
            if (document.getElementById('sessionWarning')) {
                warningModal.remove();
                this.logout();
            }
        }, 60000);
    }

    // Cookie helpers
    setCookie(name, value, seconds) {
        const date = new Date();
        date.setTime(date.getTime() + (seconds * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = `${name}=${value};${expires};path=/;Secure;SameSite=Strict`;
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    deleteCookie(name) {
        document.cookie = `${name}=; Max-Age=-99999999; path=/;`;
    }

    // Update user profile
    async updateProfile(userData) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/me`, {
                method: 'PUT',
                headers: await this.getAuthHeaders(),
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Profile update failed');
            }

            const data = await response.json();
            
            // Update stored user data
            const storage = localStorage.getItem(this.tokenKey) ? localStorage : sessionStorage;
            storage.setItem(this.userKey, JSON.stringify(data.user));
            
            window.dispatchEvent(new CustomEvent('auth:profile-updated', { detail: data.user }));
            
            return { success: true, user: data.user };

        } catch (error) {
            console.error('Profile update error:', error);
            return { success: false, error: error.message };
        }
    }

    // Change password
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/change-password`, {
                method: 'POST',
                headers: await this.getAuthHeaders(),
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await response.json();
            return { success: response.ok, data };

        } catch (error) {
            console.error('Password change error:', error);
            return { success: false, error: error.message };
        }
    }

    // Forgot password
    async forgotPassword(email) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            return { success: response.ok, data };

        } catch (error) {
            console.error('Forgot password error:', error);
            return { success: false, error: error.message };
        }
    }

    // Reset password with token
    async resetPassword(token, newPassword) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/reset-password/${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newPassword })
            });

            const data = await response.json();
            return { success: response.ok, data };

        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
const authService = new AuthService();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = authService;
} else {
    window.authService = authService;
}