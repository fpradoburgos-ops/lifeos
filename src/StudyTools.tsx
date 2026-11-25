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

type EnglishWord = { id: number; word: string; meaning: string; example: string; learned: boolean };
export function EnglishWorkspace({ theme, isMobile }: { theme: any; isMobile: boolean }) {
  const [words, setWords] = useState<EnglishWord[]>(() => { try { return JSON.parse(localStorage.getItem('lifeos_english_words') || '[]'); } catch { return []; } });
  const [word, setWord] = useState(''); const [meaning, setMeaning] = useState(''); const [example, setExample] = useState('');
  const [level, setLevel] = useState('A2'); const [quiz, setQuiz] = useState(0); const [answer, setAnswer] = useState('');
  useEffect(() => { localStorage.setItem('lifeos_english_words', JSON.stringify(words)); }, [words]);
  const panel: React.CSSProperties = { background: theme.card, border: '1px solid ' + theme.cardBorder, borderRadius: 18, padding: 17 };
  const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: '1px solid ' + theme.cardBorder, background: theme.bg, color: theme.text, font: 'inherit' };
  const lessons = [{title:'Present simple',rule:'Use it for habits, routines and facts.',example:'I study English every day.'},{title:'Present continuous',rule:'Use am/is/are + verb-ing for actions happening now.',example:'I am reading a book.'},{title:'Past simple',rule:'Use the past form for finished actions.',example:'I watched a lesson yesterday.'},{title:'Present perfect',rule:'Use have/has + past participle for experience or a past action connected to now.',example:'I have learned ten new words.'}];
  const quizItems = [{q:'She ___ to university every day.',options:['go','goes','going'],correct:'goes',why:'Con he/she/it en present simple agregamos -s o -es.'},{q:'They ___ studying right now.',options:['is','are','am'],correct:'are',why:'Con they usamos are en present continuous.'},{q:'I ___ my homework yesterday.',options:['finish','finished','finishing'],correct:'finished',why:'Yesterday indica pasado simple.'}];
  const active = quizItems[quiz % quizItems.length];
  return <div style={{ maxWidth: 1500, margin: '0 auto', display: 'grid', gap: 14 }}>
    <header><div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.12em', color: theme.textMuted }}>LANGUAGE LAB</div><h2 style={{ fontSize: 24, margin: '5px 0' }}>English</h2><p style={{ color: theme.textMuted, fontSize: 13 }}>Un espacio para practicar vocabulario, gramática, lectura y comprensión.</p></header>
    <section style={{ ...panel, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><div style={{ fontSize: 10, color: theme.textMuted, fontWeight: 900 }}>NIVEL DE PRÁCTICA</div><div style={{ fontSize: 21, fontWeight: 900, marginTop: 4 }}>{level}</div></div><select value={level} onChange={e => setLevel(e.target.value)} style={{ ...field, width: 'auto' }}>{['A1','A2','B1','B2','C1'].map(x => <option key={x}>{x}</option>)}</select><div style={{ fontSize: 12, color: theme.textMuted }}>{words.length} palabras guardadas · {words.filter(w => w.learned).length} aprendidas</div></section>
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,minmax(0,1fr))', gap: 14 }}>
      <section style={panel}><h3 style={{ fontSize: 16, margin: '0 0 10px' }}>Grammar bites</h3><div style={{ display: 'grid', gap: 9 }}>{lessons.map(x => <article key={x.title} style={{ padding: 11, borderRadius: 12, background: theme.bg, border: '1px solid ' + theme.cardBorder }}><strong style={{ fontSize: 13 }}>{x.title}</strong><p style={{ fontSize: 12, color: theme.textMuted, margin: '5px 0' }}>{x.rule}</p><p style={{ fontSize: 12, fontStyle: 'italic' }}>{x.example}</p></article>)}</div></section>
      <div style={{ display: 'grid', gap: 14 }}>
        <section style={panel}><h3 style={{ fontSize: 16, margin: '0 0 8px' }}>Quick practice</h3><p style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>{active.q}</p><div style={{ display: 'grid', gap: 7 }}>{active.options.map(o => <button key={o} onClick={() => setAnswer(o)} style={{ padding: 10, textAlign: 'left', borderRadius: 10, border: '1px solid ' + (answer === o ? theme.text : theme.cardBorder), background: answer === o ? theme.bg : 'transparent', color: theme.text, cursor: 'pointer' }}>{o}</button>)}</div>{answer && <p style={{ fontSize: 12, marginTop: 9, color: answer === active.correct ? '#16a34a' : '#dc6b6b' }}>{answer === active.correct ? 'Correct!' : 'Not quite.'} {active.why}</p>}<button onClick={() => { setQuiz(v => v + 1); setAnswer(''); }} style={{ marginTop: 10, padding: 9, border: 0, borderRadius: 9, background: theme.text, color: theme.bg, fontWeight: 800, cursor: 'pointer' }}>Next question →</button></section>
        <form onSubmit={e => { e.preventDefault(); if (!word.trim() || !meaning.trim()) return; setWords(prev => [{ id: Date.now(), word: word.trim(), meaning: meaning.trim(), example: example.trim(), learned: false }, ...prev]); setWord(''); setMeaning(''); setExample(''); }} style={{ ...panel, display: 'grid', gap: 8 }}><h3 style={{ fontSize: 16, margin: 0 }}>My vocabulary</h3><input required value={word} onChange={e => setWord(e.target.value)} placeholder="Word or expression" style={field}/><input required value={meaning} onChange={e => setMeaning(e.target.value)} placeholder="Significado en español" style={field}/><input value={example} onChange={e => setExample(e.target.value)} placeholder="Example sentence (optional)" style={field}/><button style={{ padding: 10, border: 0, borderRadius: 10, background: theme.text, color: theme.bg, fontWeight: 900 }}>Save word</button></form>
      </div>
    </div>
    <section style={panel}><h3 style={{ fontSize: 15, margin: '0 0 8px' }}>Vocabulary notebook</h3>{words.length ? words.map(w => <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderBottom: '1px solid ' + theme.cardBorder }}><div><strong style={{ fontSize: 13 }}>{w.word}</strong><div style={{ fontSize: 11, color: theme.textMuted }}>{w.meaning}{w.example ? ' · ' + w.example : ''}</div></div><button onClick={() => setWords(prev => prev.map(x => x.id === w.id ? { ...x, learned: !x.learned } : x))} style={{ border: '1px solid ' + theme.cardBorder, background: 'transparent', color: theme.text, borderRadius: 9, padding: '6px 9px', cursor: 'pointer', fontSize: 11 }}>{w.learned ? 'Learned ✓' : 'Mark learned'}</button></div>) : <p style={{ color: theme.textMuted, fontSize: 12 }}>Add your first word to start building your vocabulary.</p>}</section>
    <section style={panel}><h3 style={{ fontSize: 15, margin: '0 0 7px' }}>Listening & reading</h3><p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 9 }}>Practica con materiales gratuitos y de acceso abierto.</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><a href="https://www.bbc.co.uk/learningenglish" target="_blank" rel="noreferrer" style={{ color: theme.text, fontSize: 12, fontWeight: 800 }}>BBC Learning English ↗</a><a href="https://learningenglish.voanews.com/" target="_blank" rel="noreferrer" style={{ color: theme.text, fontSize: 12, fontWeight: 800 }}>VOA Learning English ↗</a><a href="https://www.gutenberg.org/ebooks/bookshelf/67" target="_blank" rel="noreferrer" style={{ color: theme.text, fontSize: 12, fontWeight: 800 }}>Project Gutenberg · English ↗</a></div></section>
  </div>;
}
