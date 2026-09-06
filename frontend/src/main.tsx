import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
async function enableMocking() {
    // Always enable MSW worker for offline hackathon/demo readiness
    const { worker } = await import('./mocks/browser');
    return worker.start({
        onUnhandledRequest: 'bypass',
    });
}
enableMocking().then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
});
