import React, { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebaseClient.js';
import AuthScreen from './components/AuthScreen.jsx';
import Dashboard from './components/Dashboard.jsx';
import CreateWizard from './components/CreateWizard.jsx';
import Telescope from './components/Telescope.jsx';

function parseRoute() {
  const hash = window.location.hash;
  const match = hash.match(/^#\/u\/(.+)$/);
  if (match) return { name: 'recipient', code: match[1] };
  if (hash === '#/create') return { name: 'create' };
  if (hash.startsWith('#/preview/')) return { name: 'preview', universeId: hash.replace('#/preview/', '') };
  return { name: 'dashboard' };
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [route, setRoute] = useState(parseRoute());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => {
      unsub();
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const navigate = useCallback((path) => {
    window.location.hash = path;
  }, []);

  // Recipient links never require a login — public Firestore read rule
  // allows this once the universe's status is "published".
  if (route.name === 'recipient') {
    return <Telescope shareCode={route.code} isPreview={false} onExit={() => navigate('#/')} />;
  }

  if (user === undefined) {
    return <div className="bootScreen">Loading Aether…</div>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (route.name === 'create') {
    return <CreateWizard user={user} onDone={() => navigate('#/')} onCancel={() => navigate('#/')} />;
  }

  if (route.name === 'preview') {
    return <Telescope universeId={route.universeId} isPreview={true} onExit={() => navigate('#/')} />;
  }

  return <Dashboard user={user} navigate={navigate} />;
}
