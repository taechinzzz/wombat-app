'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import NameScreen from './components/NameScreen';

const WombatCanvas = dynamic(() => import('./components/WombatCanvas'), { ssr: false });

const ID_KEY = 'wombat_player_id';
const NAME_KEY = 'wombat_player_name';
const COINS_KEY = 'wombat_coins';
const VARIANT_KEY = 'wombat_sprite_variant';
const CHAT_POS_KEY = 'wombat_chat_pos';
const VARIANT_COUNT = 14;
const REROLL_COST = 10;

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function hashToVariant(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % VARIANT_COUNT;
}

export default function Home() {
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [joined, setJoined] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [coins, setCoins] = useState(0);
  const [spriteOverride, setSpriteOverride] = useState<number | null>(null);
  const [pendingVariant, setPendingVariant] = useState<number | null>(null);
  const [isRerolling, setIsRerolling] = useState(false);

  useEffect(() => {
    const savedId = localStorage.getItem(ID_KEY) ?? genId();
    const savedName = localStorage.getItem(NAME_KEY) ?? '';
    const savedCoins = parseInt(localStorage.getItem(COINS_KEY) ?? '0') || 0;
    const savedVariant = localStorage.getItem(VARIANT_KEY);
    localStorage.setItem(ID_KEY, savedId);
    setPlayerId(savedId);
    setCoins(savedCoins);
    if (savedVariant !== null) setSpriteOverride(parseInt(savedVariant));
    if (savedName) { setPlayerName(savedName); setJoined(true); }
  }, []);

  const handleJoin = (name: string) => {
    localStorage.setItem(NAME_KEY, name);
    setPlayerName(name);
    setJoined(true);
  };

  const handleRename = () => {
    const t = renameInput.trim();
    if (!t) return;
    localStorage.setItem(NAME_KEY, t);
    setPlayerName(t);
    setRenaming(false);
  };

  const handleKick = useCallback(() => {
    setCoins(prev => {
      const next = prev + 1;
      localStorage.setItem(COINS_KEY, String(next));
      return next;
    });
  }, []);

  const handleReroll = () => {
    if (coins < REROLL_COST || isRerolling) return;
    const current = spriteOverride ?? hashToVariant(playerId);
    let next = current;
    while (next === current && VARIANT_COUNT > 1) next = Math.floor(Math.random() * VARIANT_COUNT);
    const newCoins = coins - REROLL_COST;
    localStorage.setItem(COINS_KEY, String(newCoins));
    setCoins(newCoins);
    setPendingVariant(next);
    setIsRerolling(true);
    setTimeout(() => {
      localStorage.setItem(VARIANT_KEY, String(next));
      setSpriteOverride(next);
      setPendingVariant(null);
      setIsRerolling(false);
    }, 1400);
  };

  if (!playerId) return null;
  if (!joined) return <NameScreen onJoin={handleJoin} />;

  const canReroll = coins >= REROLL_COST && !isRerolling;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <WombatCanvas
        playerId={playerId}
        playerName={playerName}
        spriteVariantOverride={spriteOverride}
        onKick={handleKick}
        isRerolling={isRerolling}
        pendingVariant={pendingVariant}
      />

      {/* Coin + Reroll button */}
      <div style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
      }}>
        {/* Coin display */}
        <div style={{
          background: '#3a2e20', borderRadius: 20, padding: '4px 10px',
          color: '#f5c518', fontWeight: 'bold', fontSize: 13,
          fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          🪙 {coins}
        </div>

        {/* Reroll button */}
        <button
          onClick={handleReroll}
          disabled={!canReroll}
          title={canReroll ? 'สุ่มสีใหม่' : `ต้องการ ${REROLL_COST} 🪙`}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: canReroll ? '#3a2e20' : '#2a2214',
            border: `2px solid ${canReroll ? '#f5c518' : '#444'}`,
            color: canReroll ? '#f5c518' : '#555',
            fontSize: 18, cursor: canReroll ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: canReroll ? '0 2px 10px rgba(0,0,0,0.4)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          🎲
        </button>

        {/* Rename button */}
        <button
          onClick={() => { setRenameInput(playerName); setRenaming(true); }}
          title="เปลี่ยนชื่อ"
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#3a2e20', border: '2px solid #6a5a40',
            color: '#fff', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          }}
        >
          ✏️
        </button>
      </div>

      {/* Rename modal */}
      {renaming && (
        <div
          onClick={() => setRenaming(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#3a2e20', borderRadius: 12, padding: 24,
              display: 'flex', flexDirection: 'column', gap: 12, minWidth: 260,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <p style={{ color: '#fff', margin: 0, fontFamily: 'sans-serif', fontSize: 14, fontWeight: 'bold' }}>
              เปลี่ยนชื่อ
            </p>
            <input
              autoFocus type="text" maxLength={16} value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
              style={{ padding: '8px 12px', borderRadius: 6, border: 'none', fontSize: 14, fontFamily: 'sans-serif', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleRename} disabled={!renameInput.trim()}
                style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', background: renameInput.trim() ? '#e8a020' : '#555', color: '#fff', fontSize: 13, fontWeight: 'bold', cursor: renameInput.trim() ? 'pointer' : 'default', fontFamily: 'sans-serif' }}>
                บันทึก
              </button>
              <button onClick={() => setRenaming(false)}
                style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', background: '#555', color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'sans-serif' }}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
