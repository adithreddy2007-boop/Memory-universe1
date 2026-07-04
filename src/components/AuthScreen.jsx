import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseClient.js';

export default function AuthScreen() {
  const [tab, setTab] = useState('login');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suMobile, setSuMobile] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suConfirm, setSuConfirm] = useState('');
  const [signupSent, setSignupSent] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (ex) {
      setErr(friendlyError(ex));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setErr('');
    if (suPassword !== suConfirm) { setErr('Passwords do not match.'); return; }
    if (suPassword.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, suEmail, suPassword);
      await updateProfile(cred.user, { displayName: suName });
      await setDoc(doc(db, 'users', cred.user.uid), {
        fullName: suName,
        mobile: suMobile,
        email: suEmail,
        defaultTheme: 'purple_nebula',
        createdAt: serverTimestamp(),
      });
      await sendEmailVerification(cred.user);
      setSignupSent(true);
    } catch (ex) {
      setErr(friendlyError(ex));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot() {
    if (!loginEmail) { setErr('Enter your email above first, then tap "Forgot password?"'); return; }
    try {
      await sendPasswordResetEmail(auth, loginEmail);
      setErr('Password reset link sent — check your email.');
    } catch (ex) {
      setErr(friendlyError(ex));
    }
  }

  return (
    <div className="screen active" id="authScreen">
      <div className="wrap">
        <div className="authCard">
          <div className="eyebrow">AETHER</div>
          <h1>{tab === 'login' ? 'Sign in' : 'Create your account'}</h1>
          <div className="sub">A universe built for someone you love.</div>
          <div className="authTabs">
            <div className={'authTab' + (tab === 'login' ? ' active' : '')} onClick={() => { setTab('login'); setErr(''); }}>Log In</div>
            <div className={'authTab' + (tab === 'signup' ? ' active' : '')} onClick={() => { setTab('signup'); setErr(''); }}>Create Account</div>
          </div>

          {tab === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="field"><label>Email</label>
                <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="field"><label>Password</label>
                <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="rowFlex">
                <label className="checkline"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me</label>
                <a href="#" onClick={(e) => { e.preventDefault(); handleForgot(); }}>Forgot password?</a>
              </div>
              <div className="errMsg">{err}</div>
              <button type="submit" className="btn primary" style={{ width: '100%' }} disabled={busy}>
                {busy ? 'Signing in…' : 'Enter the Observatory'}
              </button>
            </form>
          )}

          {tab === 'signup' && !signupSent && (
            <form onSubmit={handleSignup}>
              <div className="field"><label>Full Name</label><input type="text" required value={suName} onChange={e => setSuName(e.target.value)} /></div>
              <div className="field"><label>Email</label><input type="email" required value={suEmail} onChange={e => setSuEmail(e.target.value)} /></div>
              <div className="field"><label>Mobile Number</label><input type="tel" value={suMobile} onChange={e => setSuMobile(e.target.value)} /></div>
              <div className="field"><label>Password</label><input type="password" required value={suPassword} onChange={e => setSuPassword(e.target.value)} /></div>
              <div className="field"><label>Confirm Password</label><input type="password" required value={suConfirm} onChange={e => setSuConfirm(e.target.value)} /></div>
              <div className="errMsg">{err}</div>
              <button type="submit" className="btn primary" style={{ width: '100%' }} disabled={busy}>
                {busy ? 'Creating…' : 'Create Account'}
              </button>
            </form>
          )}

          {tab === 'signup' && signupSent && (
            <div style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(246,241,230,0.75)' }}>
              Check <strong>{suEmail}</strong> for a verification link, then come back and log in.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function friendlyError(ex) {
  const code = ex.code || '';
  if (code.includes('email-already-in-use')) return 'An account with this email already exists.';
  if (code.includes('invalid-credential') || code.includes('wrong-password')) return 'Incorrect email or password.';
  if (code.includes('user-not-found')) return 'No account found with that email.';
  if (code.includes('weak-password')) return 'Password is too weak — use at least 8 characters.';
  if (code.includes('invalid-email')) return 'That email address looks invalid.';
  return ex.message || String(ex);
}
