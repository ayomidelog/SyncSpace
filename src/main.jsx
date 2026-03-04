import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import PasswordGate from './components/PasswordGate.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <PasswordGate>
        <App />
      </PasswordGate>
    </ErrorBoundary>
  </React.StrictMode>,
)
