import React, { useEffect, useState, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import {
  collection, query, where, getDocs, doc, getDoc,
  updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebaseClient.js';
import { FALLBACK_THEMES, genShareCode } from '../lib/procedural.js';

export default function Dashboard({ user, navigate }) {
  const [universes, setUniverses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      if (profileSnap.exists()) setProfileName(profileSnap.data().fullName);

      // No orderBy here on purpose — combining where() + orderBy() on a
      // different field requires a Firestore composite index. Sorting the
      // (small) list client-side avoids that setup step entirely.
      const q = query(collection(db, 'universes'), where('ownerId', '==', user.uid));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
      setUniverses(list);
    } catch (ex) {
      console.error(ex);
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useEffect(() => { load(); }, [load]);

  async function logout() {
    await signOut(auth);
  }

  async function publish(u) {
    const code = u.shareCode || genShareCode(7);
    try {
      await updateDoc(doc(db, 'universes', u.id), {
        status: 'published', shareCode: code, publishedAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      await load();
      copyLink({ ...u, shareCode: code });
    } catch (ex) {
      alert(ex.message);
    }
  }

  function copyLink(u) {
    const link = `${window.location.origin}${window.location.pathname}#/u/${u.shareCode}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    alert(`Share link:\n${link}\n\nCopied to clipboard.`);
  }

  async function archive(u) {
    await updateDoc(doc(db, 'universes', u.id), { status: 'archived', updatedAt: serverTimestamp() });
    load();
  }

  async function remove(u) {
    if (!confirm(`Delete "${u.name}" permanently? This cannot be undone.`)) return;
    await deleteDoc(doc(db, 'universes', u.id));
    load();
  }

  function handleCardClick(u) {
    if (u.status === 'draft') navigate(`#/preview/${u.id}`);
  }

  return (
    <div className="screen active" id="dashScreen">
      <div className="topbar">
        <div className="brand"><div className="mark"></div><span>Aether</span></div>
        <div className="topActions">
          <button className="btn ghost" onClick={logout}>Log Out</button>
          <div className="avatar">{(profileName || 'A')[0].toUpperCase()}</div>
        </div>
      </div>

      <div className="hero">
        <div className="eyebrow">CREATOR DASHBOARD</div>
        <h1>Every universe<br />exists for one person only.</h1>
        <p>Build a procedurally generated night sky, hide your memories among its stars, and send the one link that opens it.</p>
        <button className="btn primary" onClick={() => navigate('#/create')}>+ Create Universe</button>
      </div>

      <div className="sectionLabel"><h2>My Universes</h2><span className="count">{universes.length}</span></div>

      {loading ? (
        <div className="empty">Loading your universes…</div>
      ) : (
        <div className="grid">
          <div className="createCard" onClick={() => navigate('#/create')}>
            <div className="plus">+</div><span>Create Universe</span>
          </div>
          {universes.map(u => {
            const theme = FALLBACK_THEMES[u.themeKey] || FALLBACK_THEMES.blue_galaxy;
            return (
              <div
                key={u.id}
                className="uCard"
                style={{ background: `radial-gradient(circle at 30% 20%, ${theme.nebula[0]}55, rgba(12,15,30,0.92))`, cursor: u.status === 'draft' ? 'pointer' : 'default' }}
                onClick={() => handleCardClick(u)}
              >
                <div className="status">{u.status}</div>
                <h3>{u.name}</h3>
                <div className="meta">{theme.label} · {u.memorySlots} memories</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => navigate(`#/preview/${u.id}`)}>Preview</button>
                  {u.status === 'draft' ? (
                    <button className="btn primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => publish(u)}>Publish & Get Link</button>
                  ) : (
                    <button className="btn primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => copyLink(u)}>Copy Share Link</button>
                  )}
                  {u.status !== 'archived' && (
                    <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => archive(u)}>Archive</button>
                  )}
                  <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 12, color: '#e08a8a', borderColor: 'rgba(224,138,138,0.4)' }} onClick={() => remove(u)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!loading && universes.length === 0 && (
        <div className="empty">No universes yet — every story starts with a single star.</div>
      )}
    </div>
  );
}
