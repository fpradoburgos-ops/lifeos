import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'


class LifeOSRenderBoundary extends React.Component<{children:React.ReactNode},{error:Error|null}> {
  state:{error:Error|null}={error:null};
  static getDerivedStateFromError(error:Error){return {error};}
  componentDidCatch(error:Error,info:React.ErrorInfo){console.error('LifeOS render error:',error,info);}
  render(){
    if(this.state.error)return <main style={{minHeight:'100vh',padding:24,boxSizing:'border-box',background:'#f5f5f7',color:'#202127',fontFamily:'system-ui, sans-serif'}}>
      <section style={{maxWidth:760,margin:'8vh auto',padding:24,border:'1px solid #dedee3',borderRadius:20,background:'#fff',boxShadow:'0 12px 40px rgba(0,0,0,.06)'}}>
        <div style={{fontSize:11,fontWeight:800,letterSpacing:'.12em',color:'#777'}}>LIFEOS · ERROR DE INICIO</div>
        <h1 style={{fontSize:25,margin:'10px 0'}}>La aplicación encontró un error</h1>
        <p style={{fontSize:14,lineHeight:1.6,color:'#555'}}>No debería quedarse en blanco. Copia el detalle de abajo y envíamelo para corregir el problema.</p>
        <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',padding:14,borderRadius:12,background:'#f1f1f4',fontSize:12}}>{this.state.error.message}{'\\n'}{this.state.error.stack}</pre>
        <button onClick={()=>window.location.reload()} style={{padding:'10px 15px',border:0,borderRadius:10,background:'#202127',color:'#fff',fontWeight:700,cursor:'pointer'}}>Recargar LifeOS</button>
      </section>
    </main>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LifeOSRenderBoundary><App /></LifeOSRenderBoundary>
  </StrictMode>,
)
