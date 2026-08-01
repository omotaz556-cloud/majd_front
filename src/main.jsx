import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { WalletBalanceProvider } from './context/WalletBalanceContext.jsx';
import { InboxProvider } from './context/InboxContext.jsx';
import { AllianceProvider } from './context/AllianceContext.jsx';
import { BattleAlertProvider } from './context/BattleAlertContext.jsx';
import { ChatProvider } from './context/ChatContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { SoundProvider } from './components/ui/SoundProvider.jsx';
import { CoinFlyProvider } from './components/ui/CoinFlyProvider.jsx';
import AdsBootstrap from './ads/AdsBootstrap.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <WalletBalanceProvider>
            <InboxProvider>
              <AllianceProvider>
                <BattleAlertProvider>
                  <ChatProvider>
                    <SoundProvider>
                      <CoinFlyProvider>
                        <AdsBootstrap />
                        <App />
                      </CoinFlyProvider>
                    </SoundProvider>
                  </ChatProvider>
                </BattleAlertProvider>
              </AllianceProvider>
            </InboxProvider>
          </WalletBalanceProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
