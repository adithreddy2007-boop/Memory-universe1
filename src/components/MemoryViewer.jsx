import React from 'react';

const LABELS = {
  message: 'MESSAGE', photo: 'PHOTO', video: 'VIDEO', voice_note: 'VOICE NOTE',
  letter: 'LETTER', gift: 'GIFT', flower: 'FLOWER', secret: 'SECRET', final_surprise: 'FINAL SURPRISE',
};

export default function MemoryViewer({ memory, onClose }) {
  if (!memory) return null;
  const type = memory.contentType;
  return (
    <div className={'viewerBackdrop active'} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="viewerCard">
        <div className="vLabel">{LABELS[type] || type}</div>
        {type === 'voice_note' ? (
          <div>
            <div className="voicePlayer">
              <div className="playDot">▶</div>
              <div className="waveform">
                {Array.from({ length: 26 }).map((_, i) => (
                  <i key={i} style={{ height: 6 + Math.random() * 20 }} />
                ))}
              </div>
            </div>
            <div style={{ marginTop: 16, fontSize: 15, color: 'rgba(246,241,230,0.6)' }}>{memory.textContent}</div>
          </div>
        ) : type === 'photo' ? (
          <div>
            {memory.mediaUrl
              ? <img src={memory.mediaUrl} alt="" style={{ width: '100%', borderRadius: 2, border: '1px solid rgba(230,201,138,0.25)' }} />
              : <div style={{ border: '1px solid rgba(230,201,138,0.25)', padding: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center', color: 'rgba(246,241,230,0.4)', fontSize: 13 }}>[ no photo uploaded ]</div>}
            <div style={{ marginTop: 14 }}>{memory.textContent}</div>
          </div>
        ) : type === 'video' ? (
          <div>
            {memory.mediaUrl
              ? <video src={memory.mediaUrl} controls style={{ width: '100%', borderRadius: 2 }} />
              : <div style={{ border: '1px solid rgba(230,201,138,0.25)', padding: 24, textAlign: 'center', color: 'rgba(246,241,230,0.4)', fontSize: 13 }}>▶ [ no video uploaded ]</div>}
            <div style={{ marginTop: 14 }}>{memory.textContent}</div>
          </div>
        ) : (
          <div className="vBody">{memory.textContent}</div>
        )}
        <div className="viewerClose"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
