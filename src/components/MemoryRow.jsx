import React, { useRef, useState } from 'react';
import { uploadToCloudinary } from '../lib/cloudinaryClient.js';
import { MEMORY_TYPES } from '../lib/procedural.js';

export default function MemoryRow({ index, memory, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  async function handleFileUpload(file, resourceType) {
    if (!file) return;
    setUploading(true);
    setUploadErr('');
    try {
      const url = await uploadToCloudinary(file, resourceType);
      onChange('mediaUrl', url);
    } catch (ex) {
      setUploadErr(ex.message);
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    setUploadErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        await handleFileUpload(file, 'video'); // Cloudinary handles audio under the video resource type
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (ex) {
      setUploadErr('Microphone access failed: ' + ex.message);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="memRow" style={{ gridTemplateColumns: '32px 1fr 140px', alignItems: 'start' }}>
      <div className="idx" style={{ paddingTop: 10 }}>{String(index + 1).padStart(2, '0')}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {memory.type === 'letter' ? (
          <textarea
            rows={4}
            placeholder="Dear..."
            value={memory.content}
            onChange={(e) => onChange('content', e.target.value)}
            style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontStyle: 'italic' }}
          />
        ) : memory.type === 'photo' ? (
          <>
            <input type="text" placeholder="Optional caption…" value={memory.content} onChange={(e) => onChange('content', e.target.value)} />
            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e.target.files[0], 'image')} />
            {uploading && <span style={{ fontSize: 12, color: 'rgba(246,241,230,0.5)' }}>Uploading…</span>}
            {memory.mediaUrl && <img src={memory.mediaUrl} alt="" style={{ maxWidth: 120, borderRadius: 2, border: '1px solid rgba(230,201,138,0.25)' }} />}
          </>
        ) : memory.type === 'video' ? (
          <>
            <input type="text" placeholder="Optional caption…" value={memory.content} onChange={(e) => onChange('content', e.target.value)} />
            <input type="file" accept="video/*" onChange={(e) => handleFileUpload(e.target.files[0], 'video')} />
            {uploading && <span style={{ fontSize: 12, color: 'rgba(246,241,230,0.5)' }}>Uploading…</span>}
            {memory.mediaUrl && <video src={memory.mediaUrl} style={{ maxWidth: 160, borderRadius: 2 }} controls />}
          </>
        ) : memory.type === 'voice_note' ? (
          <>
            <input type="text" placeholder="Optional note…" value={memory.content} onChange={(e) => onChange('content', e.target.value)} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {!recording ? (
                <button type="button" className="btn ghost" onClick={startRecording}>● Record</button>
              ) : (
                <button type="button" className="btn primary" onClick={stopRecording}>■ Stop</button>
              )}
              <span style={{ fontSize: 12, color: 'rgba(246,241,230,0.4)' }}>or</span>
              <input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e.target.files[0], 'video')} />
            </div>
            {uploading && <span style={{ fontSize: 12, color: 'rgba(246,241,230,0.5)' }}>Uploading…</span>}
            {memory.mediaUrl && <audio src={memory.mediaUrl} controls />}
          </>
        ) : (
          <input
            placeholder="Write the memory…"
            value={memory.content}
            onChange={(e) => onChange('content', e.target.value)}
          />
        )}
        {uploadErr && <span style={{ fontSize: 12, color: '#e08a8a' }}>{uploadErr}</span>}
      </div>

      <select value={memory.type} onChange={(e) => onChange('type', e.target.value)}>
        {MEMORY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
    </div>
  );
}
