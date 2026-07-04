import React, { useState } from 'react';
import { collection, addDoc, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebaseClient.js';
import { FALLBACK_THEMES, MEMORY_BEHAVIORS, randomSeed } from '../lib/procedural.js';
import MemoryRow from './MemoryRow.jsx';

const SLOT_OPTIONS = [10, 11, 12, 13, 14, 15];

export default function CreateWizard({ user, onDone, onCancel }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const [name, setName] = useState('');
  const [fromName, setFromName] = useState('');
  const [toName, setToName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [themeKey, setThemeKey] = useState('purple_nebula');
  const [slots, setSlots] = useState(12);
  const [memories, setMemories] = useState(
    Array.from({ length: 12 }, () => ({ type: 'message', content: '', mediaUrl: '' }))
  );
  const [seed] = useState(randomSeed());

  function updateSlots(n) {
    setSlots(n);
    setMemories(prev => {
      const next = [...prev];
      while (next.length < n) next.push({ type: 'message', content: '', mediaUrl: '' });
      return next.slice(0, n);
    });
  }

  function updateMemory(i, field, value) {
    setMemories(prev => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  }

  async function finish() {
    setSaving(true);
    setErr('');
    try {
      const universeRef = await addDoc(collection(db, 'universes'), {
        ownerId: user.uid,
        name: name || 'Untitled Universe',
        fromName, toName, description, notes,
        themeKey,
        memorySlots: slots,
        seed,
        status: 'draft',
        shareCode: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const batch = writeBatch(db);
      memories.forEach((m, i) => {
        const starRef = doc(collection(db, 'universes', universeRef.id, 'memoryStars'));
        batch.set(starRef, {
          slotIndex: i,
          contentType: m.type,
          textContent: m.content || 'A memory waiting to be found.',
          mediaUrl: m.mediaUrl || null,
          behavior: MEMORY_BEHAVIORS[i % MEMORY_BEHAVIORS.length],
          unlockWave: i < 5 ? 0 : 1,
          positionSeedOffset: Math.random(),
        });
      });
      await batch.commit();

      onDone();
    } catch (ex) {
      setErr(ex.message || String(ex));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen active" id="wizardScreen">
      <div className="wizWrap">
        <div className="wizHead">
          <div className="backBtn" onClick={onCancel}>←</div>
          <div className="eyebrow">CREATE UNIVERSE</div>
        </div>
        <div className="stepDots">
          {[1, 2, 3, 4].map(n => (
            <div className="dot" key={n}><i style={{ width: step >= n ? '100%' : '0%' }} /></div>
          ))}
        </div>

        {step === 1 && (
          <div className="wizStep active">
            <h2>Who is this for?</h2>
            <div className="stepSub">This becomes the plaque at the base of the telescope.</div>
            <div className="field"><label>Universe Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="A Sky Made For You" /></div>
            <div style={{ display: 'flex', gap: 14 }}>
              <div className="field" style={{ flex: 1 }}><label>From</label><input value={fromName} onChange={e => setFromName(e.target.value)} /></div>
              <div className="field" style={{ flex: 1 }}><label>To</label><input value={toName} onChange={e => setToName(e.target.value)} /></div>
            </div>
            <div className="field"><label>Description (optional)</label><textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} /></div>
            <div className="field"><label>Creator Notes (private)</label><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
          </div>
        )}

        {step === 2 && (
          <div className="wizStep active">
            <h2>Choose a theme</h2>
            <div className="stepSub">Sets the color, light, and mood of the sky.</div>
            <div className="themeGrid">
              {Object.entries(FALLBACK_THEMES).map(([key, t]) => (
                <div key={key} className={'themeChip' + (key === themeKey ? ' active' : '')} onClick={() => setThemeKey(key)}>
                  <div className="swatch" style={{ background: `linear-gradient(135deg,${t.nebula[0]},${t.nebula[1]})` }} />
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="wizStep active">
            <h2>Hide your memories</h2>
            <div className="stepSub">Choose how many memory stars this universe holds.</div>
            <div className="slotRow">
              {SLOT_OPTIONS.map(n => (
                <div key={n} className={'slotChip' + (n === slots ? ' active' : '')} onClick={() => updateSlots(n)}>{n} stars</div>
              ))}
            </div>
            <div style={{ height: 22 }} />
            <div className="memList">
              {memories.map((m, i) => (
                <MemoryRow key={i} index={i} memory={m} onChange={(field, value) => updateMemory(i, field, value)} />
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="wizStep active">
            <h2>Generate the universe</h2>
            <div className="stepSub">
              A unique procedural seed is created now. You can regenerate the layout later from the
              dashboard — your memories stay put; only the stars, nebulas, and constellations change.
            </div>
            <div style={{ border: '1px solid rgba(230,201,138,0.15)', borderRadius: 3, padding: 22, fontSize: 14, lineHeight: 2, color: 'rgba(246,241,230,0.75)' }}>
              <div><strong>{name || 'Untitled Universe'}</strong></div>
              <div>From <em>{fromName || '—'}</em> to <em>{toName || '—'}</em></div>
              <div>Theme: {FALLBACK_THEMES[themeKey].label}</div>
              <div>{slots} memory stars, hundreds of decorative stars</div>
              <div>Procedural Seed: <span style={{ fontFamily: "'Space Mono',monospace" }}>{seed}</span></div>
            </div>
            <div className="errMsg">{err}</div>
          </div>
        )}

        <div className="wizFoot">
          <button className="btn ghost" style={{ visibility: step === 1 ? 'hidden' : 'visible' }} onClick={() => setStep(s => s - 1)}>Back</button>
          <button
            className="btn primary"
            disabled={saving}
            onClick={() => (step < 4 ? setStep(s => s + 1) : finish())}
          >
            {step < 4 ? 'Continue' : (saving ? 'Generating…' : 'Generate Universe')}
          </button>
        </div>
      </div>
    </div>
  );
}
