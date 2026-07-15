import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/modernist.css';
import './index.css';

// Service worker: show a tappable "update available" banner when a new deploy
// is detected (instead of a silent update that can feel like nothing changed).
const updateSW = registerSW({
  onNeedRefresh() {
    const bar = document.createElement('button');
    bar.textContent = '새 버전 업데이트 →';
    bar.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:99999;border:0;background:#ec3013;color:#f3f2f2;' +
      'font:800 13px/1 "Archivo",sans-serif;letter-spacing:.08em;padding:13px;text-align:center;cursor:pointer';
    bar.onclick = () => {
      bar.textContent = '업데이트 중…';
      void updateSW(true);
    };
    document.body.appendChild(bar);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
