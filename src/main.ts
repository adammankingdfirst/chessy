import { ChessUI } from './ui/ChessUI';
import './styles/chess.css';

class ChessApp {
  private ui: ChessUI;

  constructor() {
    this.init();
  }

  private init(): void {
    const appContainer = document.getElementById('app');
    if (!appContainer) {
      throw new Error('App container not found');
    }

    // Clear loading message
    appContainer.innerHTML = '';

    // Initialize the chess UI
    this.ui = new ChessUI(appContainer);

    // Add global error handling
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.showError('An unexpected error occurred. Please refresh the page.');
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.showError('A network error occurred. Please check your connection.');
    });
  }

  private showError(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fee;
      color: #c53030;
      padding: 15px 20px;
      border-radius: 8px;
      border: 1px solid #feb2b2;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      max-width: 300px;
      font-weight: 500;
    `;

    document.body.appendChild(errorDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ChessApp();
});

// Export for potential external use
export { ChessApp };