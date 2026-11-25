import React, { useEffect, useMemo, useState } from 'react';

type StudyCard = { id: number; front: string; back: string; deck: string; learned: boolean };
const readCards = (): StudyCard[] => { try { return JSON.parse(localStorage.getItem('lifeos_flashcards') || '[]'); } catch { return []; } };

export function FlashcardsWorkspace({ theme, isMobile }: { theme: any; isMobile: boolean }) {
  const [cards, setCards] = useState<StudyCard[]>(readCards);
  const [deck, setDeck] = useState('Todas');
  const [status, setStatus] = useState<'Todas'|'Pendientes'|'Aprendidas'>('Todas');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [newDeck, setNewDeck] = useState('');
  const [showBack, setShowBack] = useState(false);
  const [current, setCurrent] = useState(0);
  const [message, setMessage] = useState('');
  useEffect(() => { localStorage.setItem('lifeos_flashcards', JSON.stringify(cards)); }, [cards]);
  const decks = useMemo(() => ['Todas', ...Array.from(new Set(cards.map(c => c.deck)))], [cards]);
  const filtered = useMemo(() => cards.filter(c => (deck === 'Todas' || c.deck === deck) && (status === 'Todas' || (status === 'Aprendidas' ? c.learned : !c.learned))), [cards, deck, status]);
  const active = filtered.length ? filtered[current % filtered.length] : null;
  const panel: React.CSSProperties = { background: theme.card, border: '1px solid ' + theme.cardBorder, borderRadius: 18, padding: 17 };
  const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 11, borderRadius: 11, border: '1px solid ' + theme.cardBorder, background: theme.bg, color: theme.text, font: 'inherit' };
  const addCard = (e: React.FormEvent) => { e.preventDefault(); if (!front.trim() || !back.trim()) return; setCards(prev => [{ id: Date.now(), front: front.trim(), back: back.trim(), deck: newDeck.trim() || 'General', learned: false }, ...prev]); setFront(''); setBack(''); setMessage('Tarjeta agregada'); };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const raw = await file.text();
      let parsed: any[] = [];
      if (file.name.toLowerCase().endsWith('.json')) {
        const data = JSON.parse(raw); parsed = Array.isArray(data) ? data : (data.cards || data.flashcards || []);
      } else {
        parsed = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean).filter(line => !/^(front|pregunta|anverso)[,;\t|]/i.test(line)).map(line => {
          const parts = line.split(/[\t|;]|,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
          return { front: (parts[0] || '').replace(/^"|"$/g, '').trim(), back: (parts[1] || '').replace(/^"|"$/g, '').trim(), deck: (parts[2] || 'Importadas').replace(/^"|"$/g, '').trim() };
        });
      }
      const incoming = parsed.map((x: any, i: number) => ({ id: Date.now() + i, front: String(x.front ?? x.question ?? x.pregunta ?? x.term ?? '').trim(), back: String(x.back ?? x.answer ?? x.respuesta ?? x.definition ?? '').trim(), deck: String(x.deck ?? x.baraja ?? x.subject ?? 'Importadas'), learned: Boolean(x.learned ?? x.aprendida) })).filter(x => x.front && x.back);
      if (!incoming.length) throw new Error('No encontré tarjetas. Usa columnas front, back y deck, o pregunta|respuesta|baraja.');
      setCards(prev => [...incoming, ...prev]); setMessage('Se importaron ' + incoming.length + ' tarjetas correctamente.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo leer el archivo.'); }
  };
  return <div style={{ maxWidth: 1500, margin: '0 auto', display: 'grid', gap: 15 }}>
    <header><div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.12em', color: theme.textMuted }}>ESTUDIO ACTIVO</div><h2 style={{ fontSize: 24, margin: '5px 0' }}>Flashcards</h2><p style={{ color: theme.textMuted, fontSize: 13 }}>Recuerda, repasa y organiza tus tarjetas por ramo o baraja.</p></header>
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,minmax(0,1fr))', gap: 10 }}>
      {[['Tarjetas', cards.length], ['Aprendidas', cards.filter(c => c.learned).length], ['Por aprender', cards.filter(c => !c.learned).length]].map(([label, value]) => <div key={String(label)} style={panel}><div style={{ fontSize: 11, color: theme.textMuted }}>{label}</div><div style={{ fontSize: 25, fontWeight: 900, marginTop: 4 }}>{value}</div></div>)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.15fr) minmax(300px,.85fr)', gap: 14, alignItems: 'start' }}>
      <section style={{ ...panel, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 16 }}>Zona de repaso</h3><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><select value={deck} onChange={e => { setDeck(e.target.value); setCurrent(0); setShowBack(false); }} style={{ ...field, width: 'auto', padding: '7px 9px' }}>{decks.map(d => <option key={d}>{d}</option>)}</select><select value={status} onChange={e => { setStatus(e.target.value as any); setCurrent(0); setShowBack(false); }} style={{ ...field, width: 'auto', padding: '7px 9px' }}><option>Todas</option><option>Pendientes</option><option>Aprendidas</option></select></div></div>
        {active ? <div>
          <button onClick={() => setShowBack(v => !v)} style={{ width: '100%', minHeight: 230, padding: 24, borderRadius: 16, border: '1px solid ' + theme.cardBorder, background: theme.bg, color: theme.text, cursor: 'pointer', textAlign: 'center', display: 'grid', placeContent: 'center', gap: 12 }}>
            <span style={{ fontSize: 10, letterSpacing: '.12em', color: theme.textMuted, fontWeight: 900 }}>{showBack ? 'RESPUESTA' : 'PREGUNTA'} · {active.deck.toUpperCase()}</span>
            <span style={{ fontSize: 20, lineHeight: 1.45, fontWeight: 750, whiteSpace: 'pre-wrap' }}>{showBack ? active.back : active.front}</span>
            <span style={{ fontSize: 11, color: theme.textMuted }}>Toca para {showBack ? 'ver la pregunta' : 'revelar la respuesta'}</span>
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button onClick={() => { setCurrent(v => (v - 1 + filtered.length) % filtered.length); setShowBack(false); }} style={{ ...field, width: 'auto', cursor: 'pointer' }}>← Anterior</button>
            <button onClick={() => { setCards(prev => prev.map(c => c.id === active.id ? { ...c, learned: !c.learned } : c)); setShowBack(false); }} style={{ ...field, width: 'auto', cursor: 'pointer', fontWeight: 800 }}>{active.learned ? '↩ Repasar de nuevo' : '✓ Marcar aprendida'}</button>
            <button onClick={() => { setCurrent(v => (v + 1) % filtered.length); setShowBack(false); }} style={{ ...field, width: 'auto', cursor: 'pointer' }}>Siguiente →</button>
          </div>
          <div style={{ fontSize: 11, color: theme.textMuted, textAlign: 'center', marginTop: 9 }}>{current % filtered.length + 1} de {filtered.length}</div>
        </div> : <div style={{ padding: 35, textAlign: 'center', color: theme.textMuted }}>No hay tarjetas en este filtro. Crea una o importa un archivo para comenzar.</div>}
      </section>
      <div style={{ display: 'grid', gap: 14 }}>
        <form onSubmit={addCard} style={{ ...panel, display: 'grid', gap: 9 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>Crear tarjeta manual</h3>
          <input required value={front} onChange={e => setFront(e.target.value)} placeholder="Pregunta / concepto" style={field}/>
          <textarea required rows={3} value={back} onChange={e => setBack(e.target.value)} placeholder="Respuesta / explicación" style={{ ...field, resize: 'vertical' }}/>
          <input value={newDeck} onChange={e => setNewDeck(e.target.value)} placeholder="Ramo o baraja (ej. Química)" style={field}/>
          <button type="submit" style={{ border: 0, borderRadius: 11, padding: 11, background: theme.text, color: theme.bg, fontWeight: 900, cursor: 'pointer' }}>Agregar tarjeta</button>
        </form>
        <section style={panel}>
          <h3 style={{ fontSize: 16, margin: '0 0 7px' }}>Importar desde IA</h3>
          <p style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5, marginBottom: 10 }}>Puedes pedirle a ChatGPT o Gemini que genere un archivo CSV o JSON y subirlo aquí. No requiere conexión con otra IA ni API.</p>
          <label style={{ display: 'block', padding: 12, border: '1px dashed ' + theme.cardBorder, borderRadius: 12, cursor: 'pointer', textAlign: 'center', fontSize: 12, fontWeight: 800 }}>＋ Seleccionar archivo CSV, TXT o JSON<input type="file" accept=".csv,.txt,.json,text/csv,text/plain,application/json" onChange={e => { void importFile(e.target.files?.[0]); e.currentTarget.value = ''; }} style={{ display: 'none' }}/></label>
          <p style={{ fontSize: 10, color: theme.textMuted, marginTop: 8 }}>Formato: front,back,deck · o una línea por tarjeta: pregunta|respuesta|baraja.</p>
          {message && <p role="status" style={{ fontSize: 11, color: theme.textMuted, marginTop: 8 }}>{message}</p>}
        </section>
        <section style={panel}>
          <h3 style={{ fontSize: 15, margin: '0 0 8px' }}>Barajas</h3>
          {decks.filter(d => d !== 'Todas').length ? decks.filter(d => d !== 'Todas').map(d => <div key={d} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid ' + theme.cardBorder, fontSize: 12 }}><span>{d}</span><span style={{ color: theme.textMuted }}>{cards.filter(c => c.deck === d).length} tarjetas</span></div>) : <p style={{ color: theme.textMuted, fontSize: 12 }}>Tus barajas aparecerán aquí.</p>}
        </section>
      </div>
    </div>
    <section style={panel}><h3 style={{ fontSize: 15, margin: '0 0 8px' }}>Todas las tarjetas</h3>{cards.length ? cards.map(c => <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid ' + theme.cardBorder }}><div style={{ minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 800 }}>{c.front}</div><div style={{ fontSize: 10, color: theme.textMuted }}>{c.deck} · {c.learned ? 'Aprendida' : 'Pendiente'}</div></div><button onClick={() => setCards(prev => prev.filter(x => x.id !== c.id))} title="Eliminar tarjeta" style={{ border: 0, background: 'transparent', color: theme.textMuted, cursor: 'pointer' }}>×</button></div>) : <p style={{ fontSize: 12, color: theme.textMuted }}>Aún no has creado tarjetas.</p>}</section>
  </div>;
}

type EnglishWord = { id:number; word:string; meaning:string; example:string; learned:boolean };
type EnglishNote = { id:number; title:string; text:string; date:string };
export function EnglishWorkspace({ theme, isMobile }: { theme:any; isMobile:boolean }) {
 const [words,setWords]=useState<EnglishWord[]>(()=>{try{return JSON.parse(localStorage.getItem('lifeos_english_words')||'[]')}catch{return[]}});
 const [notes,setNotes]=useState<EnglishNote[]>(()=>{try{return JSON.parse(localStorage.getItem('lifeos_english_notes')||'[]')}catch{return[]}});
 const [word,setWord]=useState(''),[meaning,setMeaning]=useState(''),[example,setExample]=useState('');
 const [level,setLevel]=useState(()=>localStorage.getItem('lifeos_english_level')||'A2');
 const [tab,setTab]=useState<'Ruta'|'Grammar'|'Vocabulary'|'Practice'|'Writing'|'Resources'>('Ruta');
 const [question,setQuestion]=useState(0),[answer,setAnswer]=useState(''),[showExplanation,setShowExplanation]=useState(false);
 const [noteTitle,setNoteTitle]=useState(''),[noteText,setNoteText]=useState('');
 useEffect(()=>{localStorage.setItem('lifeos_english_words',JSON.stringify(words))},[words]);
 useEffect(()=>{localStorage.setItem('lifeos_english_notes',JSON.stringify(notes))},[notes]);
 useEffect(()=>{localStorage.setItem('lifeos_english_level',level)},[level]);
 const panel:React.CSSProperties={background:theme.card,border:'1px solid '+theme.cardBorder,borderRadius:18,padding:17,minWidth:0};
 const field:React.CSSProperties={width:'100%',boxSizing:'border-box',padding:11,borderRadius:11,border:'1px solid '+theme.cardBorder,background:theme.bg,color:theme.text,font:'inherit'};
 const lessons=[
  {title:'Present simple',level:'A1',rule:'Rutinas, hábitos y hechos. En he/she/it agrega -s o -es.',example:'She studies chemistry every morning.',translation:'Ella estudia química todas las mañanas.'},
  {title:'Present continuous',level:'A1',rule:'am/is/are + verbo-ing para acciones en curso o situaciones temporales.',example:'I am preparing for my exam.',translation:'Estoy preparándome para mi examen.'},
  {title:'Past simple',level:'A2',rule:'Acciones terminadas en un momento pasado. Verbos regulares -ed e irregulares.',example:'We studied together yesterday.',translation:'Estudiamos juntos ayer.'},
  {title:'Future: will / going to',level:'A2',rule:'Will para decisiones espontáneas o predicciones; going to para planes e intenciones.',example:'I am going to review the lesson tonight.',translation:'Voy a repasar la lección esta noche.'},
  {title:'Present perfect',level:'B1',rule:'Have/has + participio. Experiencias o acciones pasadas conectadas con el presente.',example:'I have already finished my homework.',translation:'Ya he terminado mi tarea.'},
  {title:'Comparatives & superlatives',level:'A2',rule:'Compara: faster than. Máximo grado: the fastest. Adjetivos largos: more / most.',example:'This exercise is more difficult than the last one.',translation:'Este ejercicio es más difícil que el anterior.'},
  {title:'Modal verbs',level:'B1',rule:'Can (habilidad), must (obligación), should (consejo), might (posibilidad).',example:'You should practice a little every day.',translation:'Deberías practicar un poco cada día.'},
  {title:'First conditional',level:'B1',rule:'If + present simple, will + verbo base. Consecuencia probable.',example:'If I practice, I will improve.',translation:'Si practico, mejoraré.'},
  {title:'Passive voice',level:'B2',rule:'be + participio. Se usa cuando importa más la acción que quién la realiza.',example:'The results were published yesterday.',translation:'Los resultados fueron publicados ayer.'},
  {title:'Reported speech',level:'B2',rule:'Al reportar palabras, los tiempos suelen retroceder: am → was, will → would.',example:'She said she was tired.',translation:'Ella dijo que estaba cansada.'}
 ];
 const questions=[
  {q:'My brother ___ English every day.',opts:['study','studies','studying'],a:'studies',why:'He / she / it requiere -s en present simple.'},
  {q:'Look! The students ___ an experiment.',opts:['are doing','do','did'],a:'are doing',why:'Look! señala una acción que ocurre ahora: present continuous.'},
  {q:'We ___ the assignment last night.',opts:['finish','have finish','finished'],a:'finished',why:'Last night indica un tiempo pasado terminado.'},
  {q:'I have never ___ to London.',opts:['be','been','was'],a:'been',why:'Present perfect usa el past participle: been.'},
  {q:'If it rains, we ___ at home.',opts:['stay','will stay','stayed'],a:'will stay',why:'First conditional: If + present, will + base verb.'},
  {q:'You ___ wear a lab coat in the laboratory.',opts:['must','might','would'],a:'must',why:'Must expresa obligación o regla.'},
  {q:'This is the ___ book in the course.',opts:['more useful','most useful','usefulest'],a:'most useful',why:'Superlativo de adjetivo largo: the most + adjective.'},
  {q:'The samples ___ at 8 a.m. yesterday.',opts:['were collected','collected','are collect'],a:'were collected',why:'Pasiva en pasado: was/were + participio.'},
  {q:'She said she ___ busy.',opts:['is','was','be'],a:'was',why:'En estilo indirecto, is suele retroceder a was.'}
 ];
 const q=questions[question%questions.length];
 const pill=(active:boolean):React.CSSProperties=>({padding:'8px 12px',borderRadius:999,border:'1px solid '+theme.cardBorder,background:active?theme.text:theme.bg,color:active?theme.bg:theme.text,fontSize:12,fontWeight:750,cursor:'pointer'});
 const saveWord=(e:React.FormEvent)=>{e.preventDefault();if(!word.trim()||!meaning.trim())return;setWords(v=>[{id:Date.now(),word:word.trim(),meaning:meaning.trim(),example:example.trim(),learned:false},...v]);setWord('');setMeaning('');setExample('')};
 const saveNote=(e:React.FormEvent)=>{e.preventDefault();if(!noteTitle.trim()||!noteText.trim())return;setNotes(v=>[{id:Date.now(),title:noteTitle.trim(),text:noteText.trim(),date:new Date().toLocaleDateString('es-CL')},...v]);setNoteTitle('');setNoteText('')};
 return <div style={{maxWidth:1500,margin:'0 auto',display:'grid',gap:15}}>
  <header style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}><div><div className="lifeos-overline">LANGUAGE LAB · PERSONAL LEARNING</div><h1 style={{fontSize:isMobile?26:34,margin:'5px 0'}}>English</h1><p style={{fontSize:13,color:theme.textMuted}}>Una ruta completa para avanzar en vocabulario, gramática, comprensión y expresión.</p></div><div style={{display:'flex',gap:8,alignItems:'center'}}><span style={{fontSize:11,color:theme.textMuted}}>Mi nivel</span><select value={level} onChange={e=>setLevel(e.target.value)} style={{...field,width:'auto'}}>{['A1','A2','B1','B2','C1'].map(x=><option key={x}>{x}</option>)}</select></div></header>
  <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,minmax(0,1fr))':'repeat(4,minmax(0,1fr))',gap:9}}>{[['Nivel actual',level],['Vocabulario',words.length],['Palabras dominadas',words.filter(w=>w.learned).length],['Notas de escritura',notes.length]].map(([k,v])=><div key={String(k)} style={panel}><div style={{fontSize:11,color:theme.textMuted}}>{k}</div><div style={{fontSize:24,fontWeight:850,marginTop:4}}>{v}</div></div>)}</div>
  <div style={{display:'flex',gap:7,overflowX:'auto',paddingBottom:3}}>{(['Ruta','Grammar','Vocabulary','Practice','Writing','Resources'] as const).map(x=><button key={x} onClick={()=>setTab(x)} style={pill(tab===x)}>{x}</button>)}</div>
  {tab==='Ruta'&&<div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1.2fr .8fr',gap:13}}><section style={panel}><h2 style={{fontSize:17,margin:'0 0 10px'}}>Tu ruta de aprendizaje</h2>{[{l:'A1 · Beginner',d:'Presentarte, preguntas básicas, verb to be, presente simple y vocabulario cotidiano.'},{l:'A2 · Elementary',d:'Pasado, futuro, comparaciones, situaciones comunes y conversaciones simples.'},{l:'B1 · Intermediate',d:'Experiencias, opiniones, condicionales, modales y textos de mediana extensión.'},{l:'B2 · Upper-intermediate',d:'Pasiva, estilo indirecto, argumentos, comprensión de contenido auténtico.'},{l:'C1 · Advanced',d:'Matices, fluidez, precisión, textos académicos y comunicación profesional.'}].map((x,i)=><div key={x.l} style={{display:'flex',gap:12,padding:'12px 0',borderBottom:'1px solid '+theme.cardBorder}}><div style={{width:35,height:35,borderRadius:12,background:level===x.l.slice(0,2)?theme.text:theme.bg,color:level===x.l.slice(0,2)?theme.bg:theme.text,display:'grid',placeItems:'center',fontSize:11,fontWeight:850,flexShrink:0}}>{i+1}</div><div><strong style={{fontSize:13}}>{x.l}</strong><p style={{fontSize:12,color:theme.textMuted,marginTop:4,lineHeight:1.5}}>{x.d}</p></div></div>)}</section><section style={panel}><h2 style={{fontSize:17,margin:'0 0 10px'}}>Rutina sugerida · 25 min</h2>{[['5 min','Vocabulary','Aprende 5 palabras nuevas'],['7 min','Grammar','Revisa una regla y ejemplos'],['7 min','Listening','Escucha un audio corto'],['6 min','Speaking / Writing','Resume lo aprendido en voz alta o por escrito']].map(x=><div key={x[1]} style={{padding:'10px 0',borderBottom:'1px solid '+theme.cardBorder}}><div style={{fontSize:10,color:theme.textMuted}}>{x[0]}</div><strong style={{fontSize:13}}>{x[1]}</strong><div style={{fontSize:11,color:theme.textMuted,marginTop:3}}>{x[2]}</div></div>)}</section></div>}
  {tab==='Grammar'&&<section style={panel}><h2 style={{fontSize:17,margin:'0 0 4px'}}>Grammar library</h2><p style={{fontSize:12,color:theme.textMuted,marginBottom:12}}>Reglas breves, ejemplos y traducción. Filtra mentalmente por tu nivel y avanza progresivamente.</p><div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(2,minmax(0,1fr))',gap:9}}>{lessons.map(x=><article key={x.title} style={{padding:13,borderRadius:14,border:'1px solid '+theme.cardBorder,background:theme.bg}}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><strong style={{fontSize:13}}>{x.title}</strong><span style={{fontSize:10,color:theme.textMuted}}>{x.level}</span></div><p style={{fontSize:12,color:theme.textMuted,lineHeight:1.55,margin:'8px 0'}}>{x.rule}</p><p style={{fontSize:13,fontWeight:750}}>{x.example}</p><p style={{fontSize:11,color:theme.textMuted,marginTop:3}}>{x.translation}</p></article>)}</div></section>}
  {tab==='Vocabulary'&&<div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'minmax(260px,.75fr) minmax(0,1.25fr)',gap:13,alignItems:'start'}}><form onSubmit={saveWord} style={{...panel,display:'grid',gap:9}}><h3 style={{fontSize:16,margin:0}}>Add a word</h3><input required value={word} onChange={e=>setWord(e.target.value)} placeholder="Word or expression" style={field}/><input required value={meaning} onChange={e=>setMeaning(e.target.value)} placeholder="Significado en español" style={field}/><textarea rows={3} value={example} onChange={e=>setExample(e.target.value)} placeholder="Example sentence" style={field}/><button style={{padding:11,border:0,borderRadius:12,background:theme.text,color:theme.bg,fontWeight:800}}>Save vocabulary</button></form><section style={panel}><h3 style={{fontSize:16,margin:'0 0 8px'}}>Vocabulary notebook</h3>{words.length?words.map(w=><div key={w.id} style={{display:'flex',justifyContent:'space-between',gap:8,padding:'10px 0',borderBottom:'1px solid '+theme.cardBorder}}><div><strong style={{fontSize:13}}>{w.word}</strong><div style={{fontSize:11,color:theme.textMuted}}>{w.meaning}{w.example?' · '+w.example:''}</div></div><button onClick={()=>setWords(v=>v.map(x=>x.id===w.id?{...x,learned:!x.learned}:x))} style={pill(w.learned)}>{w.learned?'Learned ✓':'Mark learned'}</button></div>):<p style={{fontSize:12,color:theme.textMuted}}>Agrega palabras nuevas para construir tu propio diccionario.</p>}</section></div>}
  {tab==='Practice'&&<section style={{...panel,maxWidth:850}}><div className="lifeos-overline">QUICK TEST · {level}</div><h2 style={{fontSize:19,margin:'6px 0 12px'}}>Choose the correct answer</h2><div style={{fontSize:16,fontWeight:800,marginBottom:14}}>{q.q}</div><div style={{display:'grid',gap:8}}>{q.opts.map(o=><button key={o} onClick={()=>{setAnswer(o);setShowExplanation(true)}} style={{...pill(answer===o),textAlign:'left',borderRadius:12,padding:12}}>{o}</button>)}</div>{showExplanation&&<div style={{padding:12,borderRadius:12,background:theme.bg,border:'1px solid '+theme.cardBorder,marginTop:12,fontSize:12}}><strong style={{color:answer===q.a?'#16a34a':'#d97706'}}>{answer===q.a?'Correct!':'Try again.'}</strong><p style={{marginTop:4,color:theme.textMuted}}>{q.why}</p></div>}<div style={{display:'flex',justifyContent:'space-between',marginTop:14,alignItems:'center'}}><span style={{fontSize:11,color:theme.textMuted}}>Question {question+1} / {questions.length}</span><button onClick={()=>{setQuestion(v=>(v+1)%questions.length);setAnswer('');setShowExplanation(false)}} style={pill(false)}>Next question →</button></div></section>}
  {tab==='Writing'&&<div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'minmax(260px,.8fr) minmax(0,1.2fr)',gap:13,alignItems:'start'}}><form onSubmit={saveNote} style={{...panel,display:'grid',gap:9}}><h3 style={{fontSize:16,margin:0}}>Writing journal</h3><input required value={noteTitle} onChange={e=>setNoteTitle(e.target.value)} placeholder="Topic / title" style={field}/><textarea required rows={8} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Write a short paragraph in English…" style={field}/><button style={{padding:11,border:0,borderRadius:12,background:theme.text,color:theme.bg,fontWeight:800}}>Save entry</button><p style={{fontSize:11,color:theme.textMuted}}>Idea: describe your day, explain a scientific concept or summarize a video.</p></form><section style={panel}><h3 style={{fontSize:16,margin:'0 0 8px'}}>My writing</h3>{notes.length?notes.map(n=><article key={n.id} style={{padding:'12px 0',borderBottom:'1px solid '+theme.cardBorder}}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><strong style={{fontSize:13}}>{n.title}</strong><span style={{fontSize:10,color:theme.textMuted}}>{n.date}</span></div><p style={{fontSize:12,whiteSpace:'pre-wrap',lineHeight:1.6,marginTop:7,color:theme.textMuted}}>{n.text}</p></article>):<p style={{fontSize:12,color:theme.textMuted}}>Tus textos aparecerán aquí.</p>}</section></div>}
  {tab==='Resources'&&<div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(2,minmax(0,1fr))',gap:12}}>{[{t:'BBC Learning English',d:'Lecciones, pronunciación, vocabulario y noticias adaptadas.',u:'https://www.bbc.co.uk/learningenglish'},{t:'VOA Learning English',d:'Audios y artículos con ritmo de habla más pausado.',u:'https://learningenglish.voanews.com/'},{t:'British Council LearnEnglish',d:'Gramática, listening, reading y ejercicios por nivel.',u:'https://learnenglish.britishcouncil.org/'},{t:'Cambridge Dictionary',d:'Definiciones, pronunciación británica y americana, ejemplos.',u:'https://dictionary.cambridge.org/'},{t:'ELLLO',d:'Conversaciones reales y actividades de comprensión auditiva.',u:'https://elllo.org/'},{t:'Project Gutenberg',d:'Libros gratuitos en inglés para practicar lectura.',u:'https://www.gutenberg.org/ebooks/bookshelf/67'}].map(r=><a key={r.t} href={r.u} target="_blank" rel="noreferrer" style={{...panel,textDecoration:'none',color:theme.text}}><strong style={{fontSize:14}}>{r.t} ↗</strong><p style={{fontSize:12,color:theme.textMuted,marginTop:6}}>{r.d}</p></a>)}</div>}
 </div>;
}


type CreatorProject = { id: number; name: string; platform: string; audience: string; goal: string; frequency: string; status: string; ideas: string; };
export function CreatorProjectsWorkspace({ theme, isMobile }: { theme: any; isMobile: boolean }) {
  const [projects, setProjects] = useState<CreatorProject[]>(() => { try { return JSON.parse(localStorage.getItem('lifeos_creator_projects') || '[]'); } catch { return []; } });
  const [name, setName] = useState(''), [platform, setPlatform] = useState('Instagram'), [goal, setGoal] = useState(''), [audience, setAudience] = useState(''), [frequency, setFrequency] = useState('3 publicaciones por semana');
  const [activeId, setActiveId] = useState<number | null>(null), [status, setStatus] = useState('Idea');
  useEffect(() => { localStorage.setItem('lifeos_creator_projects', JSON.stringify(projects)); }, [projects]);
  const panel: React.CSSProperties = { background: theme.card, border: '1px solid ' + theme.cardBorder, borderRadius: 16, padding: 16, minWidth: 0 };
  const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: '1px solid ' + theme.cardBorder, background: theme.bg, color: theme.text, font: 'inherit' };
  const active = projects.find(p => p.id === activeId) || null;
  const addProject = (e: React.FormEvent) => { e.preventDefault(); if (!name.trim()) return; const p = { id: Date.now(), name: name.trim(), platform, audience: audience.trim(), goal: goal.trim(), frequency, status: 'Idea', ideas: '' }; setProjects(prev => [p, ...prev]); setActiveId(p.id); setName(''); setGoal(''); setAudience(''); };
  const update = (patch: Partial<CreatorProject>) => setProjects(prev => prev.map(p => p.id === activeId ? { ...p, ...patch } : p));
  return <div style={{ maxWidth: 1500, margin: '0 auto', display: 'grid', gap: 15 }}>
    <header><div className="lifeos-overline">CREATOR STUDIO · CONTENT WORKSPACE</div><h1 style={{ fontSize: isMobile ? 26 : 34, margin: '5px 0' }}>Contenido y redes</h1><p style={{ color: theme.textMuted, fontSize: 13 }}>Organiza tus cuentas, ideas, objetivos y producción de contenido.</p></header>
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(260px,.75fr) minmax(0,1.25fr)', gap: 13, alignItems: 'start' }}>
      <form onSubmit={addProject} style={{ ...panel, display: 'grid', gap: 9 }}><h2 style={{ fontSize: 16, margin: 0 }}>Crear proyecto o cuenta</h2><input required value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del proyecto" style={field}/><select value={platform} onChange={e => setPlatform(e.target.value)} style={field}>{['Instagram','TikTok','YouTube','Blog / Web','Otra'].map(x => <option key={x}>{x}</option>)}</select><input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Audiencia objetivo" style={field}/><input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Objetivo principal" style={field}/><select value={frequency} onChange={e => setFrequency(e.target.value)} style={field}>{['1 publicación por semana','3 publicaciones por semana','5 publicaciones por semana','Diario','Flexible'].map(x => <option key={x}>{x}</option>)}</select><button type="submit" style={{ border: 0, borderRadius: 11, padding: 11, background: theme.text, color: theme.bg, fontWeight: 800, cursor: 'pointer' }}>＋ Crear proyecto</button></form>
      <section style={panel}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}><h2 style={{ fontSize: 16, margin: 0 }}>Mis proyectos</h2><span style={{ color: theme.textMuted, fontSize: 11 }}>{projects.length} en total</span></div>
        {projects.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 8 }}>{projects.map(p => <button key={p.id} onClick={() => { setActiveId(p.id); setStatus(p.status); }} style={{ textAlign: 'left', padding: 12, borderRadius: 12, border: '1px solid ' + (activeId === p.id ? theme.text : theme.cardBorder), background: theme.bg, color: theme.text, cursor: 'pointer' }}><strong style={{ fontSize: 13 }}>{p.name}</strong><div style={{ color: theme.textMuted, fontSize: 11, marginTop: 5 }}>{p.platform} · {p.status}</div></button>)}</div> : <p style={{ color: theme.textMuted, fontSize: 12 }}>Todavía no hay proyectos. Crea el primero para comenzar.</p>}
        {active && <div style={{ borderTop: '1px solid ' + theme.cardBorder, marginTop: 15, paddingTop: 14, display: 'grid', gap: 9 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}><h3 style={{ margin: 0, fontSize: 15 }}>{active.name}</h3><button onClick={() => { setProjects(prev => prev.filter(p => p.id !== active.id)); setActiveId(null); }} style={{ border: 0, background: 'transparent', color: theme.textMuted, cursor: 'pointer' }}>Eliminar</button></div><label style={{ fontSize: 11, color: theme.textMuted }}>Estado</label><select value={status} onChange={e => { setStatus(e.target.value); update({ status: e.target.value }); }} style={field}>{['Idea','Planificación','En producción','Activo','En pausa'].map(x => <option key={x}>{x}</option>)}</select><label style={{ fontSize: 11, color: theme.textMuted }}>Audiencia</label><input value={active.audience} onChange={e => update({ audience: e.target.value })} style={field}/><label style={{ fontSize: 11, color: theme.textMuted }}>Objetivo</label><input value={active.goal} onChange={e => update({ goal: e.target.value })} style={field}/><label style={{ fontSize: 11, color: theme.textMuted }}>Ideas, guiones y notas</label><textarea rows={7} value={active.ideas} onChange={e => update({ ideas: e.target.value })} style={{ ...field, resize: 'vertical' }} placeholder="Ideas, hooks, guiones y próximos contenidos..."/><div style={{ fontSize: 11, color: theme.textMuted }}>Frecuencia: {active.frequency}</div></div>}
      </section>
    </div>
  </div>;
}
