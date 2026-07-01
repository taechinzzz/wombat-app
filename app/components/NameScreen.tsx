'use client';

import { useState, FormEvent } from 'react';

interface Props {
  onJoin: (name: string) => void;
}

export default function NameScreen({ onJoin }: Props) {
  const [name, setName] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onJoin(trimmed);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100vw', height: '100vh', background: '#fff',
    }}>
      <form onSubmit={submit} style={{
        display: 'flex', flexDirection: 'column', gap: 14, padding: 36,
        background: '#3a2e20', borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)', minWidth: 300,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 4 }}>🐾</div>
          <h1 style={{ color: '#fff', margin: 0, fontSize: 22, fontFamily: 'sans-serif', fontWeight: 'bold' }}>
            Wombat Chat
          </h1>
          <p style={{ color: '#a89070', margin: '6px 0 0', fontSize: 13, fontFamily: 'sans-serif' }}>
            ใส่ชื่อเพื่อเข้าเล่น
          </p>
        </div>
        <input
          autoFocus
          type="text"
          maxLength={16}
          placeholder="ชื่อของคุณ..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: 8, border: 'none',
            fontSize: 15, outline: 'none', fontFamily: 'sans-serif',
            background: '#fff',
          }}
        />
        <button
          type="submit"
          disabled={!name.trim()}
          style={{
            padding: '11px 0',
            background: name.trim() ? '#e8a020' : '#555',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 15, fontWeight: 'bold',
            cursor: name.trim() ? 'pointer' : 'default',
            fontFamily: 'sans-serif', transition: 'background 0.2s',
          }}
        >
          เข้าเล่น →
        </button>
      </form>
    </div>
  );
}
