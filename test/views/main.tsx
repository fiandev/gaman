import React from 'react'
import ReactDOM from 'react-dom/client'
import Index from './Index' // Komponen lu yang tadi

const data = (window as any).__GAMAN_DATA__ || {};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Index {...data} />
  </React.StrictMode>
)