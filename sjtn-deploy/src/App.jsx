import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from './supabase';
import { signIn, signUp, signOut, getCurrentUser, inviteMentee } from './auth';

/* ─── SECURITY ──────────────────────────────────────────────────────────── */
const Sec = {
  createSession: u => ({ token: btoa(`${u.email}:${Date.now()}:${Math.random().toString(36)}`), expires: Date.now() + 8 * 60 * 60 * 1000, role: u.role, userId: u.email }),
  valid: s => s && Date.now() < s.expires,
  _a: {},
  rateOk(k) { const n = Date.now(); if (!this._a[k]) this._a[k] = []; this._a[k] = this._a[k].filter(t => n - t < 900000); return this._a[k].length < 5; },
  record(k) { if (!this._a[k]) this._a[k] = []; this._a[k].push(Date.now()); },
};

/* ─── BRAND TOKENS ──────────────────────────────────────────────────────── */
const B = {
  black:   "#0D0D0D",
  ink:     "#1A1A1A",
  charcoal:"#2C2C2C",
  steel:   "#4A4A4A",
  mid:     "#888888",
  silver:  "#C0C0C0",
  cloud:   "#E8E8E8",
  off:     "#F5F5F5",
  white:   "#FFFFFF",
  ivory:   "#F5F0EB",   /* warm off-white for text on dark backgrounds */
  // Blush — used strategically, never decoratively
  blush:   "#C4607A",
  blushLight: "#E8A0B0",
  blushPale:  "#FDF0F3",
  blushMid:   "#F5D5DF",
  // Functional
  success: "#2D7D4E",
  successPale: "#E8F5EE",
  amber:   "#B8860B",
  amberPale: "#FBF6E8",
};

/* ─── TYPOGRAPHY ────────────────────────────────────────────────────────── */
const FONTS = {
  display: "'Barlow Condensed', 'Arial Narrow', sans-serif",
  body:    "'DM Sans', 'Helvetica Neue', sans-serif",
  script:  "Georgia, 'Times New Roman', serif",
};


/* ─── UTILITY: Calculate days remaining from start date ─────────────────── */
function calcDaysRemaining(startDateStr, totalDays) {
  if (!startDateStr || !totalDays) return totalDays || 0;
  // Handle "April 25, 2026", "2026-04-25", or any JS-parseable format
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return totalDays;
  // Use UTC midnight to avoid timezone drift
  const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const todayUTC = Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const elapsed = Math.floor((todayUTC - startUTC) / (1000 * 60 * 60 * 24));
  return Math.max(0, totalDays - elapsed);
}

/* ─── LAYOUT HOOK ───────────────────────────────────────────────────────── */
function useLayout() {
  const [s, setS] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const fn = () => setS({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", fn);
    window.addEventListener("orientationchange", fn);
    return () => { window.removeEventListener("resize", fn); window.removeEventListener("orientationchange", fn); };
  }, []);
  return { ...s, isMobile: s.w < 768, useSidebar: s.w >= 768 || s.w > s.h };
}

/* ─── DATABASE ──────────────────────────────────────────────────────────── */
const DB = {
  users: {
    "jess@sayjesstonails.com": { role:"admin", name:"Jess Ramos", firstName:"Jess", avatar:"JR" },
  },
  leads: [],
};

/* ─── LOGO — exact SVG from the real Illustrator file ───────────────────── */
/*
 * The original SVG viewBox is 288×144.
 * white=true  → renders everything in white (for dark backgrounds)
 * white=false → renders in original brand colors (#231f20 text + #d2a1b8 accent)
 * height prop controls rendered size; width scales proportionally (2:1 ratio)
 */
const Logo = ({ height = 40, white = false }) => {
  const w = height * 2; // viewBox is 288×144 → 2:1
  const mainFill  = white ? "#FFFFFF" : "#231f20";
  const accentFill = "transparent";
  const whiteFill  = white ? "#231f20" : "#ffffff";
  return (
    <svg
      width={w} height={height}
      viewBox="0 0 288 144"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* ── speech bubble centre + Jess script ── */}
      <g>
        {/* pink/blush accent tiny fragments (original st1) */}
        <polygon fill={accentFill} points="127.66 65.97 127.61 65.97 127.61 66.02 127.66 65.97"/>
        <path fill={accentFill} d="M135.13,60.42s-.17-.09-.17-.09c.04.04.04.13.09.13s.09-.04.09-.04Z"/>
        <path fill={accentFill} d="M102.76,62.64c0-.09-.04-.13-.09-.17,0,.09-.04.17-.04.3.09-.04.13-.09.13-.13Z"/>
        <path fill={accentFill} d="M126.89,67.3s-.04-.09-.13-.09c0,.04.09.09.09.13.04,0,.04-.04.04-.04Z"/>
        {/* main bubble + script paths (original st0) */}
        <path fill={mainFill} d="M117.96,56.32c0-.43-.09-.86-.17-1.28-.21-.68-.34-.68-.6-.68-1.32,0-3.76,6.11-3.76,6.32,0,.09.04.13.17.13,2.01,0,4.36-2.09,4.36-4.49Z"/>
        <path fill={mainFill} d="M141.41,68.41c-1.79,2.65-3.93,6.41-3.93,9.61,0,.85,1.07,2.6,2.31,2.6.85,0,.77-.51,1.33-.81h.13l-.04-.04h.04s-.04-.04-.04-.09c.94-.94,1.24-3.93,1.24-5.21-.09-1.92-.43-4.14-1.03-6.07Z"/>
        <path fill={mainFill} d="M128.38,67.64c-2.52,2.65-6.28,6.71-6.28,9.83,0,1.03,1.07,2.05,2.01,2.05.81,0,1.96-1.28,2.01-1.28,2.26-1.37,2.99-6.41,3.08-9.61,0-.51,0-1.15-.04-1.92-.26.43-.6.64-.77.94Z"/>
        <path fill={mainFill} d="M114.87,22.37c-24.46,0-44.29,17.47-44.29,39.03s18.99,38.26,42.72,38.99c.12.01.24.03.36.04,7.62.58,11.49,7.45-.18,22,0,0,31.63-20.04,41.64-44.74,2.59-4.96,4.04-10.47,4.04-16.28,0-21.55-19.83-39.03-44.29-39.03ZM105.96,64.4c0,.21-.43,1.67-.73,2.22-.04.13-.26.04-.26.17,0,0,.09.17.09.21,0,.13-.13.21-.17.3.17.26.3.17.3.34,0,.09-.09.22-.13.34,0-.13,0-.21-.04-.3,0,.17-1.88,4.23-1.88,4.87,0,.04.04.13.04.21,0,.17-.38.17-.38.34,0,.04.04.04.04.09-1.07,1.84-2.95,4.06-3.42,4.96-2.9,2.56-6.45,5.38-10.98,5.38-1.24,0-5.68-.51-8.2-3.29-.56-.6-.77-1.54-1.28-2.56v-.04c-.04-.08-.09-.17-.09-.26,0-.21.09-.34.13-.51.04.13.13.21.17.21.09,0,.04-.17.38-.34,0-.09.04-.21.04-.21-.17-.09-.21-.21-.21-.34,0-.68.3-1.67.56-2.31h-.13c0-.08.09-.17.09-.21.04.04.04.09.04.21v.04c.3-.38.77-1.37,1.07-2.22.26-.09.34-.3.38-.56.13-.26.34-.55.56-.9.81-1.24,1.96-2.78,2.78-3.12.56-1.33,2.22-2.31,3.29-3.16.9-.73,2.69-2.6,3.59-2.6.04,0,.09.04.13.04.26-.34,1.75-.98,2.52-1.15,0,.21-.04.43-.09.56l.04-.04s.09.04.13.04c.09,0,.17-.13.26-.13,0,0,.17.22.17.43,0,.26-2.56,1.92-3.33,2.39-2.95,2.31-6.02,4.96-8.08,8.03-1.15,1.41-3.03,3.76-3.03,4.61,0,.13.04.3.04.43,0,.26-.04.51-.04.77,0,2.48,3.89,4.36,6.66,4.36,3.97,0,8.16-2.65,8.89-3.67-.13-.04-.21-.04-.21-.09s.04-.09.13-.17c3.63-3.25,5.6-8.8,6.58-13.8.13-.43-.04-.85.26-1.24-.04-.08-.09-.13-.09-.17s.04-.09.13-.09c1.15-4.87,1.54-10.17,2.44-15.17.6-3.33,1.07-6.79,1.41-10.21-4.53,2.14-9.01,4.15-13.67,5.94.13-.26.21-.34.34-.51-.09-.04-.47-.39-.6-.47h.04c.13-1.24,11.45-5.68,11.45-5.81l-.04-.04c2.31-.94,3.12-1.28,3.12-2.99,0-.13-.04-.26-.04-.38,0-.22.6-1.28.85-1.41.04.09.09.13.13.13.13,0,.64-.26.77-.26.73,0,1.62,2.35,1.79,2.35.21,0,.3-.21.47-.21.6,0,.94.43.94.64,0,.34-.26,1.24-.98,1.24l-.04-.04c-.9.26-1.2.68-1.2,2.05,0,.13.04.22.09.3-.04.34-.13.69-.13.98s.09.47.09.73c-.21,1.2-.3,2.39-.43,3.59-.34,3.55-1.15,7.01-1.71,10.47-.51,3.16-1.15,10.25-1.96,10.68.13.13.17.21.17.34ZM147.52,62.13c-.51.21-.81.68-1.2.94-.56.43-2.91,1.96-2.91,2.9,0,.86.9,2.52.9,2.99,0,.09-.04.13-.04.21,0,1.37.6,3.2.6,4.79,0,.3-.09.6-.09.9s.04.6.04.86c0,2.35-1.11,6.58-4.91,6.58-2.09,0-3.5-2.91-3.63-3.16t.04-.08l.13.13s0-.04-.04-.04c0-.38.17-.21.17-.38,0-.3-.34-.77-.34-.81,0-1.92,1.02-5.08,2.39-7.52.64-1.15,2.35-3.07,2.35-3.67,0-.09-.04-.17-.04-.26-1.15-3.29-2.01-5.34-2.31-7.18-1.11.86-2.43,1.58-3.55,2.43-1.11.86-3.8,2.73-3.8,3.38,0,1.28.47,2.99.47,4.27,0,1.07-.3,2.14-.38,3.21-.21,2.14-2.48,9.18-6.88,9.18-2.56,0-4.02-3.21-4.02-3.42,0-.26.3-.47.3-1.07,0-.3-.17-.6-.17-1.03,0-.09.04-.17.04-.26.09.26.13.56.21.73.13-1.67.64-2.82,1.62-4.14,0-.3,1.75-2.52,1.97-3.12,0,.04.04.09.04.09.17-.04.6-.43.6-.64,0-.08-.13-.17-.13-.21.64,0,.68-.81,1.79-1.5.98-.98.56-.43.85-1.24.3-.17,1.41-.6,1.41-1.24,0-.13-.04-.34-.09-.56-.62-1.79-1.05-3.95-1.79-5.88-1.07,1.37-3.05,3.37-3.93,4.47-2.82,3.5-6.02,9.48-10.89,9.48-2.82,0-4.19-2.14-4.19-4.19,0-4.02,3.38-15.47,8.54-15.47,2.18,0,2.82,1.79,2.82,3.93,0,3.25-3.33,5.77-6.11,5.77-.17,0-.34-.13-.43-.13-1.24,0-1.67,5.47-1.84,6.49,0,.77.13,2.05.85,2.05,2.01,0,4.53-1.79,5.68-3.46l-.04-.21s.17,0,.21-.04c1.75-1.96,3.59-4.23,5.26-6.15.99-1.17,2.61-3,3.52-3.94-.12-.47-.2-.96-.2-1.36,0-1.07.51-1.5.51-2.05,0-.3,2.05-1.71,2.78-1.71.17,0,.77.3,1.07.3.09,0,.26-.04.34-.04.55,0,1.88,1.07,1.88,2.95,0,1.28-2.73,2.99-3.93,3.55.38,1.41,1.03,2.95,1.62,4.02.04.17.17.26.21.43,0,.09-.04.17-.04.34,0,0,.04.04.09.04,1.07-.98,2.52-1.67,3.55-2.78.09,0,.13.04.13.13.13-.13.13-.34.34-.38.13-.13.21-.39.26-.39s.09.09.13.13c.51-.81,1.88-1.07,2.39-1.96,0-.09.34-.3.85-.6,0-.04-.04-.08-.04-.13,0-.3,0-.6.04-.9,0-.3-.04-.6-.04-.94.09-.04.09-.09.09-.26,0-.04-.04-.04-.04-.09.04-.04.09-.17.09-.21,0-.08-.04-.21-.04-.3,0-.22.17-1.58.98-2.26.13-.13.81-2.18,2.9-2.18,2.31,0,3.46,1.37,3.46,3.03,0,.64-.26,1.28-.68,1.92t.04.04s.09,0,.17-.04c0,1.71-4.36,1.84-4.36,2.31,0,.81.26,1.71.26,2.43,0,.04,1.11,4.49,1.45,4.49.04,0,4.27-3.72,6.54-4.91,1.15-.85,4.36-2.69,5.38-2.69.04,0,.17.09.26.3v-.04c.13,0,.26.09.34.21-.13.13-.09.17-.43.26.21.04.34.04.47.09,0,.34-5.6,2.73-7.9,4.49Z"/>
        <path fill={mainFill} d="M141.37,55.72c1.5,0,1.37,0,2.35-.6,0-.13.26-.3.26-.43,0-.22.51-.98.51-1.75s-.68-1.28-1.41-1.28c-.47,0-1.58,1.79-1.88,3.76,0,.21,0,.3.17.3Z"/>
        <path fill={mainFill} d="M131.42,54.87c0-.64-.43-1.2-.68-1.2-.04,0-.09.04-.17.08-.94.64-1.84.3-1.84,2.61,0,.3,0,.56.04.9.17-.08.3-.17.3-.26.21-.08,2.18-1.03,2.35-2.14Z"/>
        {/* white highlight inside bubble */}
        <path fill={whiteFill} d="M79.82,73.88h.13c0-.13,0-.17-.04-.21,0,.04-.09.13-.09.21Z"/>
      </g>
      {/* ── SAY ── */}
      <g>
        <path fill={mainFill} d="M29.46,62.16c.27-.08.53-.12.77-.12.27,0,.52.04.76.12v.81c0,.4.1.79.29,1.16.19.38.47.71.83.99s.8.51,1.33.68,1.11.25,1.77.25c1.05,0,1.85-.21,2.42-.62s.85-.99.85-1.72c0-.38-.07-.7-.2-.98-.14-.28-.32-.52-.56-.73s-.52-.38-.85-.53c-.33-.15-.69-.27-1.08-.38l-3.08-.83c-.39-.1-.76-.25-1.12-.44-.36-.19-.68-.42-.95-.7-.27-.28-.49-.6-.65-.98-.16-.37-.24-.81-.24-1.3,0-.67.13-1.26.38-1.76s.59-.93,1.01-1.27c.42-.34.91-.6,1.46-.77s1.14-.26,1.74-.26c.97,0,1.78.16,2.42.48.65.32,1.12.72,1.41,1.18v-1.34c.25-.08.49-.12.74-.12s.5.04.74.12v4.75c-.26.08-.51.12-.76.12-.26,0-.51-.04-.76-.12v-.64c0-.39-.08-.76-.23-1.11-.16-.35-.39-.67-.7-.95-.31-.28-.7-.5-1.15-.66-.46-.16-1-.24-1.62-.24-.85,0-1.56.2-2.11.59-.56.39-.83.98-.83,1.75,0,.54.16.98.48,1.3.32.32.83.58,1.53.76l3.1.83c.58.15,1.11.34,1.57.57.47.22.86.5,1.18.83.32.33.57.72.74,1.17.17.45.25.99.25,1.61s-.13,1.17-.39,1.65c-.26.48-.62.89-1.08,1.22s-1,.59-1.62.76c-.62.17-1.29.26-2,.26-1.06,0-1.93-.16-2.63-.48-.69-.32-1.26-.76-1.72-1.3v1.45c-.26.08-.5.12-.74.12-.25,0-.49-.04-.74-.12v-5.08Z"/>
        <path fill={mainFill} d="M43.13,65.88l4.65-12.94h1.92l4.48,12.94h1.3c.08.23.12.46.12.68s-.04.45-.12.68h-4.77c-.09-.22-.14-.44-.14-.68s.05-.46.14-.68h1.67l-1.07-3.12h-5.5l-1.09,3.12h1.67c.08.23.12.46.12.68s-.04.45-.12.68h-4.55c-.08-.23-.12-.46-.12-.68s.04-.44.12-.68h1.3ZM50.82,61.31l-2.23-6.57-2.29,6.57h4.52Z"/>
        <path fill={mainFill} d="M59.97,65.88v-4.32l-4.61-7.09h-1.12c-.08-.23-.12-.46-.12-.68s.04-.45.12-.68h4.81c.08.23.12.46.12.68s-.04.44-.12.68h-1.76l3.7,5.68,3.82-5.68h-1.78c-.08-.23-.12-.46-.12-.68s.04-.45.12-.68h4.63c.08.23.12.46.12.68s-.04.44-.12.68h-1.12l-4.79,7.11v4.3h1.55c.08.23.12.46.12.68s-.04.45-.12.68h-4.84c-.08-.23-.12-.46-.12-.68s.04-.44.12-.68h1.53Z"/>
      </g>
      {/* ── TO NAILS ── */}
      <g>
        <path fill={mainFill} d="M168.74,65.9v-11.09h-3.57v2.88c-.26.08-.51.12-.76.12-.26,0-.51-.04-.76-.12v-4.26h11.92v4.26c-.26.08-.51.12-.76.12-.26,0-.51-.04-.76-.12v-2.88h-3.57v11.09h1.53c.08.23.12.45.12.66s-.04.44-.12.66h-4.83c-.08-.23-.12-.45-.12-.66s.04-.43.12-.66h1.53Z"/>
        <path fill={mainFill} d="M184.01,67.56c-1.27,0-2.32-.23-3.16-.69s-1.51-1.04-2.03-1.75-.87-1.48-1.09-2.34c-.21-.85-.32-1.67-.32-2.45s.11-1.62.32-2.47c.21-.85.58-1.63,1.09-2.34s1.19-1.29,2.03-1.75,1.89-.69,3.16-.69c.84,0,1.58.11,2.23.32.65.21,1.21.5,1.71.86s.9.78,1.24,1.26c.34.48.61.99.81,1.52.21.54.36,1.09.44,1.65.09.56.14,1.11.14,1.64s-.05,1.07-.14,1.63c-.09.55-.24,1.1-.44,1.64-.21.54-.48,1.05-.81,1.52s-.75.9-1.24,1.26-1.06.65-1.71.86c-.65.21-1.39.32-2.23.32ZM184.01,66.12c.67,0,1.29-.14,1.86-.41.57-.27,1.06-.66,1.47-1.16.41-.51.74-1.11.97-1.83.23-.71.35-1.51.35-2.39s-.12-1.68-.35-2.4c-.23-.72-.55-1.33-.97-1.83-.41-.51-.9-.89-1.47-1.16-.57-.27-1.19-.41-1.86-.41s-1.29.14-1.86.41c-.57.27-1.06.66-1.48,1.16-.42.51-.75,1.12-.98,1.83-.23.72-.35,1.52-.35,2.4s.12,1.68.35,2.39c.23.71.56,1.32.98,1.83.42.51.91.89,1.48,1.16.57.27,1.19.41,1.86.41Z"/>
        <path fill={mainFill} d="M199.98,65.9v-11.14h-1.45c-.08-.23-.12-.45-.12-.66s.04-.44.12-.66h3.59l5.7,9.63c.06.11.14.25.22.42.08.16.17.35.27.55.1.2.19.41.29.62.1.21.19.42.28.62,0-.19,0-.41-.01-.65s-.01-.48-.02-.7c0-.22-.01-.42-.02-.59,0-.17-.01-.29-.01-.35v-8.23h-1.57c-.08-.23-.12-.45-.12-.66s.04-.44.12-.66h4.67c.08.23.12.45.12.66s-.04.43-.12.66h-1.55v12.64h-1.84l-6.01-10.18c-.08-.13-.16-.28-.26-.46-.1-.18-.19-.37-.29-.57-.1-.19-.19-.39-.28-.58-.09-.2-.17-.38-.25-.54.01.2.02.43.03.69,0,.26.01.51.02.76s.01.47.02.68.01.36.01.45v8.27h1.51c.08.23.12.45.12.66s-.04.44-.12.66h-4.5c-.08-.23-.12-.45-.12-.66s.04-.43.12-.66h1.45Z"/>
        <path fill={mainFill} d="M214.32,65.9l4.65-12.64h1.92l4.48,12.64h1.3c.08.23.12.45.12.66s-.04.44-.12.66h-4.77c-.09-.21-.14-.43-.14-.66s.05-.45.14-.66h1.67l-1.07-3.05h-5.5l-1.09,3.05h1.67c.08.23.12.45.12.66s-.04.44-.12.66h-4.55c-.08-.23-.12-.45-.12-.66s.04-.43.12-.66h1.3ZM222.01,61.43l-2.23-6.41-2.29,6.41h4.52Z"/>
        <path fill={mainFill} d="M229.72,65.9v-11.14h-1.45c-.08-.23-.12-.45-.12-.66s.04-.44.12-.66h4.69c.08.23.12.45.12.66s-.04.43-.12.66h-1.47v11.14h1.47c.08.23.12.45.12.66s-.04.44-.12.66h-4.69c-.08-.23-.12-.45-.12-.66s.04-.43.12-.66h1.45Z"/>
        <path fill={mainFill} d="M236.45,65.9v-11.14h-1.45c-.08-.23-.12-.45-.12-.66s.04-.44.12-.66h4.88c.08.23.12.45.12.66s-.04.43-.12.66h-1.67v10.99h5.35v-3.12c.27-.08.52-.12.76-.12.26,0,.5.04.74.12v4.6h-10.06c-.08-.23-.12-.45-.12-.66s.04-.43.12-.66h1.45Z"/>
        <path fill={mainFill} d="M247.16,62.26c.27-.08.53-.11.77-.11.27,0,.52.04.76.11v.8c0,.39.1.77.29,1.13.19.37.47.69.83.97s.8.5,1.33.66,1.11.25,1.77.25c1.05,0,1.85-.2,2.42-.6s.85-.97.85-1.68c0-.37-.07-.68-.2-.96-.14-.27-.32-.51-.56-.71s-.52-.37-.85-.52c-.33-.14-.69-.27-1.08-.37l-3.08-.82c-.39-.1-.76-.24-1.12-.43-.36-.18-.68-.41-.95-.68-.27-.27-.49-.59-.65-.96-.16-.37-.24-.79-.24-1.27,0-.66.13-1.23.38-1.72s.59-.91,1.01-1.24c.42-.33.91-.58,1.46-.76s1.14-.25,1.74-.25c.97,0,1.78.16,2.42.47.65.31,1.12.7,1.41,1.15v-1.3c.25-.08.49-.12.74-.12s.5.04.74.12v4.63c-.26.08-.51.11-.76.11-.26,0-.51-.04-.76-.11v-.62c0-.38-.08-.74-.23-1.09-.16-.35-.39-.66-.7-.93-.31-.27-.7-.49-1.15-.64-.46-.16-1-.23-1.62-.23-.85,0-1.56.19-2.11.58-.56.39-.83.95-.83,1.71,0,.53.16.95.48,1.27.32.32.83.56,1.53.74l3.1.82c.58.15,1.11.34,1.57.56.47.22.86.49,1.18.81.32.32.57.7.74,1.15.17.44.25.96.25,1.57s-.13,1.14-.39,1.61c-.26.47-.62.87-1.08,1.19s-1,.58-1.62.75c-.62.17-1.29.25-2,.25-1.06,0-1.93-.16-2.63-.47-.69-.32-1.26-.74-1.72-1.27v1.42c-.26.08-.5.11-.74.11-.25,0-.49-.04-.74-.11v-4.96Z"/>
      </g>
    </svg>
  );
};

/* ─── LOGOMARK — speech bubble only, for tight spaces ───────────────────── */
/* Crops to just the bubble portion: x≈70 y≈22 w≈90 h≈100 of the 288×144 viewBox */
const LogoMark = ({ size = 36, white = false, bg = null }) => {
  const mainFill   = white ? "#FFFFFF" : "#231f20";
  const whiteFill  = bg ? bg : white ? "#0D0D0D" : "#ffffff";
  return (
    <svg
      width={size} height={size * 1.15}
      viewBox="70 20 95 105"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path fill={mainFill} d="M114.87,22.37c-24.46,0-44.29,17.47-44.29,39.03s18.99,38.26,42.72,38.99c.12.01.24.03.36.04,7.62.58,11.49,7.45-.18,22,0,0,31.63-20.04,41.64-44.74,2.59-4.96,4.04-10.47,4.04-16.28,0-21.55-19.83-39.03-44.29-39.03ZM105.96,64.4c0,.21-.43,1.67-.73,2.22-.04.13-.26.04-.26.17,0,0,.09.17.09.21,0,.13-.13.21-.17.3.17.26.3.17.3.34,0,.09-.09.22-.13.34,0-.13,0-.21-.04-.3,0,.17-1.88,4.23-1.88,4.87,0,.04.04.13.04.21,0,.17-.38.17-.38.34,0,.04.04.04.04.09-1.07,1.84-2.95,4.06-3.42,4.96-2.9,2.56-6.45,5.38-10.98,5.38-1.24,0-5.68-.51-8.2-3.29-.56-.6-.77-1.54-1.28-2.56v-.04c-.04-.08-.09-.17-.09-.26,0-.21.09-.34.13-.51.04.13.13.21.17.21.09,0,.04-.17.38-.34,0-.09.04-.21.04-.21-.17-.09-.21-.21-.21-.34,0-.68.3-1.67.56-2.31h-.13c0-.08.09-.17.09-.21.04.04.04.09.04.21v.04c.3-.38.77-1.37,1.07-2.22.26-.09.34-.3.38-.56.13-.26.34-.55.56-.9.81-1.24,1.96-2.78,2.78-3.12.56-1.33,2.22-2.31,3.29-3.16.9-.73,2.69-2.6,3.59-2.6.04,0,.09.04.13.04.26-.34,1.75-.98,2.52-1.15,0,.21-.04.43-.09.56l.04-.04s.09.04.13.04c.09,0,.17-.13.26-.13,0,0,.17.22.17.43,0,.26-2.56,1.92-3.33,2.39-2.95,2.31-6.02,4.96-8.08,8.03-1.15,1.41-3.03,3.76-3.03,4.61,0,.13.04.3.04.43,0,.26-.04.51-.04.77,0,2.48,3.89,4.36,6.66,4.36,3.97,0,8.16-2.65,8.89-3.67-.13-.04-.21-.04-.21-.09s.04-.09.13-.17c3.63-3.25,5.6-8.8,6.58-13.8.13-.43-.04-.85.26-1.24-.04-.08-.09-.13-.09-.17s.04-.09.13-.09c1.15-4.87,1.54-10.17,2.44-15.17.6-3.33,1.07-6.79,1.41-10.21-4.53,2.14-9.01,4.15-13.67,5.94.13-.26.21-.34.34-.51-.09-.04-.47-.39-.6-.47h.04c.13-1.24,11.45-5.68,11.45-5.81l-.04-.04c2.31-.94,3.12-1.28,3.12-2.99,0-.13-.04-.26-.04-.38,0-.22.6-1.28.85-1.41.04.09.09.13.13.13.13,0,.64-.26.77-.26.73,0,1.62,2.35,1.79,2.35.21,0,.3-.21.47-.21.6,0,.94.43.94.64,0,.34-.26,1.24-.98,1.24l-.04-.04c-.9.26-1.2.68-1.2,2.05,0,.13.04.22.09.3-.04.34-.13.69-.13.98s.09.47.09.73c-.21,1.2-.3,2.39-.43,3.59-.34,3.55-1.15,7.01-1.71,10.47-.51,3.16-1.15,10.25-1.96,10.68.13.13.17.21.17.34ZM147.52,62.13c-.51.21-.81.68-1.2.94-.56.43-2.91,1.96-2.91,2.9,0,.86.9,2.52.9,2.99,0,.09-.04.13-.04.21,0,1.37.6,3.2.6,4.79,0,.3-.09.6-.09.9s.04.6.04.86c0,2.35-1.11,6.58-4.91,6.58-2.09,0-3.5-2.91-3.63-3.16t.04-.08l.13.13s0-.04-.04-.04c0-.38.17-.21.17-.38,0-.3-.34-.77-.34-.81,0-1.92,1.02-5.08,2.39-7.52.64-1.15,2.35-3.07,2.35-3.67,0-.09-.04-.17-.04-.26-1.15-3.29-2.01-5.34-2.31-7.18-1.11.86-2.43,1.58-3.55,2.43-1.11.86-3.8,2.73-3.8,3.38,0,1.28.47,2.99.47,4.27,0,1.07-.3,2.14-.38,3.21-.21,2.14-2.48,9.18-6.88,9.18-2.56,0-4.02-3.21-4.02-3.42,0-.26.3-.47.3-1.07,0-.3-.17-.6-.17-1.03,0-.09.04-.17.04-.26.09.26.13.56.21.73.13-1.67.64-2.82,1.62-4.14,0-.3,1.75-2.52,1.97-3.12,0,.04.04.09.04.09.17-.04.6-.43.6-.64,0-.08-.13-.17-.13-.21.64,0,.68-.81,1.79-1.5.98-.98.56-.43.85-1.24.3-.17,1.41-.6,1.41-1.24,0-.13-.04-.34-.09-.56-.62-1.79-1.05-3.95-1.79-5.88-1.07,1.37-3.05,3.37-3.93,4.47-2.82,3.5-6.02,9.48-10.89,9.48-2.82,0-4.19-2.14-4.19-4.19,0-4.02,3.38-15.47,8.54-15.47,2.18,0,2.82,1.79,2.82,3.93,0,3.25-3.33,5.77-6.11,5.77-.17,0-.34-.13-.43-.13-1.24,0-1.67,5.47-1.84,6.49,0,.77.13,2.05.85,2.05,2.01,0,4.53-1.79,5.68-3.46l-.04-.21s.17,0,.21-.04c1.75-1.96,3.59-4.23,5.26-6.15.99-1.17,2.61-3,3.52-3.94-.12-.47-.2-.96-.2-1.36,0-1.07.51-1.5.51-2.05,0-.3,2.05-1.71,2.78-1.71.17,0,.77.3,1.07.3.09,0,.26-.04.34-.04.55,0,1.88,1.07,1.88,2.95,0,1.28-2.73,2.99-3.93,3.55.38,1.41,1.03,2.95,1.62,4.02.04.17.17.26.21.43,0,.09-.04.17-.04.34,0,0,.04.04.09.04,1.07-.98,2.52-1.67,3.55-2.78.09,0,.13.04.13.13.13-.13.13-.34.34-.38.13-.13.21-.39.26-.39s.09.09.13.13c.51-.81,1.88-1.07,2.39-1.96,0-.09.34-.3.85-.6,0-.04-.04-.08-.04-.13,0-.3,0-.6.04-.9,0-.3-.04-.6-.04-.94.09-.04.09-.09.09-.26,0-.04-.04-.04-.04-.09.04-.04.09-.17.09-.21,0-.08-.04-.21-.04-.3,0-.22.17-1.58.98-2.26.13-.13.81-2.18,2.9-2.18,2.31,0,3.46,1.37,3.46,3.03,0,.64-.26,1.28-.68,1.92t.04.04s.09,0,.17-.04c0,1.71-4.36,1.84-4.36,2.31,0,.81.26,1.71.26,2.43,0,.04,1.11,4.49,1.45,4.49.04,0,4.27-3.72,6.54-4.91,1.15-.85,4.36-2.69,5.38-2.69.04,0,.17.09.26.3v-.04c.13,0,.26.09.34.21-.13.13-.09.17-.43.26.21.04.34.04.47.09,0,.34-5.6,2.73-7.9,4.49Z"/>
      <path fill={mainFill} d="M141.37,55.72c1.5,0,1.37,0,2.35-.6,0-.13.26-.3.26-.43,0-.22.51-.98.51-1.75s-.68-1.28-1.41-1.28c-.47,0-1.58,1.79-1.88,3.76,0,.21,0,.3.17.3Z"/>
      <path fill={mainFill} d="M131.42,54.87c0-.64-.43-1.2-.68-1.2-.04,0-.09.04-.17.08-.94.64-1.84.3-1.84,2.61,0,.3,0,.56.04.9.17-.08.3-.17.3-.26.21-.08,2.18-1.03,2.35-2.14Z"/>
      <path fill={whiteFill} d="M79.82,73.88h.13c0-.13,0-.17-.04-.21,0,.04-.09.13-.09.21Z"/>
    </svg>
  );
};

/* ─── ICONS ─────────────────────────────────────────────────────────────── */
const PX = {
  home:"M3 9.5L12 3l9 6.5V21h-6v-5H9v5H3V9.5z", calendar:"M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z", video:"M15 10l4.553-2.277A1 1 0 0121 8.72v6.56a1 1 0 01-1.447.898L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z", file:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6", message:"M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z", check:"M5 13l4 4L19 7", logout:"M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1", bell:"M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75", dollar:"M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", send:"M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z", play:"M5 3l14 9-14 9V3z", download:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3", award:"M12 15a7 7 0 100-14 7 7 0 000 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12", card:"M1 4h22v16H1zM1 10h22", arrow:"M5 12h14M12 5l7 7-7 7", back:"M19 12H5M12 5l-7 7 7 7", close:"M18 6L6 18M6 6l12 12", menu:"M3 12h18M3 6h18M3 18h18", star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", instagram:"M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM17.5 6.5h.01M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z", eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z", eyeOff:"M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22", lock:"M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4", shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z", settings:"M12 15a3 3 0 100-6 3 3 0 000 6z", grid:"M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z", book:"M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z", graduationCap:"M22 10v6M2 10l10-5 10 5-10 5-10-5zM6 12v5c3.333 1.333 6.667 1.333 10 0v-5", sparkle:"M12 3l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 12l-3.75 2.7 1.5-4.5L6 7.5h4.5L12 3z", trophy:"M6 9H4a1 1 0 01-1-1V5a1 1 0 011-1h2M18 9h2a1 1 0 001-1V5a1 1 0 00-1-1h-2M8 21h8M12 17v4M5 3h14l-1 7a6 6 0 01-12 0L5 3z", mic:"M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8", share:"M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13", heart:"M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z", gift:"M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z", clipBoard:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", link:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71", edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  /* ── Category icons — premium line style ── */
  catWin:"M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z", catTip:"M12 2a7 7 0 017 7c0 2.9-1.7 5.4-4.2 6.6V17a1 1 0 01-1 1h-3.6a1 1 0 01-1-1v-1.4A7 7 0 015 9a7 7 0 017-7zM9.5 21h5M10.5 19h3", catQuestion:"M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01", catResource:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M9 13h6M9 17h4", catIntro:"M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  user:"M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
};
const Ic = ({ n, size = 18, color = "currentColor", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={PX[n] || ""} />
  </svg>
);

/* ─── UI PRIMITIVES ─────────────────────────────────────────────────────── */
const Btn = ({ children, variant = "primary", size = "md", onClick, full, icon, disabled, style = {} }) => {
  const cfg = {
    primary: { bg: B.black, col: B.white, bdr: "none" },
    blush:   { bg: B.blush, col: B.white, bdr: "none" },
    ghost:   { bg: "transparent", col: B.ink, bdr: `1.5px solid ${B.cloud}` },
    ghostDark: { bg: "transparent", col: B.white, bdr: `1.5px solid #444` },
    white:   { bg: B.white, col: B.black, bdr: "none" },
  };
  const { bg, col, bdr } = cfg[variant] || cfg.primary;
  const pad = { sm: "8px 16px", md: "12px 22px", lg: "15px 30px" }[size] || "12px 22px";
  const fs = { sm: 11, md: 13, lg: 14 }[size] || 13;
  return (
    <button onClick={onClick} disabled={disabled} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:pad, background:bg, border:bdr, borderRadius:2, color:col, fontSize:fs, fontWeight:700, cursor:disabled?"not-allowed":"pointer", fontFamily:FONTS.body, width:full?"100%":undefined, opacity:disabled?.5:1, letterSpacing:"0.08em", textTransform:"uppercase", transition:"all .2s", ...style }}>
      {icon && <Ic n={icon} size={fs + 3} color={col} />}
      {children}
    </button>
  );
};

const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{ background: B.white, border: `1px solid ${B.cloud}`, borderRadius: 4, ...style, cursor: onClick ? "pointer" : undefined }}>{children}</div>
);

const Tag = ({ children, dark }) => (
  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", padding: "3px 10px", border: `1px solid ${dark ? B.charcoal : B.cloud}`, borderRadius: 2, color: dark ? B.white : B.steel, background: "transparent", display: "inline-block", whiteSpace: "nowrap" }}>{children}</span>
);

const BlushTag = ({ children }) => (
  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", padding: "3px 10px", background: B.blush, color: B.white, borderRadius: 2, display: "inline-block", whiteSpace: "nowrap" }}>{children}</span>
);

const Section = ({ children, style = {} }) => (
  <p style={{ fontSize: 9, fontWeight: 700, color: B.blush, letterSpacing: 3, textTransform: "uppercase", margin: 0, ...style }}>{children}</p>
);

const PBar = ({ value, h = 3 }) => (
  <div style={{ height: h, background: B.cloud, borderRadius: 0 }}>
    <div style={{ height: "100%", width: `${Math.min(100, value)}%`, background: B.blush, borderRadius: 0, transition: "width 1s ease" }} />
  </div>
);

const Divider = () => <div style={{ height: 1, background: B.cloud, width: "100%" }} />;

/* ════════════════════════════════════════════════════════════════════════
   LANDING PAGE
════════════════════════════════════════════════════════════════════════ */
const Landing = ({ onSignIn, onBook, onApply }) => {
  const { isMobile } = useLayout();
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("mentorship");
  const sectionRef = useRef(null);

  const switchTab = (id) => {
    setActiveTab(id);
    setTimeout(() => {
      if (sectionRef.current) {
        const top = sectionRef.current.getBoundingClientRect().top + window.scrollY - (isMobile ? 130 : 150);
        window.scrollTo({ top, behavior: "smooth" });
      }
    }, 20);
  };

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const tiers = [
    { name: "Community", price: "$27", sub: "/month after free trial", value: "", saving: "7 days free", features: ["7-day free trial — no credit card required", "Private community feed — all nail techs welcome", "Jess's weekly audio check-in", "Free resources & templates", "Peer wins, encouragement & accountability", "Visibility into what full mentorship looks like", "Direct path to upgrade when you're ready"], accent: false, community: true },
    { name: "Hourly Session", price: "$250", value: "$750", saving: "Save $500", sub: "One session, total clarity", features: ["60-min focused session with Jess", "You set the agenda — she brings the answers", "Written action plan after every session", "No commitment required — start here", "Payment plans available"], accent: false },
    { name: "30-Day Intensive", price: "$1,120", value: "$3,600", saving: "Save $2,480", sub: "Real momentum, one month", features: ["Structured 30-day roadmap built around you", "Live sessions + guided check-ins", "Pricing strategy & client attraction coaching", "Direct access to Jess throughout the month", "Resources and tools curated to your goals", "Payment plans available"], accent: false },
    { name: "3-Month Elite", price: "$3,360", value: "$8,550", saving: "Save $5,190", sub: "Complete transformation", features: ["Full 90-day personalized growth plan", "Deep-dive sessions at every stage", "Milestone tracking & accountability built in", "Community access for ongoing support", "Monthly reviews to keep you on track", "End-of-quarter strategy audit", "Payment plans available"], accent: true },
  ];

  const testimonials = [
    { name: "Kayla T.", tier: "3-Month Elite", q: "Jess helped me raise my prices 30% in the first month. My books are consistently full for the first time ever." },
    { name: "Bria M.", tier: "30-Day Intensive", q: "In 30 days I went from 4 clients to 11. The plan Jess built actually worked." },
    { name: "Savannah R.", tier: "Hourly Session", q: "One session gave me total clarity on my pricing. I left knowing exactly what to charge and how to say it." },
  ];

  return (
    <div style={{ fontFamily: FONTS.body, background: B.white, minHeight: "100dvh", color: B.black }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { -webkit-text-size-adjust: 100%; }
        button { -webkit-tap-highlight-color: transparent; }
        input, textarea { font-size: 16px !important; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: ${B.cloud}; }

        /* ── Page load animations ── */
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideRight { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
        @keyframes pop { 0%{transform:scale(.5);opacity:0} 80%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        @keyframes lineGrow { from{width:0} to{width:56px} }
        @keyframes countUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

        /* ── Hero text stagger ── */
        .hero-badge   { animation: fadeIn .6s ease both; animation-delay: .1s; }
        .hero-h1      { animation: fadeUp .8s cubic-bezier(.16,1,.3,1) both; animation-delay: .25s; }
        .hero-line    { animation: lineGrow .6s ease both; animation-delay: .7s; }
        .hero-body    { animation: fadeUp .7s cubic-bezier(.16,1,.3,1) both; animation-delay: .45s; }
        .hero-cta     { animation: fadeUp .7s cubic-bezier(.16,1,.3,1) both; animation-delay: .6s; }
        .hero-stats   { animation: fadeUp .8s cubic-bezier(.16,1,.3,1) both; animation-delay: .75s; }
        .stat-tile    { animation: scaleIn .5s cubic-bezier(.16,1,.3,1) both; }
        .stat-tile:nth-child(1){ animation-delay:.8s }
        .stat-tile:nth-child(2){ animation-delay:.92s }
        .stat-tile:nth-child(3){ animation-delay:1.04s }
        .stat-tile:nth-child(4){ animation-delay:1.16s }

        /* ── Section reveal on tab switch ── */
        .section-reveal { animation: fadeUp .5s cubic-bezier(.16,1,.3,1) both; }
        .tier-card { animation: slideUp .5s cubic-bezier(.16,1,.3,1) both; }
        .tier-card:nth-child(1){ animation-delay:.05s }
        .tier-card:nth-child(2){ animation-delay:.15s }
        .tier-card:nth-child(3){ animation-delay:.25s }

        /* ── Button hover effects ── */
        button { transition: all .22s cubic-bezier(.16,1,.3,1) !important; }
        button:not(:disabled):hover { transform: translateY(-2px); }
        button:not(:disabled):active { transform: translateY(0px) scale(0.98); }

        /* ── Blush button hover ── */
        .btn-blush:hover  { background: #a8435e !important; box-shadow: 0 8px 24px ${B.blush}50 !important; }
        .btn-black:hover  { background: #2a2a2a !important; box-shadow: 0 8px 20px rgba(0,0,0,0.3) !important; }
        .btn-white:hover  { background: #f0f0f0 !important; }
        .btn-ghost:hover  { border-color: ${B.blush} !important; color: ${B.blush} !important; }
        .btn-ghostdark:hover { border-color: #888 !important; color: #fff !important; }

        /* ── Tab hover — only targets INACTIVE tabs, never overrides active ── */
        .tab-btn-inactive:hover { border-color: ${B.blush} !important; color: ${B.blush} !important; }
        .tab-btn-active { pointer-events: none; }

        /* ── Card hover ── */
        .hover-card { transition: transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s ease; }
        .hover-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.09) !important; }

        /* ── Pricing card hover ── */
        .pricing-card { transition: transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s ease; }
        .pricing-card:hover { transform: translateY(-6px); box-shadow: 0 20px 48px rgba(0,0,0,0.12) !important; }

        /* ── Nav link hover ── */
        .nav-link:hover { color: ${B.blush} !important; }

        /* ── Input focus ── */
        input:focus, textarea:focus { border-color: ${B.blush} !important; box-shadow: 0 0 0 3px ${B.blush}18 !important; outline: none !important; }

        /* ── Testimonial card ── */
        .testimonial-card { animation: scaleIn .5s cubic-bezier(.16,1,.3,1) both; }
        .testimonial-card:nth-child(1){ animation-delay:.1s }
        .testimonial-card:nth-child(2){ animation-delay:.2s }
        .testimonial-card:nth-child(3){ animation-delay:.3s }

        /* ── Portal sidebar nav items ── */
        .sidebar-nav-btn:hover { color: ${B.blushLight} !important; background: ${B.blush}12 !important; border-left-color: ${B.blush}60 !important; }

        /* ── Booking slot hover ── */
        .slot-btn:hover { border-color: ${B.blush} !important; background: ${B.blushPale} !important; }

        /* ── Smooth scroll area ── */
        .smooth-scroll { scroll-behavior: smooth; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 200, background: scrolled ? "rgba(255,255,255,0.97)" : B.black, borderBottom: scrolled ? `1px solid ${B.cloud}` : "none", backdropFilter: scrolled ? "blur(12px)" : "none", padding: isMobile ? "14px 20px" : "14px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all .35s" }}>
        <Logo height={isMobile ? 50 : 60} white={!scrolled} />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!isMobile && <button onClick={onSignIn} style={{ fontSize: 11, color: scrolled ? B.steel : B.white, border: "none", background: "none", cursor: "pointer", fontFamily: FONTS.body, fontWeight: 500, padding: "8px 12px", letterSpacing: "0.08em" }}>SIGN IN</button>}
          <Btn size="sm" variant={scrolled ? "primary" : "white"} onClick={onBook}>Book a Call</Btn>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: B.black, minHeight: isMobile ? "auto" : "88vh", padding: isMobile ? "72px 24px 64px" : "0 80px", position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}>
        {/* Grain texture */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")", opacity: 0.5 }} />
        {/* Right blush glow — desktop only */}
        {!isMobile && <div style={{ position: "absolute", right: -120, top: "50%", transform: "translateY(-50%)", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${B.blush}18 0%, transparent 70%)`, pointerEvents: "none" }} />}
        {/* Bottom fade line */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(to right, transparent, ${B.blush}40, transparent)` }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%", position: "relative", display: isMobile ? "block" : "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", padding: isMobile ? 0 : "100px 0" }}>

          {/* LEFT — headline + CTA */}
          <div>
            <div className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, padding: "6px 14px", border: `1px solid ${B.blush}40`, borderRadius: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: B.blush, animation: "pulse 2s infinite", flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>Now Accepting New Mentees</span>
            </div>

            <h1 className="hero-h1" style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 68 : 118, lineHeight: 0.88, color: B.ivory, marginBottom: 0, textTransform: "uppercase", letterSpacing: "-3px" }}>
              Turn Your<br/>
              <span style={{ color: B.blush, fontStyle: "italic", fontWeight: 300, letterSpacing: "-2px" }}>Passion</span><br/>
              Into Profit.
            </h1>

            <div className="hero-line" style={{ width: 56, height: 3, background: B.blush, margin: "28px 0" }} />

            <p className="hero-body" style={{ fontSize: isMobile ? 15 : 17, color: "#9a8880", lineHeight: 1.85, maxWidth: 480, marginBottom: 40, fontWeight: 300 }}>
              Whether you just got your license and don't know where to start — or you've been behind the chair for years and still feel stuck — Jess meets you exactly where you are. No more undercharging. No more empty books. No more wondering if this career can actually support your life. It can. And she'll show you how.
            </p>

            <div className="hero-cta" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn size="lg" variant="blush" onClick={onBook} icon="calendar">Book Free Discovery Call</Btn>
              <Btn size="lg" variant="ghostDark" onClick={onSignIn} icon="lock">Mentee Portal</Btn>
            </div>
          </div>

          {/* RIGHT — stats panel */}
          <div className="hero-stats" style={{ marginTop: isMobile ? 52 : 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {[
                { n: "50+",  l: "Nail techs mentored",          sub: "and growing" },
                { n: "95%",  l: "Raise prices within 30 days",  sub: "of mentees" },
                { n: "100%", l: "Personalized to you",          sub: "no templates, ever" },
                { n: "48hr", l: "Response guarantee",           sub: "during your program" },
              ].map(({ n, l, sub }) => (
                <div key={l} className="stat-tile" style={{ padding: isMobile ? "24px 20px" : "32px 28px", border: `1px solid #1e1e1e`, background: "#0a0a0a", position: "relative", overflow: "hidden", transition: "transform .22s cubic-bezier(.16,1,.3,1), border-color .22s" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: B.blush }} />
                  <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 40 : 52, color: B.ivory, lineHeight: 1, letterSpacing: "-1px" }}>{n}</div>
                  <div style={{ fontSize: isMobile ? 11 : 12, color: "#9a8880", fontWeight: 400, marginTop: 8, lineHeight: 1.4 }}>{l}</div>
                  <div style={{ fontSize: 9, color: B.blush, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── SECTION TABS ── */}
      <div style={{ background: B.white, borderBottom: `1px solid ${B.cloud}`, position: "sticky", top: isMobile ? 79 : 89, zIndex: 99, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "12px 16px" : "16px 40px", display: "flex", gap: isMobile ? 8 : 12, alignItems: "center", justifyContent: isMobile ? "stretch" : "flex-start" }}>
          {[["mentorship", "Mentorship", "star"], ["academy", "graduationCap", "Academy"], ["about", "user", "About Jess"]].map(([id, label, icon]) => {
            const tabLabel = id === "academy" ? "Academy" : id === "about" ? "About Jess" : "Mentorship";
            const tabIcon  = id === "academy" ? "graduationCap" : id === "about" ? "user" : "star";
            const on = activeTab === id;
            return (
              <button key={id} onClick={() => switchTab(id)} className={on ? "tab-btn-active" : "tab-btn-inactive"} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 4 : 7, padding: isMobile ? "9px 4px" : "12px 24px", border: `2px solid ${on ? B.blush : B.cloud}`, borderRadius: 40, background: on ? B.blush : B.white, color: on ? B.white : B.steel, fontSize: isMobile ? 10 : 13, fontWeight: 700, cursor: on ? "default" : "pointer", fontFamily: FONTS.body, letterSpacing: isMobile ? "0.01em" : "0.05em", transition: "all .2s", whiteSpace: "nowrap", boxShadow: on ? `0 4px 14px ${B.blush}40` : "none" }}>
                <Ic n={tabIcon} size={isMobile ? 11 : 15} color={on ? B.white : B.steel} />
                {tabLabel}
              </button>
            );
          })}
          {!isMobile && <div style={{ marginLeft: "auto", fontSize: 10, color: B.mid, fontWeight: 300, letterSpacing: 1 }}>SELECT A SECTION TO EXPLORE ↑</div>}
        </div>
        {isMobile && <div style={{ textAlign: "center", paddingBottom: 10, fontSize: 9, color: B.mid, fontWeight: 300, letterSpacing: 1 }}>TAP A TAB TO EXPLORE</div>}
      </div>

      {/* Scroll anchor — sectionRef targets here on tab switch */}
      <div ref={sectionRef} />

      {/* ── MENTORSHIP ── */}
      {activeTab === "mentorship" && <>
        {/* Pricing */}
        <section className="section-reveal" style={{ padding: isMobile ? "60px 24px" : "80px 40px", background: B.white }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ marginBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
              <div>
                <Section style={{ marginBottom: 12 }}>Investment</Section>
                <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 44 : 64, textTransform: "uppercase", lineHeight: 0.95, letterSpacing: "-1px" }}>Four Ways<br/>To Say Yes.</h2>
              </div>
              <p style={{ color: B.steel, fontSize: 14, maxWidth: 320, lineHeight: 1.7, fontWeight: 300 }}>Try the community free for 7 days, then $27/month. Grow into 1:1 mentorship when you're ready — every path leads to the same place.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", gap: 2 }}>
              {tiers.map(({ name, price, sub, value, saving, features, accent, community }) => (
                <div key={name} className="tier-card pricing-card" style={{ background: accent ? B.black : community ? `linear-gradient(160deg, ${B.blushPale} 0%, ${B.white} 100%)` : B.white, border: `1px solid ${community ? B.blushMid : B.cloud}`, padding: "36px 24px", position: "relative" }}>
                  {accent && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: B.blush }} />}
                  {accent && <div style={{ position: "absolute", top: 16, right: 16 }}><BlushTag>Most Popular</BlushTag></div>}
                  {community && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${B.blushLight}, ${B.blush})` }} />}
                  {community && <div style={{ position: "absolute", top: 16, right: 16 }}><span style={{ fontSize: 8, fontWeight: 700, color: B.blush, background: B.blushPale, padding: "3px 8px", letterSpacing: 1, border: `1px solid ${B.blushMid}` }}>START HERE</span></div>}
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: community ? B.blush : accent ? B.mid : B.steel, marginBottom: 16, fontFamily: FONTS.display }}>{name}</div>
                  <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: community ? 44 : 54, color: accent ? B.white : B.black, lineHeight: 1 }}>{price}</div>
                  <div style={{ fontSize: 11, color: accent ? "#9a8880" : B.steel, marginTop: 4, marginBottom: 6, fontWeight: 300 }}>{sub}</div>
                  {(value || saving) && <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                    {value && <span style={{ fontSize: 10, color: accent ? B.blushLight : B.steel, fontWeight: 300, textDecoration: "line-through" }}>{value} value</span>}
                    {saving && <span style={{ fontSize: 10, fontWeight: 700, color: community ? B.success : B.blush }}>{saving}</span>}
                  </div>}
                  {!(value || saving) && <div style={{ marginBottom: 24 }} />}
                  <Divider />
                  <div style={{ margin: "20px 0 24px" }}>
                    {features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", background: community ? B.blushLight : B.blush, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                          <Ic n="check" size={9} color={B.white} sw={2.5} />
                        </div>
                        <span style={{ fontSize: 12, color: accent ? B.ivory : B.charcoal, lineHeight: 1.4, fontWeight: 300 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  {community
                    ? <Btn full variant="blush" onClick={onApply} style={{ whiteSpace:"normal", lineHeight:1.3, textAlign:"center" }}><span>Start Free<br/>7-Day Trial</span></Btn>
                    : <Btn full variant={accent ? "blush" : "primary"} onClick={onBook}>Book Discovery Call</Btn>
                  }
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <p style={{ color: B.mid, fontSize: 12, fontWeight: 300 }}>Not sure which option fits? The discovery call is free — Jess will help you decide.</p>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section style={{ background: B.off, padding: isMobile ? "60px 24px" : "80px 40px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <Section style={{ marginBottom: 12 }}>Results</Section>
            <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 44 : 60, textTransform: "uppercase", lineHeight: 0.95, letterSpacing: "-1px", marginBottom: 48 }}>What Mentees Say.</h2>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 2 }}>
              {testimonials.map(({ name, tier, q }) => (
                <div key={name} className="testimonial-card hover-card" style={{ background: B.white, border: `1px solid ${B.cloud}`, padding: "32px 28px" }}>
                  <div style={{ display: "flex", marginBottom: 16 }}>
                    {[...Array(5)].map((_, i) => <Ic key={i} n="star" size={12} color={B.blush} sw={0} />)}
                  </div>
                  <p style={{ fontSize: 14, color: B.charcoal, lineHeight: 1.75, margin: "0 0 20px", fontWeight: 300, fontStyle: "italic" }}>"{q}"</p>
                  <Divider />
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: B.black, letterSpacing: "0.05em" }}>{name}</div>
                    <Tag>{tier}</Tag>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </>}

      {/* ── ACADEMY ── */}
      {activeTab === "academy" && (
        <section style={{ padding: isMobile ? "60px 24px" : "80px 40px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <Section style={{ marginBottom: 12 }}>Coming Soon</Section>
            <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 48 : 72, textTransform: "uppercase", lineHeight: 0.92, letterSpacing: "-1px", marginBottom: 8 }}>
              Creations<br/>
              <span style={{ color: B.blush, fontStyle: "italic", fontWeight: 300 }}>Academy.</span>
            </h2>
            <div style={{ width: 48, height: 2, background: B.blush, margin: "20px 0 28px" }} />
            <p style={{ fontSize: 16, color: B.steel, lineHeight: 1.8, maxWidth: 620, marginBottom: 48, fontWeight: 300 }}>
              This isn't just a school. It's the foundation of a career. We teach nail techs everything they need to get licensed, get clients, and get paid — with the same personalized attention and real-world business training that sets our mentorship apart.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 2, marginBottom: 48 }}>
              {[
                { icon: "sparkle", title: "Technique Grounded in Science", desc: "Natural nail care, gel systems, acrylics, structured manicures, and nail health — taught with the precision and depth your clients will feel." },
                { icon: "dollar", title: "Business Built Into the Curriculum", desc: "Pricing, client attraction, rebooking, social media, and financial basics. You graduate as a nail tech and a business owner — not just one or the other." },
                { icon: "book", title: "Florida State License Preparation", desc: "Our full curriculum prepares you for the Florida Board of Cosmetology exam so you can practice legally, confidently, and professionally from day one." },
                { icon: "users", title: "A Community for Life", desc: "Academy graduates join Jess's mentorship network. The support doesn't stop at graduation — it's how we make sure you actually thrive." },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ border: `1px solid ${B.cloud}`, padding: "32px 28px", display: "flex", gap: 18, alignItems: "flex-start" }}>
                  <div style={{ width: 40, height: 40, background: B.black, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ic n={icon} size={18} color={B.white} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: B.black, marginBottom: 6, letterSpacing: "0.03em" }}>{title}</div>
                    <div style={{ fontSize: 12, color: B.steel, lineHeight: 1.65, fontWeight: 300 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Momentum callout */}
            <div style={{ background: B.black, padding: "32px 32px", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 40 }}>
              <div style={{ width: 3, background: B.blush, alignSelf: "stretch", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: B.blushLight, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>The Waitlist Is Open</div>
                <p style={{ color: B.ivory, fontSize: 14, lineHeight: 1.75, fontWeight: 300, maxWidth: 580 }}>
                  Creations Academy seats will be limited and fill fast. The nail techs who join the waitlist first will get early access, priority enrollment, and an exclusive rate available only before doors open. If you've been waiting for a sign — this is it.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Btn size="lg" variant="blush" onClick={onBook} icon="zap">Join the Waitlist</Btn>
              <Btn size="lg" variant="ghost" onClick={onBook}>Learn More</Btn>
            </div>
          </div>
        </section>
      )}

      {/* ── ABOUT ── */}
      {activeTab === "about" && (
        <section style={{ padding: isMobile ? "60px 24px" : "80px 40px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>

            {/* Headline + photo side by side */}
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 32 : 60, alignItems: isMobile ? "flex-start" : "center", marginBottom: 48 }}>

              {/* Left — headline + copy + CTAs */}
              <div style={{ flex: 1 }}>
                <Section style={{ marginBottom: 12 }}>Your Mentor</Section>
                <div style={{ display: "flex", alignItems: isMobile ? "center" : "flex-start", gap: isMobile ? 20 : 0, flexDirection: isMobile ? "row" : "column" }}>
                  <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 56 : 80, textTransform: "uppercase", lineHeight: 0.88, letterSpacing: "-2px", margin: 0 }}>
                    Hi, I'm<br/>
                    <span style={{ color: B.blush, fontStyle: "italic", fontWeight: 300 }}>Jess.</span>
                  </h2>
                  {isMobile && (
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ position: "relative" }}>
                        <div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: `2px solid ${B.blush}`, opacity: 0.35 }} />
                        <div style={{ width: 110, height: 110, borderRadius: "50%", overflow: "hidden", border: `3px solid ${B.blushLight}` }}>
                          <img src="data:image/jpeg;base64,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" alt="Jess Ramos" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ width: 40, height: 2, background: B.blush, margin: isMobile ? "20px 0" : "24px 0 20px" }} />
                <p style={{ fontSize: 15, color: B.steel, lineHeight: 1.95, marginBottom: 14, fontWeight: 300 }}>
                  Jess knows what it feels like to be talented at your craft and still wonder why the business side isn't adding up. As a full nail specialist, salon owner of Creations Beauty Lounge, and the heart behind SayJessToNails — she's lived it. She didn't just figure out how to do nails beautifully, she figured out how to build something real around them.
                </p>
                <p style={{ fontSize: 15, color: B.steel, lineHeight: 1.95, marginBottom: 14, fontWeight: 300 }}>
                  Now she helps other nail techs do the work: getting clear on their pricing, attracting the right clients, and showing up with the confidence that matches the skill they already have. No guarantees — just real strategy, honest guidance, and someone in your corner who's already walked the path.
                </p>
                <p style={{ fontSize: 15, color: B.steel, lineHeight: 1.95, marginBottom: 28, fontWeight: 300 }}>
                  A certified Light Elegance educator and mentor to 50+ nail techs, Jess brings both the artistry and the business strategy — because you deserve both.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Btn onClick={onBook}>Book a Discovery Call</Btn>
                  <Btn variant="ghost" icon="instagram">@sayjesstonails</Btn>
                </div>
              </div>

              {/* Right — desktop photo only */}
              {!isMobile && (
                <div style={{ flexShrink: 0 }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: `2px solid ${B.blush}`, opacity: 0.35 }} />
                    <div style={{ width: 300, height: 300, borderRadius: "50%", overflow: "hidden", border: `3px solid ${B.blushLight}` }}>
                      <img src="data:image/jpeg;base64,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" alt="Jess Ramos" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stats + credentials */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 2, marginBottom: 32 }}>
              {[["50+", "Nail techs mentored"], ["5+", "Years educating"], ["2", "Brands built"], ["100%", "Personalized"]].map(([val, lbl]) => (
                <div key={lbl} style={{ padding: "24px 20px", border: `1px solid ${B.cloud}`, borderTop: `3px solid ${B.blush}`, textAlign: "center" }}>
                  <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 36, color: B.black, lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: 10, color: B.mid, fontWeight: 300, marginTop: 6, letterSpacing: 1, textTransform: "uppercase" }}>{lbl}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {["Licensed nail tech & full nail specialist", "Salon owner — Creations Beauty Lounge, Miramar FL", "Mentor to 50+ nail techs", "Light Elegance certified educator", "2025 Creations Academy founder"].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", border: `1px solid ${B.cloud}`, background: B.white }}>
                  <Ic n="check" size={14} color={B.blush} />
                  <span style={{ fontSize: 13, color: B.charcoal, fontWeight: 400 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section style={{ background: B.black, padding: isMobile ? "72px 24px" : "96px 40px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <Logo height={44} white />
          </div>
          <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 48 : 72, textTransform: "uppercase", lineHeight: 0.92, color: B.ivory, marginBottom: 20, letterSpacing: "-1px" }}>
            The First Step Is<br/>
            <span style={{ color: B.blushLight, fontStyle: "italic", fontWeight: 300 }}>Just Saying Yes.</span>
          </h2>
          <p style={{ color: "#9a8880", fontSize: 15, lineHeight: 1.75, marginBottom: 32, fontWeight: 300 }}>Free 20-minute discovery call. No pitch, no pressure. Just Jess, you, and the conversation that starts everything.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn size="lg" variant="blush" onClick={onBook} icon="calendar">Book Your Free Call</Btn>
            <Btn size="lg" variant="ghostDark" onClick={onSignIn} icon="lock">Already a mentee?</Btn>
          </div>
        </div>
      </section>

      <footer style={{ background: "#070707", padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <Logo height={24} white />
        <div style={{ fontSize: 10, color: "#9a8880", fontWeight: 300 }}>sayjesstonails.com · info@sayjesstonails.com · 954-544-2888</div>
        <div style={{ fontSize: 9, color: "#9a8880", letterSpacing: 1 }}>© 2025 SAYJESSTONAILS · ALL DATA ENCRYPTED</div>
      </footer>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   AUTH PORTAL
════════════════════════════════════════════════════════════════════════ */
const AuthPortal = ({ onLogin, onBack, onBook }) => {
  const { isMobile } = useLayout();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState("");

  const signup = useCallback(async () => {
    if (!email.trim() || !pass.trim() || !firstName.trim()) { setErr("Please fill in all fields."); return; }
    if (pass.length < 8) { setErr("Password must be at least 8 characters."); return; }
    setBusy(true); setErr("");
    const { user, error } = await signUp(email.toLowerCase(), pass, firstName);
    if (error) { setErr(error.message); setBusy(false); return; }
    if (user) {
      const userData = { role: "community", firstName, name: firstName, email: email.toLowerCase(), avatar: firstName.slice(0,2).toUpperCase(), tier: "Community Member", tierKey: "community" };
      onLogin(email.toLowerCase(), userData, { userId: email.toLowerCase(), role: "community", expires: Date.now() + 8 * 60 * 60 * 1000 });
    }
    setBusy(false);
  }, [email, pass, firstName, onLogin]);

  const login = useCallback(async () => {
    if (!Sec.rateOk(email)) { setLocked(true); setErr("Too many attempts. Please wait 15 minutes."); return; }
    if (!email.trim() || !pass.trim()) { setErr("Please enter your email and password."); return; }
    setBusy(true); setErr("");
    Sec.record(email);

    // No hardcoded logins — all auth goes through Supabase
    const u = DB.users[email.toLowerCase()];
    if (u && u.password && u.password === pass) {
      onLogin(email.toLowerCase(), u, Sec.createSession({ email: email.toLowerCase(), role: u.role }));
      setBusy(false);
      return;
    }

    // Fall back to real Supabase auth for invited mentees
    const { user, error } = await signIn(email.toLowerCase(), pass);
    if (error) {
      setErr("Email or password is incorrect.");
      setBusy(false);
      return;
    }
    if (user) {
      const tier = user.user_metadata?.tier || "Hourly Session";
      let role = user.user_metadata?.role || "mentee";
      const firstName = user.user_metadata?.first_name || email.split("@")[0];

      // Admin email always gets admin role — use stored admin profile
      if (email.toLowerCase() === "jess@sayjesstonails.com") {
        const adminProfile = DB.users["jess@sayjesstonails.com"] || { role:"admin", name:"Jess Ramos", firstName:"Jess", avatar:"JR" };
        onLogin(email.toLowerCase(), { ...adminProfile, email: email.toLowerCase() }, Sec.createSession({ email: email.toLowerCase(), role: "admin" }));
        setBusy(false);
        return;
      }

      // Check if mentee has graduated — override role to community
      let isGraduate = false;
      if (role === "mentee" || role === "community") {
        const { data: gradData } = await supabase.functions.invoke('assign-task', { body: { action: 'check_graduated', email } });
        if (gradData?.graduated) { role = "community"; isGraduate = true; }
      }

      const userData = {
        role,
        firstName,
        name: firstName,
        email: email.toLowerCase(),
        avatar: firstName.slice(0,2).toUpperCase(),
        tier,
        tierKey: isGraduate ? "graduate" : tier.includes("Elite") ? "elite" : tier.includes("Intensive") ? "intensive" : "hourly",
        paid: isGraduate ? true : false,
        graduated: isGraduate,
        totalDays: tier.includes("Elite") ? 90 : tier.includes("Intensive") ? 30 : 1,
        daysRemaining: calcDaysRemaining(new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }), tier.includes("Elite") ? 90 : tier.includes("Intensive") ? 30 : 1),
        sessionsCompleted: 0,
        sessionsTotal: tier.includes("Elite") ? 6 : tier.includes("Intensive") ? 2 : 1,
        milestones: [],
        messages: [],
        documents: [],
        schedule: [],
        payments: [],
        goal: "Getting started",
        startDate: new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }),
        nextSession: null,
      };
      const session = Sec.createSession({ email: email.toLowerCase(), role });
      onLogin(email.toLowerCase(), userData, session);
    }
    setBusy(false);
  }, [email, pass, onLogin]);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const inp = (err) => ({ width: "100%", padding: "14px 18px", background: "transparent", border: `1px solid ${err ? B.blush : "#333"}`, fontSize: 15, color: B.ivory, fontFamily: FONTS.body, outline: "none", boxSizing: "border-box", WebkitAppearance: "none", borderRadius: 0 });

  if (forgot) return (
    <div style={{ minHeight: "100dvh", background: B.black, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: FONTS.body }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=DM+Sans:wght@300;400;500;600&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0} input{font-size:16px!important} button{-webkit-tap-highlight-color:transparent}`}</style>
      <div style={{ width: "100%", maxWidth: 440, padding: isMobile ? "0" : "0" }}>
        <div style={{ marginBottom: 40, display: "flex", justifyContent: "center" }}><Logo height={60} white /></div>
        {forgotSent ? (
          <>
            <div style={{ width: 48, height: 48, background: B.successPale, border: `2px solid ${B.success}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 0 20px" }}><Ic n="check" size={22} color={B.success} sw={2.5} /></div>
            <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 40, textTransform: "uppercase", color: B.ivory, margin: "0 0 10px", letterSpacing: "-0.5px" }}>Check Your Inbox.</h2>
            <p style={{ color: "#9a8880", fontSize: 13, lineHeight: 1.7, margin: "0 0 28px", fontWeight: 300 }}>Reset link sent to <strong style={{ color: B.blushLight }}>{forgotEmail}</strong>.</p>
            <Btn full variant="blush" onClick={() => { setForgot(false); setForgotSent(false); }}>Back to Sign In</Btn>
          </>
        ) : (
          <>
            <button onClick={() => setForgot(false)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: B.ivory, cursor: "pointer", marginBottom: 32, fontFamily: FONTS.body, fontSize: 13, fontWeight: 500 }}><Ic n="back" size={14} color={B.ivory} />Back to Sign In</button>
            <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 40, textTransform: "uppercase", color: B.ivory, margin: "0 0 10px", letterSpacing: "-0.5px" }}>Reset Password.</h2>
            <p style={{ color: "#9a8880", fontSize: 13, lineHeight: 1.7, margin: "0 0 28px", fontWeight: 300 }}>Enter the email tied to your account.</p>
            <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} type="email" placeholder="your@email.com" style={{ ...inp(false), marginBottom: 16 }} />
            <Btn full variant="blush" onClick={() => { setBusy(true); setTimeout(() => { setForgotSent(true); setBusy(false); }, 900); }} disabled={busy || !forgotEmail.includes("@")}>{busy ? "Sending…" : "Send Reset Link"}</Btn>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: B.black, fontFamily: FONTS.body, position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        button{-webkit-tap-highlight-color:transparent}
        input,textarea{font-size:16px!important;font-family:inherit}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#333}
        input::placeholder{color:#555}
        @keyframes drawerIn{from{transform:translateX(-100%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes drawerOut{from{transform:translateX(0);opacity:1}to{transform:translateX(-100%);opacity:0}}
        @keyframes fadeInAuth{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .auth-form{animation:fadeInAuth .5s cubic-bezier(.16,1,.3,1) both}
        .drawer-panel{animation:drawerIn .35s cubic-bezier(.16,1,.3,1) both}
      `}</style>

      {/* ── Top bar — no logo here, just navigation ── */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "20px 24px" : "24px 48px" }}>
        {/* Desktop: About drawer trigger — text only, no logo */}
        {!isMobile && (
          <button onClick={() => setDrawerOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontFamily: FONTS.body, padding: 0 }}>
            <Ic n="menu" size={16} color={drawerOpen ? B.blush : "#666"} />
            <span style={{ fontSize: 10, color: drawerOpen ? B.blush : "#666", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", transition: "color .2s" }}>{drawerOpen ? "Close" : "About"}</span>
          </button>
        )}
        {/* Mobile: empty left side so Homepage sits right */}
        {isMobile && <div />}
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontFamily: FONTS.body }}>
          <Ic n="back" size={14} color={B.ivory} />
          <span style={{ fontSize: 12, color: B.ivory, fontWeight: 500, letterSpacing: "0.03em" }}>Homepage</span>
        </button>
      </div>

      {/* ── Brand drawer — slides in from left on desktop ── */}
      {!isMobile && drawerOpen && (
        <>
          {/* Overlay */}
          <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 150 }} />
          {/* Panel */}
          <div className="drawer-panel" style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 380, background: B.ink, borderRight: `1px solid #222`, zIndex: 200, display: "flex", flexDirection: "column", padding: "48px 40px", overflowY: "auto" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: `linear-gradient(to bottom, ${B.blush}, transparent)` }} />
            <div style={{ marginBottom: 40 }}><Logo height={90} white /></div>
            <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 44, textTransform: "uppercase", lineHeight: 0.92, color: B.ivory, marginBottom: 16, letterSpacing: "-0.5px" }}>
              Your career,<br />
              <span style={{ color: B.blushLight, fontStyle: "italic", fontWeight: 300 }}>elevated.</span>
            </h2>
            <div style={{ width: 40, height: 2, background: B.blush, marginBottom: 20 }} />
            <p style={{ color: "#9a8880", fontSize: 13, lineHeight: 1.8, marginBottom: 32, fontWeight: 300 }}>Access your personalized plan, session recordings, check-ins, and everything Jess built for you.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 40 }}>
              {[{ icon: "video", t: "Live sessions & recordings" }, { icon: "file", t: "Documents & action plans" }, { icon: "bell", t: "Check-ins & accountability" }, { icon: "shield", t: "256-bit end-to-end encryption" }].map(({ icon, t }) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid #1a1a1a` }}>
                  <Ic n={icon} size={15} color={icon === "shield" ? B.blush : "#555"} />
                  <span style={{ color: icon === "shield" ? B.blushLight : "#9a8880", fontSize: 13, fontWeight: 300 }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "auto", padding: "20px", background: "#0d0d0d", borderLeft: `3px solid ${B.blush}` }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: B.blushLight, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Not enrolled yet?</div>
              <div style={{ fontSize: 12, color: "#9a8880", marginBottom: 14, fontWeight: 300, lineHeight: 1.6 }}>Book a free 20-min discovery call — no pitch, no pressure.</div>
              <button onClick={() => { setDrawerOpen(false); onBook(); }} style={{ display: "flex", alignItems: "center", gap: 7, background: B.blush, border: "none", padding: "10px 18px", color: B.white, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                <Ic n="calendar" size={12} color={B.white} />Book a Discovery Call
              </button>
            </div>
            <button onClick={() => setDrawerOpen(false)} style={{ position: "absolute", top: 20, right: 20, width: 32, height: 32, background: "none", border: `1px solid #333`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Ic n="close" size={14} color={B.ivory} />
            </button>
          </div>
        </>
      )}

      {/* ── Centered sign-in form ── */}
      <div className="auth-form" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "100px 24px 60px" : "100px 24px 60px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* Single logo — centered above the card, same on all screen sizes */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
            <Logo height={isMobile ? 48 : 64} white />
          </div>

          {/* Form card */}
          <div style={{ background: "#0d0d0d", border: `1px solid #1e1e1e`, padding: isMobile ? "32px 24px" : "48px 44px" }}>
            {/* Blush top accent */}
            <div style={{ height: 3, background: B.blush, margin: "-48px -44px 36px", ...(isMobile ? { margin: "-32px -24px 28px" } : {}) }} />

            <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 44 : 56, textTransform: "uppercase", color: B.ivory, margin: "0 0 6px", letterSpacing: "-1px", lineHeight: 0.95 }}>{isSignUp ? "Create\nAccount." : "Welcome\nBack."}</h2>
            <p style={{ color: "#9a8880", fontSize: 13, margin: "0 0 32px", fontWeight: 300, lineHeight: 1.6 }}>{isSignUp ? "Enter the email Jess gave you and create your password." : "Use the credentials Jess sent when you enrolled."}</p>

            {isSignUp && (
              <>
                <label style={{ display: "block", fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>First Name</label>
                <input value={firstName} onChange={e => { setFirstName(e.target.value); setErr(""); }} type="text" placeholder="Your first name" style={{ ...inp(!!err), marginBottom: 20 }} />
              </>
            )}

            <label style={{ display: "block", fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Email Address</label>
            <input value={email} onChange={e => { setEmail(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && (isSignUp ? signup() : login())} type="email" placeholder="your@email.com" autoComplete="email" style={{ ...inp(!!err), marginBottom: 20 }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Password</label>
              {!isSignUp && <button onClick={() => setForgot(true)} style={{ fontSize: 11, color: "#9a8880", background: "none", border: "none", cursor: "pointer", fontFamily: FONTS.body, textDecoration: "underline", textUnderlineOffset: 3 }}>Forgot password?</button>}
            </div>
            <div style={{ position: "relative", marginBottom: err ? 12 : 28 }}>
              <input value={pass} onChange={e => { setPass(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && (isSignUp ? signup() : login())} type={showPass ? "text" : "password"} placeholder="••••••••" autoComplete={isSignUp ? "new-password" : "current-password"} style={{ ...inp(!!err), paddingRight: 48 }} />
              <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <Ic n={showPass ? "eyeOff" : "eye"} size={16} color="#555" />
              </button>
            </div>

            {err && <div style={{ color: B.blushLight, fontSize: 12, marginBottom: 16, padding: "10px 14px", background: `${B.blush}15`, borderLeft: `3px solid ${B.blush}`, fontWeight: 300, lineHeight: 1.5 }}>{err}</div>}

            <Btn full variant="blush" onClick={isSignUp ? signup : login} disabled={busy || locked} style={{ padding: "15px", fontSize: 13 }}>
              {busy ? (isSignUp ? "Creating account…" : "Signing in…") : locked ? "Account locked — try later" : isSignUp ? "Create Account" : "Sign In to Portal"}
            </Btn>

            <button onClick={() => { setIsSignUp(s => !s); setErr(""); setFirstName(""); }} style={{ width: "100%", marginTop: 16, background: "none", border: "none", color: "#9a8880", fontSize: 11, cursor: "pointer", fontFamily: FONTS.body, textDecoration: "underline", textUnderlineOffset: 3 }}>
              {isSignUp ? "Already have an account? Sign in" : "First time? Create your account"}
            </button>

          </div>

          <p style={{ color: "#444", fontSize: 9, textAlign: "center", marginTop: 16, letterSpacing: "0.08em", lineHeight: 1.8 }}>
            CREDENTIALS EMAILED AFTER ENROLLMENT · SESSIONS EXPIRE AFTER 8 HOURS
          </p>

          {/* Mobile — not enrolled CTA */}
          {isMobile && (
            <div style={{ marginTop: 20, padding: "18px 20px", background: "#0d0d0d", border: `1px solid #1e1e1e`, borderLeft: `3px solid ${B.blush}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: B.blushLight, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Not enrolled yet?</div>
                <div style={{ fontSize: 11, color: "#9a8880", fontWeight: 300 }}>Book a free discovery call.</div>
              </div>
              <button onClick={onBook} style={{ display: "flex", alignItems: "center", gap: 6, background: B.blush, border: "none", padding: "9px 16px", color: B.white, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                <Ic n="calendar" size={11} color={B.white} />Book Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   BOOKING FLOW
════════════════════════════════════════════════════════════════════════ */
const SLOTS = [{ id:"a",day:"Monday",date:"Apr 21",time:"10:00 AM" }, { id:"b",day:"Monday",date:"Apr 21",time:"2:00 PM" }, { id:"c",day:"Tuesday",date:"Apr 22",time:"11:00 AM" }, { id:"d",day:"Tuesday",date:"Apr 22",time:"4:00 PM" }, { id:"e",day:"Wednesday",date:"Apr 23",time:"9:00 AM" }, { id:"f",day:"Wednesday",date:"Apr 23",time:"1:00 PM" }, { id:"g",day:"Thursday",date:"Apr 24",time:"10:00 AM" }, { id:"h",day:"Friday",date:"Apr 25",time:"11:00 AM" }, { id:"i",day:"Friday",date:"Apr 25",time:"2:00 PM" }];
const TIER_OPTS = ["Just exploring", "Hourly Session ($250)", "30-Day Intensive ($1,120)", "3-Month Elite ($3,360)", "Academy Waitlist"];
const STEPS = ["About You", "Your Goals", "Pick a Time", "Confirm"];

/* ════════════════════════════════════════════════════════════════════════
   COMMUNITY APPLICATION
════════════════════════════════════════════════════════════════════════ */
const CommunityApply = ({ onBack, onSubmit }) => {
  const { isMobile } = useLayout();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ firstName:"", email:"", password:"", q1:"", q2:"", q3:"", isBeautyPro:"", field:"" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const next = () => {
    if (step === 1) {
      if (!form.firstName.trim()) { setErr("Please enter your first name."); return; }
      if (!form.email.trim()) { setErr("Please enter your email."); return; }
      if (form.password.length < 8) { setErr("Password must be at least 8 characters."); return; }
    }
    setErr(""); setStep(s => s + 1);
  };

  const submit = async () => {
    if (!form.q1.trim() || !form.q2.trim()) { setErr("Please answer all questions."); return; }
    setBusy(true);
    const q3 = form.isBeautyPro === "yes" ? `Yes — ${form.field}` : "No";
    // Save application to Supabase
    try {
      await supabase.functions.invoke('assign-task', { body: { action: 'insert_application', application: {
        first_name: form.firstName,
        email: form.email.toLowerCase(),
        q1: form.q1,
        q2: form.q2,
        q3,
        status: "pending",
        applied_at: new Date().toISOString(),
        paid: false
      } } });
    } catch (e) {
      console.error("Insert failed:", e);
    }
    // Notify Jess via email
    try {
      await supabase.functions.invoke('notify-new-application', {
        body: {
          firstName: form.firstName,
          email: form.email.toLowerCase(),
          q1: form.q1,
          q2: form.q2,
          q3
        }
      });
    } catch (e) {
      console.error("Notification failed:", e);
    }
    setBusy(false); setDone(true);
    if (onSubmit) onSubmit(form);
  };

  const inp = { width:"100%", padding:"14px 18px", background:"transparent", border:`1px solid #333`, fontSize:15, color:B.ivory, fontFamily:FONTS.body, outline:"none", boxSizing:"border-box", borderRadius:0, WebkitAppearance:"none" };

  if (done) return (
    <div style={{ minHeight:"100dvh", background:B.black, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px", fontFamily:FONTS.body }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ width:"100%", maxWidth:480, textAlign:"center" }}>
        <div style={{ width:72, height:72, background:`${B.blush}20`, border:`2px solid ${B.blush}`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 28px" }}>
          <Ic n="check" size={32} color={B.blush} sw={2.5} />
        </div>
        <h2 style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:isMobile?48:64, textTransform:"uppercase", color:B.ivory, lineHeight:0.9, marginBottom:16, letterSpacing:"-1px" }}>You're on<br/><span style={{ color:B.blush, fontStyle:"italic", fontWeight:300 }}>the list.</span></h2>
        <p style={{ color:"#9a8880", fontSize:14, lineHeight:1.8, marginBottom:32, fontWeight:300 }}>We're reviewing your application and will be in touch within 48 hours. Check your inbox for next steps — including a link to complete your account setup.</p>
        <div style={{ background:"#0d0d0d", border:`1px solid #1e1e1e`, borderLeft:`3px solid ${B.blush}`, padding:"20px 24px", textAlign:"left", marginBottom:32 }}>
          <div style={{ fontSize:9, fontWeight:700, color:B.blushLight, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>What happens next</div>
          {["Your application is reviewed", "You'll receive an email within 48 hours", "Click the link to complete your account setup", "Your 7-day free trial begins"].map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:10 }}>
              <div style={{ width:20, height:20, background:`${B.blush}20`, border:`1px solid ${B.blush}50`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:B.blush, flexShrink:0, marginTop:1 }}>{i+1}</div>
              <span style={{ fontSize:13, color:"#bbb", fontWeight:300, lineHeight:1.5 }}>{s}</span>
            </div>
          ))}
        </div>
        <button onClick={onBack} style={{ background:"none", border:`1px solid #333`, color:"#9a8880", padding:"12px 24px", fontSize:12, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:"0.08em", textTransform:"uppercase" }}>Back to Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100dvh", background:B.black, fontFamily:FONTS.body }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0} input,textarea{font-size:16px!important;font-family:inherit} button{-webkit-tap-highlight-color:transparent}`}</style>

      {/* Top nav with back button */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding: isMobile ? "16px 20px" : "20px 40px", borderBottom:`1px solid #1e1e1e` }}>
        <Logo height={isMobile?40:50} white />
        <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:`1px solid #333`, color:"#9a8880", padding:"8px 16px", fontSize:11, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:"0.08em", textTransform:"uppercase" }}>
          ← Back to Home
        </button>
      </div>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px 60px" }}>
      <div style={{ width:"100%", maxWidth:480 }}>

        {/* Progress */}
        <div style={{ display:"flex", gap:4, marginBottom:32 }}>
          {[1,2].map(s => (
            <div key={s} style={{ flex:1, height:2, background: s <= step ? B.blush : "#1e1e1e", transition:"background .3s" }} />
          ))}
        </div>

        <div style={{ background:"#0d0d0d", border:`1px solid #1e1e1e`, padding:isMobile?"32px 24px":"48px 44px" }}>
          <div style={{ height:3, background:B.blush, margin: isMobile ? "-32px -24px 28px" : "-48px -44px 36px" }} />

          {step === 1 && (
            <>
              <h2 style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:isMobile?40:52, textTransform:"uppercase", color:B.ivory, margin:"0 0 8px", letterSpacing:"-1px", lineHeight:0.95 }}>Join the<br/><span style={{ color:B.blush, fontStyle:"italic", fontWeight:300 }}>Inner Circle.</span></h2>
              <p style={{ color:"#9a8880", fontSize:13, margin:"0 0 28px", fontWeight:300, lineHeight:1.6 }}>Free for 7 days. Spots are reviewed before access is granted.</p>

              <label style={{ display:"block", fontSize:9, color:B.blushLight, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>First Name</label>
              <input value={form.firstName} onChange={e => update("firstName", e.target.value)} placeholder="Your first name" style={{ ...inp, marginBottom:16 }} />

              <label style={{ display:"block", fontSize:9, color:B.blushLight, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Email Address</label>
              <input value={form.email} onChange={e => update("email", e.target.value)} type="email" placeholder="your@email.com" style={{ ...inp, marginBottom:16 }} />

              <label style={{ display:"block", fontSize:9, color:B.blushLight, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Create Password</label>
              <input value={form.password} onChange={e => update("password", e.target.value)} type="password" placeholder="At least 8 characters" style={{ ...inp, marginBottom: err ? 12 : 24 }} />

              {err && <div style={{ color:B.blushLight, fontSize:12, marginBottom:16, padding:"10px 14px", background:`${B.blush}15`, borderLeft:`3px solid ${B.blush}`, fontWeight:300 }}>{err}</div>}

              <Btn full variant="blush" onClick={next} style={{ padding:"15px", fontSize:13 }}>Continue →</Btn>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:isMobile?36:44, textTransform:"uppercase", color:B.ivory, margin:"0 0 8px", letterSpacing:"-1px", lineHeight:0.95 }}>Tell Jess<br/><span style={{ color:B.blush, fontStyle:"italic", fontWeight:300 }}>About You.</span></h2>
              <p style={{ color:"#9a8880", fontSize:13, margin:"0 0 28px", fontWeight:300, lineHeight:1.6 }}>Take a moment and be honest — this helps us make sure it's a great fit.</p>

              <label style={{ display:"block", fontSize:9, color:B.blushLight, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>What brings you to this community?</label>
              <textarea value={form.q1} onChange={e => update("q1", e.target.value)} rows={3} placeholder="Share what's going on for you right now..." style={{ ...inp, resize:"vertical", marginBottom:20 }} />

              <label style={{ display:"block", fontSize:9, color:B.blushLight, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>What do you hope to get out of it?</label>
              <textarea value={form.q2} onChange={e => update("q2", e.target.value)} rows={3} placeholder="Be specific — what would change for you?" style={{ ...inp, resize:"vertical", marginBottom:20 }} />

              <label style={{ display:"block", fontSize:9, color:B.blushLight, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Are you a beauty professional?</label>
              <div style={{ display:"flex", gap:8, marginBottom: form.isBeautyPro === "yes" ? 12 : 20 }}>
                {["yes","no"].map(v => (
                  <button key={v} onClick={() => update("isBeautyPro", v)} style={{ flex:1, padding:"12px", border:`1px solid ${form.isBeautyPro === v ? B.blush : "#333"}`, background: form.isBeautyPro === v ? `${B.blush}15` : "transparent", color: form.isBeautyPro === v ? B.blush : "#9a8880", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:"0.05em", textTransform:"uppercase" }}>{v === "yes" ? "Yes" : "No"}</button>
                ))}
              </div>

              {form.isBeautyPro === "yes" && (
                <>
                  <label style={{ display:"block", fontSize:9, color:B.blushLight, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>What field?</label>
                  <input value={form.field} onChange={e => update("field", e.target.value)} placeholder="e.g. Nail tech, esthetician, lash artist..." style={{ ...inp, marginBottom:20 }} />
                </>
              )}

              {err && <div style={{ color:B.blushLight, fontSize:12, marginBottom:16, padding:"10px 14px", background:`${B.blush}15`, borderLeft:`3px solid ${B.blush}`, fontWeight:300 }}>{err}</div>}

              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => { setStep(1); setErr(""); }} style={{ flex:1, padding:"15px", border:`1px solid #333`, background:"transparent", color:"#9a8880", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:"0.08em", textTransform:"uppercase" }}>← Back</button>
                <Btn variant="blush" onClick={submit} disabled={busy} style={{ flex:2, padding:"15px", fontSize:13 }}>{busy ? "Submitting…" : "Submit Application"}</Btn>
              </div>
            </>
          )}
        </div>

        <p style={{ color:"#444", fontSize:9, textAlign:"center", marginTop:16, letterSpacing:"0.08em", lineHeight:1.8 }}>
          ALL APPLICATIONS REVIEWED · RESPONSE WITHIN 48 HOURS
        </p>
      </div>
      </div>
    </div>
  );
};

const Booking = ({ onConfirm, onBack }) => {
  const { isMobile } = useLayout();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ firstName:"", lastName:"", email:"", phone:"", ig:"", licensed:"", experience:"", challenge:"", goal:"", tier:"", how:"", slot:null, agree:false });
  const [e, setE] = useState({});
  const top = useRef(null);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const validate = () => {
    const err = {};
    if (step === 0) { if (!f.firstName.trim()) err.firstName = "Required"; if (!f.email.includes("@")) err.email = "Valid email required"; if (!f.licensed) err.licensed = "Please select one"; }
    if (step === 1) { if (!f.challenge.trim()) err.challenge = "Required"; if (!f.goal.trim()) err.goal = "Required"; if (!f.tier) err.tier = "Please select"; }
    if (step === 2) { if (!f.slot) err.slot = "Please select a time"; }
    if (step === 3) { if (!f.agree) err.agree = "Please confirm to continue"; }
    setE(err); return Object.keys(err).length === 0;
  };
  const next = () => { if (validate()) { setStep(s => s + 1); top.current?.scrollIntoView({ behavior: "smooth" }); } };
  const prev = () => { setStep(s => s - 1); top.current?.scrollIntoView({ behavior: "smooth" }); };

  const inpStyle = (hasErr) => ({ width: "100%", padding: "13px 16px", background: B.off, border: `1px solid ${hasErr ? B.blush : B.cloud}`, borderRadius: 2, fontSize: 15, color: B.black, fontFamily: FONTS.body, outline: "none", boxSizing: "border-box", WebkitAppearance: "none" });
  const Lbl = ({ t, req, err }) => <label style={{ display: "block", fontSize: 9, fontWeight: 700, color: err ? B.blush : B.steel, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontFamily: FONTS.body }}>{t}{req && <span style={{ color: B.blush, marginLeft: 3 }}>*</span>}</label>;

  return (
    <div style={{ minHeight: "100dvh", background: B.white, fontFamily: FONTS.body }} ref={top}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=DM+Sans:wght@300;400;500;600&display=swap'); *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; } button { -webkit-tap-highlight-color:transparent; } input,textarea { font-size:16px!important; font-family:inherit; }`}</style>

      {/* Header */}
      <div style={{ background: B.white, borderBottom: `1px solid ${B.cloud}`, padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={step === 0 ? onBack : prev} style={{ width: 34, height: 34, border: `1px solid ${B.cloud}`, background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><Ic n="back" size={15} color={B.steel} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: B.black, letterSpacing: "0.08em", textTransform: "uppercase" }}>Discovery Call Request</span>
            <span style={{ fontSize: 9, color: B.blush, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{STEPS[step]}</span>
          </div>
          <div style={{ height: 2, background: B.cloud }}>
            <div style={{ height: "100%", width: `${((step + 1) / STEPS.length) * 100}%`, background: B.blush, transition: "width .4s" }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "36px 24px 80px" }}>
        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 12 : 20, marginBottom: 36 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: 24, height: 24, background: i <= step ? B.blush : B.cloud, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .3s" }}>
                {i < step ? <Ic n="check" size={11} color={B.white} sw={2.5} /> : <span style={{ fontSize: 9, fontWeight: 700, color: i === step ? B.white : B.mid }}>{i + 1}</span>}
              </div>
              {!isMobile && <span style={{ fontSize: 8, color: i === step ? B.blush : B.mid, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{s}</span>}
            </div>
          ))}
        </div>

        {step === 0 && <>
          <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 36, textTransform: "uppercase", color: B.black, margin: "0 0 24px", letterSpacing: "-0.5px" }}>Let's get acquainted.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["First Name", "firstName", "First name", true], ["Last Name", "lastName", "Last name", false]].map(([l, k, p, req]) => (
              <div key={k}><Lbl t={l} req={req} err={!!e[k]} /><input value={f[k]} onChange={ev => set(k, ev.target.value)} placeholder={p} style={inpStyle(!!e[k])} />{e[k] && <p style={{ fontSize: 10, color: B.blush, marginTop: 4 }}>{e[k]}</p>}</div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}><Lbl t="Email" req err={!!e.email} /><input value={f.email} onChange={ev => set("email", ev.target.value)} type="email" placeholder="your@email.com" style={inpStyle(!!e.email)} />{e.email ? <p style={{ fontSize: 10, color: B.blush, marginTop: 4 }}>{e.email}</p> : <p style={{ fontSize: 10, color: B.mid, marginTop: 5, fontWeight: 300 }}>Portal credentials will be sent here after enrollment.</p>}</div>
          <div style={{ marginTop: 16 }}><Lbl t="Phone" /><input value={f.phone} onChange={ev => set("phone", ev.target.value)} type="tel" placeholder="(555) 000-0000" style={inpStyle(false)} /><p style={{ fontSize: 10, color: B.mid, marginTop: 5, fontWeight: 300 }}>Optional — for session reminders</p></div>
          <div style={{ marginTop: 16 }}><Lbl t="Instagram" /><input value={f.ig} onChange={ev => set("ig", ev.target.value)} placeholder="@yourhandle" style={inpStyle(false)} /><p style={{ fontSize: 10, color: B.mid, marginTop: 5, fontWeight: 300 }}>So Jess can see your work before the call</p></div>
          <div style={{ marginTop: 20 }}>
            <Lbl t="Licensed?" req err={!!e.licensed} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {["Yes, I'm licensed", "No, not yet"].map(opt => (
                <button key={opt} onClick={() => set("licensed", opt)} style={{ padding: "13px", border: `1px solid ${f.licensed === opt ? B.blush : B.cloud}`, background: f.licensed === opt ? B.blushPale : B.white, color: f.licensed === opt ? B.blush : B.steel, fontSize: 12, fontWeight: f.licensed === opt ? 700 : 400, cursor: "pointer", fontFamily: FONTS.body }}>{opt}</button>
              ))}
            </div>
            {e.licensed && <p style={{ fontSize: 10, color: B.blush, marginTop: 5 }}>{e.licensed}</p>}
          </div>
        </>}

        {step === 1 && <>
          <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 36, textTransform: "uppercase", color: B.black, margin: "0 0 24px", letterSpacing: "-0.5px" }}>Tell Jess your story.</h2>
          {[["Biggest challenge right now", "challenge", "What's blocking you most?", true], ["Your #1 goal in 90 days", "goal", "Be specific — what would feel like a real win?", true]].map(([l, k, p, req]) => (
            <div key={k} style={{ marginBottom: 20 }}>
              <Lbl t={l} req={req} err={!!e[k]} />
              <textarea value={f[k]} onChange={ev => set(k, ev.target.value)} placeholder={p} rows={3} style={{ width: "100%", padding: "12px 16px", background: B.off, border: `1px solid ${e[k] ? B.blush : B.cloud}`, borderRadius: 2, fontSize: 15, color: B.black, fontFamily: FONTS.body, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              {e[k] && <p style={{ fontSize: 10, color: B.blush, marginTop: 4 }}>{e[k]}</p>}
            </div>
          ))}
          <div style={{ marginBottom: 20 }}>
            <Lbl t="Most interested in" req err={!!e.tier} />
            {TIER_OPTS.map(opt => (
              <button key={opt} onClick={() => set("tier", opt)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", border: `1px solid ${f.tier === opt ? B.blush : B.cloud}`, background: f.tier === opt ? B.blushPale : B.white, color: f.tier === opt ? B.blush : B.steel, fontSize: 12, fontWeight: f.tier === opt ? 700 : 400, cursor: "pointer", fontFamily: FONTS.body, marginBottom: 2, textAlign: "left" }}>
                {opt}{f.tier === opt && <Ic n="check" size={14} color={B.blush} />}
              </button>
            ))}
            {e.tier && <p style={{ fontSize: 10, color: B.blush, marginTop: 4 }}>{e.tier}</p>}
          </div>
        </>}

        {step === 2 && <>
          <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 36, textTransform: "uppercase", color: B.black, margin: "0 0 8px", letterSpacing: "-0.5px" }}>Pick a time.</h2>
          <p style={{ color: B.mid, fontSize: 13, margin: "0 0 24px", fontWeight: 300 }}>All times Eastern. 20 minutes, free, no commitment.</p>
          {e.slot && <p style={{ fontSize: 10, color: B.blush, marginBottom: 12 }}>{e.slot}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SLOTS.map(s => {
              const sel = f.slot?.id === s.id;
              return (
                <button key={s.id} onClick={() => set("slot", s)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 18px", border: `1px solid ${sel ? B.blush : B.cloud}`, background: sel ? B.blushPale : B.white, cursor: "pointer", fontFamily: FONTS.body, transition: "all .15s" }}>
                  <div style={{ textAlign: "left" }}><div style={{ fontSize: 13, fontWeight: 600, color: sel ? B.blush : B.black }}>{s.day}, {s.date}</div><div style={{ fontSize: 11, color: B.mid, fontWeight: 300 }}>{s.time} EST</div></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: B.success, letterSpacing: 1.5, textTransform: "uppercase" }}>Available</span>
                    {sel && <div style={{ width: 18, height: 18, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="check" size={9} color={B.white} sw={2.5} /></div>}
                  </div>
                </button>
              );
            })}
          </div>
        </>}

        {step === 3 && <>
          <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 36, textTransform: "uppercase", color: B.black, margin: "0 0 24px", letterSpacing: "-0.5px" }}>Review & confirm.</h2>
          <Card style={{ overflow: "hidden", marginBottom: 12 }}>
            {[[`${f.firstName} ${f.lastName}`, "Name"], [f.email, "Email"], [f.ig || "—", "Instagram"], [f.licensed, "Licensed"], [f.tier, "Interested in"], [f.slot ? `${f.slot.day} ${f.slot.date} · ${f.slot.time}` : "—", "Requested time"]].map(([v, l]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "11px 16px", borderBottom: `1px solid ${B.cloud}` }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: B.mid, letterSpacing: 1.5, textTransform: "uppercase" }}>{l}</span>
                <span style={{ fontSize: 12, fontWeight: 400, color: B.black, maxWidth: "60%", textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </Card>
          <Card style={{ overflow: "hidden", marginBottom: 16 }}>
            {[["Your Challenge", f.challenge], ["Your Goal", f.goal]].map(([l, v]) => (
              <div key={l} style={{ padding: "14px 16px", borderBottom: `1px solid ${B.cloud}` }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: B.mid, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{l}</div>
                <div style={{ fontSize: 12, color: B.charcoal, lineHeight: 1.6, fontWeight: 300 }}>{v}</div>
              </div>
            ))}
          </Card>
          <button onClick={() => set("agree", !f.agree)} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", border: `1px solid ${e.agree ? B.blush : f.agree ? B.blush : B.cloud}`, background: f.agree ? B.blushPale : B.white, cursor: "pointer", fontFamily: FONTS.body, width: "100%", textAlign: "left", marginBottom: e.agree ? 6 : 20 }}>
            <div style={{ width: 18, height: 18, background: f.agree ? B.blush : B.cloud, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{f.agree && <Ic n="check" size={10} color={B.white} sw={2.5} />}</div>
            <span style={{ fontSize: 12, color: B.charcoal, lineHeight: 1.5, fontWeight: 300 }}>I understand this is a free discovery call. Jess will review and confirm within 24 hours. I'll receive a Google Meet link by email. My data is encrypted and never sold.</span>
          </button>
          {e.agree && <p style={{ fontSize: 10, color: B.blush, marginBottom: 14 }}>{e.agree}</p>}
        </>}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          {step > 0 && <Btn variant="ghost" onClick={prev}>Back</Btn>}
          {step < 3 ? <Btn onClick={next} full icon="arrow">Continue</Btn> : <Btn variant="blush" onClick={() => { if (validate()) onConfirm(f); }} full icon="check">Submit Request</Btn>}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   CONFIRMATION
════════════════════════════════════════════════════════════════════════ */
const Confirmation = ({ form, onHome, onSignIn }) => {
  const { isMobile } = useLayout();
  return (
    <div style={{ minHeight: "100dvh", background: B.white, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", fontFamily: FONTS.body }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=DM+Sans:wght@300;400;500;600&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0} @keyframes pop{0%{transform:scale(.5);opacity:0}80%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}`}</style>
      <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, background: B.successPale, border: `2px solid ${B.success}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: "pop .4s ease" }}><Ic n="check" size={26} color={B.success} sw={2.5} /></div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}><Logo height={isMobile ? 48 : 64} /></div>
        <h1 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 40 : 52, textTransform: "uppercase", color: B.black, margin: "0 0 12px", lineHeight: 0.95, letterSpacing: "-0.5px" }}>You're one step closer.</h1>
        <p style={{ color: B.steel, fontSize: 14, margin: "0 0 28px", lineHeight: 1.7, fontWeight: 300 }}>Your request is with Jess. She reviews every submission personally and will confirm within 24 hours.</p>

        <Card style={{ textAlign: "left", marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${B.cloud}`, display: "flex", alignItems: "center", gap: 8 }}>
            <Ic n="check" size={14} color={B.blush} />
            <Section>What Happens Next</Section>
          </div>
          {[["Jess reviews your request", "She reads your goals before the call so she comes prepared."], ["Confirmation email sent", `Arriving at ${form.email} within 24 hours.`], [`Call: ${form.slot?.day} ${form.slot?.date} · ${form.slot?.time}`, "20 min Google Meet — link in your confirmation."], ["Portal access begins", "If you enroll, Jess creates your account and sends credentials."]].map(([t, d], i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: "12px 20px", borderBottom: `1px solid ${B.cloud}` }}>
              <div style={{ width: 20, height: 20, background: B.black, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, fontWeight: 700, color: B.white }}>{i + 1}</div>
              <div><div style={{ fontSize: 12, fontWeight: 700, color: B.black, marginBottom: 2, letterSpacing: "0.03em" }}>{t}</div><div style={{ fontSize: 11, color: B.mid, fontWeight: 300 }}>{d}</div></div>
            </div>
          ))}
        </Card>

        <div style={{ background: B.black, padding: "20px 22px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14, textAlign: "left", borderLeft: `3px solid ${B.blush}` }}>
          <div style={{ flexShrink: 0 }}><LogoMark size={34} white={true} bg="#0D0D0D" /></div>
          <div><p style={{ fontSize: 12, color: "#9a8880", fontStyle: "italic", margin: "0 0 5px", lineHeight: 1.5, fontWeight: 300 }}>"I personally review every request and I'm already looking forward to hearing your story."</p><span style={{ fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>— Jess</span></div>
        </div>

        <div style={{ display: "flex", gap: 2, flexDirection: isMobile ? "column" : "row" }}>
          <Btn full variant="ghost" onClick={onHome}>Back to Homepage</Btn>
          <Btn full variant="blush" onClick={onSignIn} icon="lock" style={{ whiteSpace:"nowrap" }}>Have an Account? Sign In</Btn>
        </div>
      </div>
    </div>
  );
};

const MenteePg = ({ title, sub, children }) => {
  const { isMobile } = useLayout();
  return (
    <div style={{ padding: isMobile ? "20px 18px 96px" : "28px 32px", maxWidth: 900, width: "100%" }}>
      {title && <div style={{ marginBottom: 22 }}>
        {sub && <Section style={{ marginBottom: 8 }}>{sub}</Section>}
        <h1 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 32 : 44, textTransform: "uppercase", color: B.black, margin: 0, lineHeight: 0.95, letterSpacing: "-0.5px" }}>{title}</h1>
      </div>}
      {children}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   VIDEO CALL MODAL — shared across all portals
════════════════════════════════════════════════════════════════════════ */
const VideoCallModal = ({ onClose, sessionName = "Session", participantName = "Jess", isHost = false, presetRoomUrl = null }) => {
  const [roomUrl, setRoomUrl] = useState(presetRoomUrl);
  const [loading, setLoading] = useState(!presetRoomUrl);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (presetRoomUrl) { setRoomUrl(presetRoomUrl); setLoading(false); return; }
    const createRoom = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('create-video-room', {
          body: { sessionName, participantName }
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setRoomUrl(data.url);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    createRoom();
  }, []);

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div style={{ position:"fixed", inset:0, background:"#0d0d0d", zIndex:9999, display:"flex", flexDirection:"column" }}>

      {/* Top bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", background:"#111", flexShrink:0, borderBottom:"1px solid #1e1e1e" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background: loading ? "#f59e0b" : roomUrl ? "#22c55e" : "#ef4444" }} />
          <span style={{ color:B.white, fontSize:13, fontWeight:700, fontFamily:FONTS.body, letterSpacing:"0.05em" }}>{sessionName}</span>
          <span style={{ color:"#9a8880", fontSize:11, fontFamily:FONTS.body, fontWeight:300 }}>{fmt(elapsed)}</span>
        </div>
        <button onClick={onClose} style={{ display:"flex", alignItems:"center", gap:6, background:"#ef4444", border:"none", padding:"8px 16px", cursor:"pointer", borderRadius:4 }}>
          <Ic n="close" size={14} color={B.white} />
          <span style={{ fontSize:10, color:B.white, fontFamily:FONTS.body, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>End Call</span>
        </button>
      </div>

      {/* Main area */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", minHeight:0 }}>
        {loading && (
          <div style={{ textAlign:"center" }}>
            <div style={{ width:48, height:48, border:"3px solid #333", borderTop:`3px solid ${B.blush}`, borderRadius:"50%", margin:"0 auto 20px", animation:"spin 1s linear infinite" }} />
            <p style={{ color:"#9a8880", fontSize:13, fontFamily:FONTS.body, fontWeight:300 }}>Setting up your session room…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
        {error && (
          <div style={{ textAlign:"center", padding:32 }}>
            <p style={{ color:"#ef4444", fontSize:13, fontFamily:FONTS.body, marginBottom:16 }}>Could not create video room: {error}</p>
            <button onClick={onClose} style={{ padding:"10px 24px", background:B.blush, border:"none", color:B.white, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body }}>Close</button>
          </div>
        )}
        {roomUrl && (
          <iframe
            src={roomUrl}
            allow="camera; microphone; fullscreen; speaker; display-capture"
            style={{ width:"100%", height:"100%", border:"none" }}
            title="Video Session"
          />
        )}
      </div>
    </div>
  );
};


const MenteePortal = ({ user, onLogout }) => {
  const { isMobile, useSidebar } = useLayout();
  const [view, setView] = useState("dashboard");
  const [callActive, setCallActive] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [msgInput, setMsgInput] = useState("");
  const [msgImage, setMsgImage] = useState(null);
  const msgImageRef = useRef(null);
  const [docFilter, setDocFilter] = useState("All");
  const msgEnd = useRef(null);

  // Merge real Supabase profile data for non-demo users — polls every 30s
  const [profile, setProfile] = useState(user);
  useEffect(() => {
    const isDemoUser = !!user.password;
    if (!isDemoUser && user.email) {
      const fetchProfile = () => {
        supabase.functions.invoke('assign-task', { body: { action: 'get_profile', email: user.email } })
          .then(({ data }) => {
            const profile_data = data?.profile;
            if (profile_data) {
              setProfile(p => ({
                ...p,
                tier: profile_data.tier || p.tier,
                tierKey: profile_data.tier_key || p.tierKey,
                startDate: profile_data.start_date || p.startDate,
                totalDays: profile_data.total_days || (profile_data.tier?.includes("Elite") ? 90 : profile_data.tier?.includes("Intensive") ? 30 : p.totalDays || 30),
                daysRemaining: calcDaysRemaining(profile_data.start_date || p.startDate, profile_data.total_days || (profile_data.tier?.includes("Elite") ? 90 : profile_data.tier?.includes("Intensive") ? 30 : p.totalDays || 30)),
                sessionsCompleted: profile_data.sessions_completed ?? p.sessionsCompleted,
                sessionsTotal: profile_data.sessions_total || p.sessionsTotal,
                goal: profile_data.goal || p.goal,
                nextSession: profile_data.next_session_date ? {
                  date: profile_data.next_session_date,
                  time: profile_data.next_session_time || "",
                  type: profile_data.next_session_type || "Session"
                } : null,
                roomUrl: profile_data.room_url || null,
                graduated: profile_data.graduated || false,
              }));
            }
          });
      };
      fetchProfile();
      const interval = setInterval(fetchProfile, 10000);
      return () => clearInterval(interval);
    }
  }, [user.email]);

  // ── Feature state ──────────────────────────────────────────────────
  const [wins, setWins] = useState([]);
  const [winInput, setWinInput] = useState("");
  const [winCat, setWinCat] = useState("pricing");
  const [celebratingWin, setCelebratingWin] = useState(null);

  useEffect(() => {
    if (!user.email) return;
    supabase.functions.invoke('assign-task', { body: { action: 'get_wins', mentee_email: user.email } })
      .then(({ data }) => {
        const wins_data = data?.wins || [];
        if (wins_data.length > 0) {
          setWins(wins_data.map(w => ({
            id: w.id,
            date: new Date(w.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric" }),
            cat: w.cat,
            text: w.text,
            celebrated: w.celebrated
          })));
        } else if (!user.password) {
          // No wins yet for real user — start empty
          setWins([]);
        } else {
          // Demo user — show sample wins
          setWins([
            { id:1, date:"Apr 14", cat:"pricing", text:"Raised gel full set from $65 to $85. Two clients didn't even blink.", celebrated:true },
            { id:2, date:"Apr 10", cat:"clients", text:"Booked my first client from Instagram after Jess's strategy session.", celebrated:true },
          ]);
        }
      });
  }, [user.email]);

  const [milestones, setMilestones] = useState(profile.milestones || []);
  const [celebratingMilestone, setCelebratingMilestone] = useState(null);

  const [communityPosts, setCommunityPosts] = useState([]);
  const [commPostInput, setCommPostInput] = useState("");
  const [commPostCat, setCommPostCat] = useState("win");
  const [commPostImage, setCommPostImage] = useState(null);
  const commPostImageRef = useRef(null);
  const [commLiked, setCommLiked] = useState([]);
  const [jessVoice, setJessVoice] = useState(null); // { text, audioUrl }
  const [menteeStatDrawer, setMenteeStatDrawer] = useState(null);
  const [menteeResources, setMenteeResources] = useState([]);

  useEffect(() => {
    if (!user.email) return;
    const fetchResources = async () => {
      const { data } = await supabase.functions.invoke('assign-task', { body: { action: 'get_resources', mentee_email: user.email } });
      const menteeSpecific = data?.resources || [];
      try {
        const { data: globalData } = await supabase.functions.invoke('assign-task', { body: { action: 'get_all_resources' } });
        const globalResources = (Array.isArray(globalData) ? globalData : globalData?.resources || [])
          .filter(r => !r.mentee_email)
          .map(r => ({ ...r, category: r.category || "General" }));
        const ids = new Set(menteeSpecific.map(r => r.id));
        setMenteeResources([...menteeSpecific, ...globalResources.filter(r => !ids.has(r.id))]);
      } catch {
        setMenteeResources(menteeSpecific);
      }
    };
    fetchResources();
    const interval = setInterval(fetchResources, 30000);
    return () => clearInterval(interval);
  }, [user.email]);
  const commCatColors = { win: B.blush, tip: B.success, question: "#9B6EA0", resource: B.amber, intro: B.steel };
  const commCatLabels = { win: "Win", tip: "Tip", question: "Question", resource: "Resource", intro: "Intro" };
  const commCatIcons  = { win: "catWin", tip: "catTip", question: "catQuestion", resource: "catResource", intro: "catIntro" };

  useEffect(() => {
    const fetchPosts = () => {
      supabase.functions.invoke("community-post", { body: { action: "fetch" } })
        .then(({ data }) => {
          const posts = data?.posts || [];
          if (posts.length > 0) {
            setCommunityPosts(posts.map(p => ({
              id: p.id, author: p.author, avatar: p.avatar,
              time: new Date(p.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric" }),
              text: p.text, likes: p.likes || 0, comments: [], isJess: p.is_jess, cat: p.cat,
              audioUrl: p.audio_url?.startsWith("__POSTIMAGE__") ? null : (p.audio_url || null),
              imageUrl: p.audio_url?.startsWith("__POSTIMAGE__") ? p.audio_url.replace("__POSTIMAGE__", "") : null,
              pinned: p.pinned, isGraduate: p.is_graduate || false
            })));
          } else {
            setCommunityPosts([]);
          }
        });
    };
    fetchPosts();
    const interval = setInterval(fetchPosts, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Jess's Voice separately — polls every 30s
  useEffect(() => {
    const fetchVoice = () => {
      supabase.functions.invoke('jess-voice', { body: { action:'get' } })
        .then(({ data }) => {
          if (data?.voice) setJessVoice({ text: data.voice.title, audioUrl: data.voice.audio_url });
        });
    };
    fetchVoice();
    const interval = setInterval(fetchVoice, 10000);
    return () => clearInterval(interval);
  }, []);

  const submitCommPost = async () => {
    if (!commPostInput.trim() && !commPostImage) return;
    const isGrad = profile.graduated || false;
    let imageUrl = null;
    if (commPostImage) {
      const ext = commPostImage.name.split('.').pop();
      const fileName = `post-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("images").upload(fileName, commPostImage, { contentType: commPostImage.type });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
      setCommPostImage(null);
      if (commPostImageRef.current) commPostImageRef.current.value = "";
    }
    const newPost = { author: user.firstName, avatar: user.avatar, text: commPostInput, likes: 0, comments: [], isJess: false, cat: commPostCat, time: "Just now", id: Date.now(), isGraduate: isGrad, imageUrl };
    setCommunityPosts(p => [newPost, ...p]);
    setCommPostInput("");
    await supabase.functions.invoke("community-post", { body: { action: "insert", author: user.firstName, avatar: user.avatar, text: commPostInput || "📷", cat: commPostCat, is_jess: false, is_graduate: isGrad, audio_url: imageUrl ? `__POSTIMAGE__${imageUrl}` : null } });
  };

  const [sessionPrep, setSessionPrep] = useState({ win:"", challenge:"", need:"", submitted:false });
  const [referralCopied, setReferralCopied] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [editingTaskNote, setEditingTaskNote] = useState(null); // task id
  const [taskNoteInput, setTaskNoteInput] = useState("");

  // Fetch tasks from Supabase via edge function
  // Local overrides survive fetches — key: task_id, value: completed bool
  const taskOverrides = useRef({});

  useEffect(() => {
    if (!user.email || !!user.password) return;
    const fetchTasks = () => {
      supabase.functions.invoke('assign-task', {
        body: { action: 'fetch', mentee_email: user.email }
      }).then(({ data }) => {
        if (data?.tasks) {
          // Apply any local overrides so fetch never reverts a pending save
          setTasks(data.tasks.map(t =>
            taskOverrides.current.hasOwnProperty(t.id)
              ? { ...t, completed: taskOverrides.current[t.id] }
              : t
          ));
        }
      });
    };
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [user.email]);

  const completeTask = async (task) => {
    const newCompleted = !task.completed;
    // Store override immediately
    taskOverrides.current[task.id] = newCompleted;
    setTasks(p => p.map(t => t.id === task.id ? { ...t, completed: newCompleted } : t));
    await supabase.functions.invoke('assign-task', {
      body: { action: 'update', id: task.id, completed: newCompleted }
    });
    // Clear override after 15s — DB has confirmed save by then
    setTimeout(() => { delete taskOverrides.current[task.id]; }, 15000);
  };

  const saveTaskNote = async (taskId) => {
    setTasks(p => p.map(t => t.id === taskId ? { ...t, mentee_notes: taskNoteInput } : t));
    await supabase.functions.invoke('assign-task', {
      body: { action: 'update', id: taskId, mentee_notes: taskNoteInput }
    });
    setEditingTaskNote(null);
    setTaskNoteInput("");
  };

  // Welcome experience — show until dismissed, persisted in localStorage
  const welcomeKey = `sjtn_welcomed_${user.email}`;
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !localStorage.getItem(welcomeKey); } catch { return true; }
  });
  const dismissWelcome = () => {
    try { localStorage.setItem(welcomeKey, "1"); } catch {}
    setShowWelcome(false);
  };

  // Graduation modal — shows when Jess marks program complete
  const gradKey = `sjtn_graduated_${user.email}`;
  const [showGraduation, setShowGraduation] = useState(false);
  // Check messages for graduation trigger — polls every 10s
  useEffect(() => {
    if (!user.email || !!user.password) return;
    const checkGrad = () => {
      supabase.functions.invoke('send-message', { body: { action: 'check_graduation', mentee_email: user.email } })
        .then(({ data }) => {
          if (data?.graduated) {
            try { if (!localStorage.getItem(gradKey)) setShowGraduation(true); } catch { setShowGraduation(true); }
          }
        });
    };
    checkGrad();
    const interval = setInterval(checkGrad, 10000);
    return () => clearInterval(interval);
  }, [user.email]);
  const dismissGraduation = () => {
    try { localStorage.setItem(gradKey, "1"); } catch {}
    setShowGraduation(false);
  };

  const TIER_WELCOME = {
    "3-Month Elite": {
      headline: "Your 90-Day Transformation Starts Now",
      sessions: "6 live sessions with Jess",
      checkins: "2 check-ins per week — 24 total",
      plan: "A personalized 90-day growth plan",
      community: "Full community access for 3 months",
      firstSession: "Your first session will be scheduled within 48 hours. Watch for an email from Jess.",
    },
    "30-Day Intensive": {
      headline: "Your 30 Days of Real Momentum Begin",
      sessions: "2 live sessions with Jess",
      checkins: "2 check-ins per week — 8 total",
      plan: "A personalized 30-day plan built around you",
      community: null,
      firstSession: "Your first session will be scheduled within 48 hours. Watch for an email from Jess.",
    },
    "Hourly Session": {
      headline: "Your Session is Almost Here",
      sessions: "1 focused 60-minute session with Jess",
      checkins: null,
      plan: "A written action plan after your session",
      community: null,
      firstSession: "Your session will be scheduled within 48 hours. Watch for an email from Jess.",
    },
  };

  // ── Computed ────────────────────────────────────────────────────────
  const unread = view === "messages" ? 0 : msgs.filter(m => m.unread && m.from !== "You").length;
  const done = milestones.filter(m => m.done).length;
  const pct = profile.sessionsTotal ? Math.round((profile.sessionsCompleted / profile.sessionsTotal) * 100) : 0;
  const dayPct = profile.totalDays ? Math.round(((profile.totalDays - profile.daysRemaining) / profile.totalDays) * 100) : 0;

  // Fetch messages and subscribe to real-time updates
  useEffect(() => {
    if (!user.email) return;
    const email = user.email;

    const fetchMsgs = () => {
      supabase.functions.invoke("send-message", { body: { action: "get", mentee_email: email } })
        .then(({ data }) => {
          const msgs_data = data?.messages || [];
          if (msgs_data.length > 0) {
            setMsgs(msgs_data.filter(m => !m.text?.startsWith("__GRADUATION__")).map(m => {
              const isImage = m.audio_url?.startsWith("__IMAGE__");
              return {
                from: m.sender === "mentee" ? "You" : "Jess",
                time: new Date(m.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }),
                text: m.text,
                audioUrl: isImage ? null : (m.audio_url || null),
                imageUrl: isImage ? m.audio_url.replace("__IMAGE__", "") : null,
                unread: !m.read && m.sender === "jess"
              };
            }));
          } else if (user.messages) {
            setMsgs(user.messages);
          }
        });
    };

    fetchMsgs();
    // Poll every 5 seconds for new messages
    const interval = setInterval(fetchMsgs, 5000);
    return () => clearInterval(interval);
  }, [user.email]);

  // Mark messages as read when mentee views Messages tab OR when new messages arrive while on tab
  useEffect(() => {
    if (view === "messages" && user.email) {
      const email = user.email;
      supabase.functions.invoke("send-message", { body: { action: "mark_read", mentee_email: email, role: "mentee" } })
        .then(() => {
          setMsgs(p => p.map(m => ({ ...m, unread: false })));
        });
    }
  }, [view, user.email, msgs.length]);

  const sendMsg = async () => {
    if (!msgInput.trim() && !msgImage) return;
    const text = msgInput || "📷 Image";
    const email = user.email || profile.email;
    let imageUrl = null;

    // Upload image if present
    if (msgImage) {
      const ext = msgImage.name.split('.').pop();
      const fileName = `msg-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("images").upload(fileName, msgImage, { contentType: msgImage.type });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
      setMsgImage(null);
      if (msgImageRef.current) msgImageRef.current.value = "";
    }

    setMsgs(p => [...p, { from: "You", time: "Just now", text: msgInput || "", imageUrl }]);
    setMsgInput("");
    if (!email) return;
    await supabase.functions.invoke("send-message", { body: { mentee_email: email, sender: "mentee", text: msgInput || (imageUrl ? "📷 Image" : ""), audio_url: imageUrl ? `__IMAGE__${imageUrl}` : null } });
  };
  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const addWin = async () => {
    if (!winInput.trim()) return;
    const w = { id: Date.now(), date: "Today", cat: winCat, text: winInput, celebrated: false };
    setWins(p => [w, ...p]);
    setWinInput("");
    setCelebratingWin(w);
    setTimeout(() => setCelebratingWin(null), 3500);
    await supabase.functions.invoke('assign-task', { body: { action: 'insert_win', mentee_email: user.email || profile.email, text: winInput } });
  };

  const completeMilestone = (idx) => {
    const updated = milestones.map((m, i) => i === idx ? { ...m, done: true } : m);
    setMilestones(updated);
    setCelebratingMilestone(milestones[idx]);
    setTimeout(() => setCelebratingMilestone(null), 3500);
  };

  const catColors = { pricing: B.blush, clients: B.success, mindset: "#9B6EA0", income: B.amber };
  const catLabels = { pricing: "Pricing", clients: "Clients", mindset: "Mindset", income: "Income" };
  const catIcons  = { pricing: "catWin", clients: "catIntro", mindset: "catTip", income: "catResource" };

  const NAV = [
    { id:"dashboard", icon:"home",   label:"Dashboard" },
    { id:"wins",      icon:"trophy",  label:"My Wins" },
    { id:"community", icon:"users",   label:"Community" },
    { id:"sessions",  icon:"video",   label:"Live Sessions" },
    { id:"schedule",  icon:"calendar",label:"Schedule" },
    { id:"messages",  icon:"message", label:"Messages" },
    { id:"resources", icon:"book",    label:"Resources" },
    { id:"progress",  icon:"award",   label:"Progress" },
    { id:"referral",  icon:"gift",    label:"Refer a Friend" },
    { id:"payments",  icon:"card",    label:"Payments" },
  ];
  const TABS = [
    { id:"dashboard", icon:"home",    label:"Home" },
    { id:"sessions",  icon:"video",   label:"Sessions" },
    { id:"community", icon:"users",   label:"Community" },
    { id:"messages",  icon:"message", label:"Messages" },
    { id:"more",      icon:"menu",    label:"More" },
  ];

  const Pg = MenteePg;

  const StatTile = ({ value, label, accent }) => (
    <div style={{ padding: "18px 20px", border: `1px solid ${B.cloud}`, background: B.white, borderTop: accent ? `3px solid ${B.blush}` : `3px solid ${B.cloud}` }}>
      <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 28 : 36, color: accent ? B.blush : B.black, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 700, color: B.mid, marginTop: 6, letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</div>
    </div>
  );

  const GraduationModal = showGraduation && profile.firstName ? (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1001, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: isMobile ? "0" : "40px 16px" }}>
      <div style={{ background: B.white, width: "100%", maxWidth: 600, minHeight: isMobile ? "100dvh" : "auto", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ background: B.blush, padding: "32px 32px 24px", textAlign: "center" }}>
          <Logo height={56} />
        </div>

        {/* Black bar */}
        <div style={{ background: B.black, padding: "24px 32px", borderLeft: `4px solid ${B.blush}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: B.blushLight, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Program Complete 🎓</div>
          <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 32 : 40, textTransform: "uppercase", color: B.ivory, margin: 0, letterSpacing: "-0.5px", lineHeight: 1.05 }}>
            You did it,<br/>
            <span style={{ color: B.blushLight, fontStyle: "italic", fontWeight: 300 }}>{profile.firstName}.</span>
          </h2>
        </div>

        {/* Letter body */}
        <div style={{ padding: isMobile ? "20px 18px" : "28px 32px", flex: 1 }}>
          <p style={{ fontSize: 14, color: B.charcoal, lineHeight: 1.85, marginBottom: 16, fontWeight: 300 }}>
            I am so incredibly proud of everything you've accomplished. You showed up, you did the work, and you proved what I already knew — that you are capable of building something real.
          </p>
          <p style={{ fontSize: 14, color: B.charcoal, lineHeight: 1.85, marginBottom: 16, fontWeight: 300 }}>
            Your mentorship program is officially complete. But this isn't goodbye — it's a new chapter.
          </p>
          <p style={{ fontSize: 14, color: B.black, lineHeight: 1.85, marginBottom: 24, fontWeight: 700, fontStyle: "italic" }}>
            As a program graduate, you keep your community access for 1 full year — no monthly fee. That's my gift to you for doing the work. 🎓
          </p>

          {/* What they keep */}
          <div style={{ background: B.blushPale, border: `1px solid ${B.blushMid}`, borderLeft: `3px solid ${B.blush}`, padding: "20px 24px", marginBottom: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: B.blush, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>What You Keep — 1 Full Year</div>
            {[
              "Full community access — no expiration",
              "🎓 Graduate badge on your community posts",
              "Access to all community resources",
              "Connection with Jess and the Inner Circle",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 18, height: 18, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Ic n="check" size={9} color={B.white} sw={2.5} />
                </div>
                <span style={{ fontSize: 12, color: B.charcoal, fontWeight: 300 }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Sign off */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, paddingTop: 8, borderTop: `1px solid ${B.cloud}` }}>
            <div style={{ width: 44, height: 44, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: B.white, flexShrink: 0 }}>JR</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: B.black, fontStyle: "italic" }}>With so much pride, Jessica Ramos</div>
              <div style={{ fontSize: 11, color: B.mid, fontWeight: 300 }}>info@sayjesstonails.com · 954.544.2888</div>
            </div>
          </div>

          <Btn full variant="blush" onClick={async () => {
            dismissGraduation();
            // Clear all local session data
            sessionStorage.removeItem("sjtn_session");
            sessionStorage.removeItem("sjtn_user");
            await supabase.auth.signOut();
            window.location.href = window.location.origin;
          }} style={{ padding: "16px" }}>
            Take Me to the Community →
          </Btn>
        </div>
      </div>
    </div>
  ) : null;

  const tierWelcome = TIER_WELCOME[profile.tier] || TIER_WELCOME["Hourly Session"];

  const WelcomeModal = showWelcome ? (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: isMobile ? "0" : "40px 16px" }}>
      <div style={{ background: B.white, width: "100%", maxWidth: 600, minHeight: isMobile ? "100dvh" : "auto", display: "flex", flexDirection: "column" }}>

        {/* Blush header with logo */}
        <div style={{ background: B.blush, padding: "32px 32px 24px", textAlign: "center" }}>
          <Logo height={56} white />
        </div>

        {/* Black greeting bar */}
        <div style={{ background: B.black, padding: "24px 32px", borderLeft: `4px solid ${B.blush}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: B.blushLight, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Welcome to Your Portal</div>
          <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 32 : 40, textTransform: "uppercase", color: B.ivory, margin: 0, letterSpacing: "-0.5px", lineHeight: 1.05 }}>
            Hi {profile.firstName},<br/>
            <span style={{ color: B.blushLight, fontStyle: "italic", fontWeight: 300 }}>{tierWelcome.headline}.</span>
          </h2>
        </div>

        {/* Letter body */}
        <div style={{ padding: isMobile ? "20px 18px" : "28px 32px", flex: 1 }}>
          <p style={{ fontSize: 14, color: B.charcoal, lineHeight: 1.85, marginBottom: 16, fontWeight: 300 }}>
            I'm so excited to support you in this next step of your nail journey. Congratulations on securing your spot in the <strong style={{ fontWeight: 700 }}>{profile.tier}</strong> mentorship with me.
          </p>
          <p style={{ fontSize: 14, color: B.charcoal, lineHeight: 1.85, marginBottom: 16, fontWeight: 300 }}>
            Most nail techs learn the technical side — but nobody teaches them the business side. How to price without underselling. How to attract clients who stay. How to stop trading time for barely-enough money. SayJessToNails was built to close that gap. Not with pressure — with presence.
          </p>
          <p style={{ fontSize: 14, color: B.black, lineHeight: 1.85, marginBottom: 24, fontWeight: 700, fontStyle: "italic" }}>
            Every session, every check-in, every plan is built around one goal: seeing you win.
          </p>

          {/* What's included */}
          <div style={{ background: B.off, border: `1px solid ${B.cloud}`, borderLeft: `3px solid ${B.blush}`, padding: "20px 24px", marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: B.blush, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Your Program Includes</div>
            {[
              tierWelcome.sessions,
              tierWelcome.checkins,
              tierWelcome.plan,
              tierWelcome.community,
              "DM support during business hours",
              "Access to your personal portal — always on",
            ].filter(Boolean).map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 18, height: 18, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Ic n="check" size={9} color={B.white} sw={2.5} />
                </div>
                <span style={{ fontSize: 12, color: B.charcoal, fontWeight: 300 }}>{item}</span>
              </div>
            ))}
          </div>

          {/* First session */}
          <div style={{ background: B.black, padding: "18px 22px", marginBottom: 24, borderLeft: `3px solid ${B.blush}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: B.blushLight, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Your First Session</div>
            <p style={{ fontSize: 13, color: B.ivory, fontWeight: 300, lineHeight: 1.7, margin: 0 }}>{tierWelcome.firstSession}</p>
          </div>

          {/* Jess sign off */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, paddingTop: 8, borderTop: `1px solid ${B.cloud}` }}>
            <div style={{ width: 44, height: 44, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: B.white, flexShrink: 0 }}>JR</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: B.black, fontFamily: FONTS.script, fontStyle: "italic" }}>Your Mentor, Jessica Ramos</div>
              <div style={{ fontSize: 11, color: B.mid, fontWeight: 300 }}>info@sayjesstonails.com · 954.544.2888</div>
            </div>
          </div>

          {/* CTA */}
          <Btn full variant="blush" onClick={dismissWelcome} style={{ padding: "16px" }}>
            I'm Ready — Take Me to My Portal
          </Btn>
          <p style={{ fontSize: 10, color: B.mid, textAlign: "center", marginTop: 10, fontWeight: 300 }}>This letter will be saved in your Documents tab for future reference.</p>
        </div>
      </div>
    </div>
  ) : null;

  const views = {
    dashboard: (
      <Pg title={`Hi, ${user.firstName}.`} sub="Welcome Back">
        <p style={{ color: B.mid, fontSize: 13, margin: "-14px 0 18px", fontWeight: 300 }}>{profile.daysRemaining} days remaining in your {profile.tier}.</p>

        {/* ── Jess's Voice — original card with real audio ── */}
        <div style={{ background: B.black, borderLeft: `3px solid ${B.blush}`, padding: "18px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, borderRadius: "50%" }}>
            <Ic n="mic" size={20} color={B.white} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Section style={{ color: B.blushLight, marginBottom: 4 }}>Jess's Voice — This Week</Section>
            {jessVoice ? (
              <>
                <div style={{ color: B.ivory, fontSize: 13, fontWeight: 300, marginBottom: 10 }}>"{jessVoice.text}"</div>
                <audio controls src={jessVoice.audioUrl} style={{ width:"100%", height:32, outline:"none" }} controlsList="nodownload" />
              </>
            ) : (
              <div style={{ color: "#9a8880", fontSize: 12, fontWeight: 300, fontStyle: "italic" }}>Jess hasn't posted this week's note yet — check back soon.</div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,1fr)", gap: 2, marginBottom: 16 }}>
          {[
            { value:`${profile.sessionsCompleted}/${profile.sessionsTotal}`, label:"Live Sessions", key:"sessions" },
            { value:profile.daysRemaining, label:"Days Left", key:"days" },
            { value:wins.length, label:"Wins", key:"wins" },
            { value:`${tasks.filter(t=>t.completed).length}/${tasks.length}`, label:"Assignments", key:"assignments" },
            { value:`${pct}%`, label:"Progress", key:"progress", accent:true },
          ].map(({ value, label, key, accent }) => (
            <button key={key} onClick={() => setMenteeStatDrawer(key)}
              style={{ padding:"14px 8px", background:B.white, border:`1px solid ${B.cloud}`, borderTop: accent ? `3px solid ${B.blush}` : `3px solid ${B.cloud}`, cursor:"pointer", textAlign:"center", fontFamily:FONTS.body, transition:"background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = B.off}
              onMouseLeave={e => e.currentTarget.style.background = B.white}>
              <div style={{ fontFamily:FONTS.display, fontWeight:900, fontSize: isMobile ? 24 : 28, color: accent ? B.blush : B.black, lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:8, color:B.mid, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginTop:5 }}>{label}</div>
              <div style={{ fontSize:7, color:B.blush, fontWeight:700, letterSpacing:1, marginTop:2, textTransform:"uppercase" }}>view →</div>
            </button>
          ))}
        </div>

        {/* ── Next Live Session card ── */}
        {profile.roomUrl ? (
          // LIVE — Jess is in the room
          <div style={{ background: B.black, padding: isMobile ? "20px" : "24px 28px", marginBottom: 16, borderLeft: `3px solid #22c55e`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -20, top: -20, width: 100, height: 100, borderRadius: "50%", background: `#22c55e0A` }} />
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:"#22c55e", animation:"pulse 1.5s ease-in-out infinite" }} />
              <Section style={{ color:"#22c55e", marginBottom:0 }}>Jess is Live — Join Now</Section>
            </div>
            <div style={{ color: B.ivory, fontFamily: FONTS.display, fontSize: 22, fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.03em" }}>{profile.nextSession?.type || "Live Session"}</div>
            <div style={{ color: "#9a8880", fontSize: 12, marginBottom: 16, fontWeight: 300 }}>Your session room is ready</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn variant="blush" icon="video" onClick={() => setCallActive(true)}>Join Session Now</Btn>
            </div>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
          </div>
        ) : profile.nextSession?.date ? (
          // SCHEDULED — session booked
          <div style={{ background: B.black, padding: isMobile ? "20px" : "24px 28px", marginBottom: 16, borderLeft: `3px solid ${B.blush}`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -20, top: -20, width: 100, height: 100, borderRadius: "50%", background: `${B.blush}0A` }} />
            <Section style={{ color: B.blushLight, marginBottom: 10 }}>Next Live Session</Section>
            <div style={{ color: B.ivory, fontFamily: FONTS.display, fontSize: 22, fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.03em" }}>{profile.nextSession?.type}</div>
            <div style={{ color: "#9a8880", fontSize: 12, marginBottom: 16, fontWeight: 300 }}>{profile.nextSession?.date} · {profile.nextSession?.time}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn variant="blush" icon="video" onClick={() => setCallActive(true)} style={{ opacity: 0.5, pointerEvents:"none" }}>Waiting for Jess</Btn>
              {!sessionPrep.submitted && <Btn variant="ghostDark" icon="clipBoard" onClick={() => setView("sessionprep")}>Prepare for Session</Btn>}
              {sessionPrep.submitted && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: B.success }}><Ic n="check" size={12} color={B.success} />Prep submitted</div>}
            </div>
          </div>
        ) : (
          // NO SESSION
          <div style={{ background: "#111", padding: isMobile ? "20px" : "24px 28px", marginBottom: 16, borderLeft: `3px solid #333` }}>
            <Section style={{ color: "#555", marginBottom: 8 }}>Next Live Session</Section>
            <div style={{ color: "#555", fontSize: 13, fontWeight: 300 }}>No session scheduled yet. Jess will be in touch soon.</div>
          </div>
        )}

        {/* ── Quick wins ── */}
        <Card style={{ padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Section>Recent Wins</Section>
            <button onClick={() => setView("wins")} style={{ fontSize: 9, color: B.blush, border: "none", background: "none", cursor: "pointer", fontFamily: FONTS.body, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Add a Win →</button>
          </div>
          {wins.slice(0, 2).map((w, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < 1 ? `1px solid ${B.cloud}` : "none", alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: catColors[w.cat] || B.blush, flexShrink: 0, marginTop: 4 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: B.charcoal, lineHeight: 1.5, fontWeight: 300 }}>{w.text}</div>
                <div style={{ fontSize: 9, color: B.mid, marginTop: 2 }}>{catLabels[w.cat]} · {w.date}</div>
              </div>
            </div>
          ))}
          {wins.length === 0 && <p style={{ fontSize: 12, color: B.mid, fontWeight: 300, fontStyle: "italic" }}>No wins logged yet — add your first one!</p>}
        </Card>

        {/* ── Progress ── */}
        <Card style={{ padding: "18px 20px", marginBottom: 16 }}>
          <Section style={{ marginBottom: 14 }}>Progress Overview</Section>
          {[["Sessions", pct], ["Timeline", dayPct], ["Wins", wins.length > 0 ? 100 : 0]].map(([l, v]) => (
            <div key={l} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: B.steel, fontWeight: 300 }}>{l}</span>
                <span style={{ fontSize: 11, color: B.blush, fontWeight: 700 }}>{v}%</span>
              </div>
              <PBar value={v} />
            </div>
          ))}
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 2 }}>
          <Card style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Section>My Wins</Section>
              <button onClick={() => setView("wins")} style={{ fontSize: 9, color: B.blush, border: "none", background: "none", cursor: "pointer", fontFamily: FONTS.body, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Add a Win →</button>
            </div>
            {wins.slice(0, 3).map((w, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: i < Math.min(wins.length, 3) - 1 ? `1px solid ${B.cloud}` : "none" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: B.black }}>{w.text}</div>
                <div style={{ fontSize: 10, color: B.mid, fontWeight: 300, marginTop: 2 }}>{w.date}</div>
              </div>
            ))}
            {wins.length === 0 && <p style={{ fontSize: 11, color: B.mid, fontWeight: 300, fontStyle: "italic" }}>No wins logged yet — add your first one!</p>}
          </Card>
          <Card style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Section>Messages</Section>
              <button onClick={() => setView("messages")} style={{ fontSize: 9, color: B.blush, border: "none", background: "none", cursor: "pointer", fontFamily: FONTS.body, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>View All</button>
            </div>
            {msgs.slice(0, 2).map((m, i) => (
              <div key={i} style={{ padding: "9px 0", borderBottom: i < 1 ? `1px solid ${B.cloud}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: m.from === "Jess" ? B.blush : B.black, letterSpacing: "0.03em" }}>{m.from}</span>
                  <span style={{ fontSize: 9, color: B.mid, fontWeight: 300 }}>{m.time}</span>
                </div>
                <p style={{ fontSize: 11, color: B.mid, margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", fontWeight: 300 }}>{m.text}</p>
              </div>
            ))}
          </Card>
        </div>

        {/* ── Assignments from Jess ── */}
        {tasks.length > 0 && (
          <Card style={{ padding:"18px 20px", marginTop: 2 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <Section>Assignments</Section>
              <span style={{ fontSize:9, color:B.mid, fontWeight:300 }}>{tasks.filter(t=>t.completed).length}/{tasks.length} done</span>
            </div>
            {tasks.map((task) => (
              <div key={task.id} style={{ padding:"12px 0", borderBottom:`1px solid ${B.cloud}` }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  <button onClick={() => completeTask(task)} style={{ width:20, height:20, background: task.completed ? B.blush : "transparent", border:`2px solid ${task.completed ? B.blush : B.cloud}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, cursor:"pointer", marginTop:2, padding:0 }}>
                    {task.completed && <Ic n="check" size={10} color={B.white} />}
                  </button>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color: task.completed ? B.mid : B.black, textDecoration: task.completed ? "line-through" : "none" }}>{task.title}</div>
                    {task.due_date && <div style={{ fontSize:9, color: B.blush, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginTop:3 }}>Due {task.due_date}</div>}
                    {task.jess_notes && (
                      <div style={{ marginTop:8, background:B.blushPale, borderLeft:`2px solid ${B.blush}`, padding:"8px 10px" }}>
                        <div style={{ fontSize:8, fontWeight:700, color:B.blush, letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 }}>From Jess</div>
                        <p style={{ fontSize:11, color:B.charcoal, margin:0, fontWeight:300, lineHeight:1.6 }}>{task.jess_notes}</p>
                      </div>
                    )}
                    {/* Mentee notes */}
                    {editingTaskNote === task.id ? (
                      <div style={{ marginTop:8 }}>
                        <textarea value={taskNoteInput} onChange={e => setTaskNoteInput(e.target.value)} rows={3} placeholder="Add your notes, questions, or updates..." style={{ width:"100%", padding:"8px 10px", border:`1px solid ${B.cloud}`, fontSize:12, fontFamily:FONTS.body, outline:"none", color:B.black, boxSizing:"border-box", resize:"vertical" }} />
                        <div style={{ display:"flex", gap:6, marginTop:6 }}>
                          <Btn size="sm" variant="blush" onClick={() => saveTaskNote(task.id)}>Save Note</Btn>
                          <Btn size="sm" variant="ghost" onClick={() => { setEditingTaskNote(null); setTaskNoteInput(""); }}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop:6 }}>
                        {task.mentee_notes && (
                          <div style={{ background:B.off, borderLeft:`2px solid ${B.cloud}`, padding:"8px 10px", marginBottom:4 }}>
                            <div style={{ fontSize:8, fontWeight:700, color:B.mid, letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 }}>Your Notes</div>
                            <p style={{ fontSize:11, color:B.charcoal, margin:0, fontWeight:300, lineHeight:1.6 }}>{task.mentee_notes}</p>
                          </div>
                        )}
                        <button onClick={() => { setEditingTaskNote(task.id); setTaskNoteInput(task.mentee_notes || ""); }} style={{ fontSize:9, color:B.blush, border:"none", background:"none", cursor:"pointer", fontFamily:FONTS.body, fontWeight:700, letterSpacing:1, textTransform:"uppercase", padding:0 }}>
                          {task.mentee_notes ? "Edit Note" : "+ Add Note"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* ── Resources from Jess ── */}
        {menteeResources.length > 0 && (
          <div style={{ background:B.black, borderLeft:`3px solid ${B.blush}`, padding:"18px 20px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
            <div>
              <Section style={{ color:B.blushLight, marginBottom:4 }}>Resources from Jess</Section>
              <div style={{ color:B.ivory, fontSize:13, fontWeight:300 }}>
                {menteeResources.length} resource{menteeResources.length !== 1 ? "s" : ""} available for you
              </div>
            </div>
            <Btn variant="blush" onClick={() => setView("resources")}>
              View Resources →
            </Btn>
          </div>
        )}
      </Pg>
    ),

    sessions: (
      <Pg title="Sessions" sub="Live Sessions">
        {profile.nextSession?.date ? (
          <div style={{ background: B.black, padding: "22px 24px", marginBottom: 14, borderLeft: `3px solid ${B.blush}` }}>
            <Section style={{ color: B.blushLight, marginBottom: 8 }}>Up Next</Section>
            <div style={{ color: B.ivory, fontFamily: FONTS.display, fontSize: 20, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>{profile.nextSession?.type}</div>
            <div style={{ color: "#9a8880", fontSize: 12, marginBottom: 16, fontWeight: 300 }}>{profile.nextSession?.date} · {profile.nextSession?.time}</div>
            {profile.roomUrl ? (
              <Btn variant="blush" icon="video" onClick={() => setCallActive(true)}>Join Session</Btn>
            ) : (
              <div style={{ fontSize: 11, color: "#9a8880", fontWeight: 300, fontStyle: "italic" }}>Jess will send you the link when it's time to join.</div>
            )}
          </div>
        ) : (
          <div style={{ background: B.black, padding: "22px 24px", marginBottom: 14, borderLeft: `3px solid #333` }}>
            <Section style={{ color: "#666", marginBottom: 8 }}>Up Next</Section>
            <div style={{ color: "#9a8880", fontSize: 13, fontWeight: 300 }}>No session scheduled yet — Jess will reach out to set one up.</div>
          </div>
        )}
        <div style={{ padding: "14px 0" }}>
          <div style={{ fontSize: 10, color: B.mid, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Sessions Completed ({profile.sessionsCompleted || 0}/{profile.sessionsTotal || 0})</div>
          {(profile.sessionsCompleted || 0) === 0 && (
            <p style={{ fontSize: 12, color: B.mid, fontWeight: 300, fontStyle: "italic" }}>Your completed sessions will appear here.</p>
          )}
          {Array.from({ length: profile.sessionsCompleted || 0 }, (_, i) => (
            <Card key={i} style={{ padding: "14px 18px", marginBottom: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: B.black, marginBottom: 3, letterSpacing: "0.03em" }}>Session {i + 1}</div>
                  <div style={{ fontSize: 10, color: B.mid, fontWeight: 300 }}>Completed</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Pg>
    ),

    schedule: (
      <Pg title="Schedule" sub="Upcoming">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 2, marginBottom: 20 }}>
          {profile.schedule?.map((s, i) => {
            const typeColor = { session: B.blush, checkin: B.success, review: "#9B6EA0" }[s.type] || B.mid;
            return (
              <Card key={i} style={{ padding: "16px 18px", borderTop: `3px solid ${typeColor}` }}>
                <Tag dark={false}>{s.type}</Tag>
                <div style={{ fontSize: 14, fontWeight: 700, color: B.black, margin: "10px 0 3px", letterSpacing: "0.03em" }}>{s.label}</div>
                <div style={{ fontSize: 11, color: B.mid, fontWeight: 300, marginBottom: s.type === "session" ? 12 : 0 }}>{s.date} · {s.time}</div>
                {s.type === "session" && <Btn size="sm" variant="primary" icon="video">Join</Btn>}
              </Card>
            );
          })}
        </div>
      </Pg>
    ),

    messages: (
      <div style={{ display: "flex", flexDirection: "column", height: isMobile ? "calc(100dvh - 116px)" : "calc(100vh - 56px)", paddingTop: 16 }}>
        <div style={{ padding: "0 18px 12px", flexShrink: 0 }}>
          <Section style={{ marginBottom: 8 }}>Direct Messages</Section>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><LogoMark size={20} white /></div>
            <div><div style={{ fontWeight: 700, fontSize: 13, color: B.black, letterSpacing: "0.03em" }}>Jess</div><div style={{ fontSize: 9, color: B.success, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>● Responds within 48hrs</div></div>
          </div>
        </div>
        <Divider />
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", background: B.off }}>
          {msgs.map((m, i) => {
            const isJ = m.from === "Jess";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isJ ? "flex-start" : "flex-end", marginBottom: 14 }}>
                {isJ && <div style={{ width: 24, height: 24, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0, alignSelf: "flex-end" }}><LogoMark size={16} white /></div>}
                <div style={{ maxWidth: "72%" }}>
                  <div style={{ background: isJ ? B.white : B.black, border: isJ ? `1px solid ${B.cloud}` : "none", padding: "10px 14px" }}>
                    {m.audioUrl ? (
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                          <Ic n="mic" size={11} color={B.blush} />
                          <span style={{ fontSize:9, color:B.blush, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>Voice Note from Jess</span>
                        </div>
                        <audio controls src={m.audioUrl} style={{ width:"100%", minWidth:160, height:36 }} controlsList="nodownload" />
                      </div>
                    ) : m.imageUrl ? (
                      <img src={m.imageUrl} alt="Shared image" style={{ maxWidth:"100%", maxHeight:260, display:"block", borderRadius:2 }} />
                    ) : (() => {
                        let prep = null;
                        try { const p = JSON.parse(m.text); if (p.__type === "session_prep") prep = p; } catch {}
                        if (prep) return (
                          <div style={{ minWidth:180 }}>
                            <div style={{ fontSize:9, fontWeight:700, color:B.blush, letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 }}>Session Prep Submitted ✓</div>
                            <div style={{ fontSize:11, color:B.mid, fontWeight:300 }}>Jess has received your answers.</div>
                          </div>
                        );
                        return <p style={{ margin: 0, fontSize: 12, color: isJ ? B.charcoal : B.ivory, lineHeight: 1.55, fontWeight: 300 }}>{m.text}</p>;
                      })()}
                  </div>
                  <div style={{ fontSize: 9, color: B.mid, marginTop: 3, textAlign: isJ ? "left" : "right", fontWeight: 300, letterSpacing: "0.05em" }}>{m.time}</div>
                </div>
              </div>
            );
          })}
          <div ref={msgEnd} />
        </div>
        <Divider />
        <div style={{ padding: "10px 18px", background: B.white, display: "flex", flexDirection:"column", gap:6, flexShrink: 0, paddingBottom: isMobile ? "calc(10px + env(safe-area-inset-bottom))" : "10px" }}>
          {msgImage && (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background:B.off, border:`1px solid ${B.cloud}` }}>
              <Ic n="file" size={12} color={B.blush} />
              <span style={{ fontSize:11, color:B.charcoal, flex:1, fontWeight:300 }}>{msgImage.name}</span>
              <button onClick={() => { setMsgImage(null); if(msgImageRef.current) msgImageRef.current.value=""; }} style={{ background:"none", border:"none", cursor:"pointer", color:B.mid, fontSize:14, padding:0, lineHeight:1 }}>×</button>
            </div>
          )}
          <div style={{ display:"flex", gap:2 }}>
            <input ref={msgImageRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => setMsgImage(e.target.files[0])} />
              <button onClick={() => msgImageRef.current?.click()} style={{ width:44, height:44, border:"none", background:B.blush, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, fontSize:22, color:B.white, fontWeight:300, lineHeight:1 }}>
                +
              </button>
            <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} placeholder="Message Jess…" style={{ flex: 1, border: `1px solid ${B.cloud}`, padding: "12px 14px", fontSize: 14, color: B.black, outline: "none", fontFamily: FONTS.body, background: B.white, fontWeight: 300 }} />
            <button onClick={sendMsg} style={{ width: 44, height: 44, background: B.blush, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><Ic n="send" size={14} color={B.white} /></button>
          </div>
        </div>
      </div>
    ),

    documents: (
      <Pg title="Files" sub="Documents">
        <div style={{ display: "flex", gap: 2, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
          {["All", ...new Set(profile.documents?.map(d => d.category) || [])].map(c => (
            <button key={c} onClick={() => setDocFilter(c)} style={{ padding: "7px 14px", border: `1px solid ${docFilter === c ? B.blush : B.cloud}`, background: docFilter === c ? B.blushPale : "transparent", color: docFilter === c ? B.blush : B.mid, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, whiteSpace: "nowrap", flexShrink: 0, letterSpacing: 1.5, textTransform: "uppercase" }}>{c}</button>
          ))}
        </div>
        <Card style={{ overflow: "hidden" }}>
          {(docFilter === "All" ? profile.documents || [] : profile.documents?.filter(d => d.category === docFilter) || []).map((doc, i, arr) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderBottom: i < arr.length - 1 ? `1px solid ${B.cloud}` : "none" }}>
              <div style={{ width: 34, height: 34, background: doc.type === "Video" ? B.black : B.off, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic n={doc.type === "Video" ? "play" : "file"} size={14} color={doc.type === "Video" ? B.white : B.steel} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: B.black, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>{doc.name}</div>
                <div style={{ fontSize: 9, color: B.mid, fontWeight: 300, marginTop: 2 }}>{doc.date}{doc.size !== "—" ? ` · ${doc.size}` : ""}</div>
              </div>
              <Tag>{doc.category}</Tag>
              <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", border: `1px solid ${B.cloud}`, background: "none", color: B.steel, fontSize: 9, cursor: "pointer", fontFamily: FONTS.body, flexShrink: 0, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
                <Ic n={doc.type === "Video" ? "play" : "download"} size={10} color={B.blush} />{!isMobile && (doc.type === "Video" ? "Watch" : "Download")}
              </button>
            </div>
          ))}
        </Card>
      </Pg>
    ),

    progress: (
      <Pg title="Progress" sub="My Journey">
        <div style={{ background: B.black, padding: "24px 24px", marginBottom: 16, borderLeft: `3px solid ${B.blush}` }}>
          <Section style={{ color: B.blushLight, marginBottom: 10 }}>Your Goal</Section>
          <p style={{ fontFamily: FONTS.script, fontStyle: "italic", fontSize: isMobile ? 16 : 19, color: B.ivory, margin: 0, lineHeight: 1.45, fontWeight: 400 }}>"{profile.goal}"</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 2, marginBottom: 12 }}>
          <Card style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Section>My Wins</Section>
              <button onClick={() => setView("wins")} style={{ fontSize: 9, color: B.blush, border: "none", background: "none", cursor: "pointer", fontFamily: FONTS.body, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Add a Win →</button>
            </div>
            {wins.slice(0, 3).map((w, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: i < Math.min(wins.length, 3) - 1 ? `1px solid ${B.cloud}` : "none" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: B.black }}>{w.text}</div>
                <div style={{ fontSize: 10, color: B.mid, fontWeight: 300, marginTop: 2 }}>{w.date}</div>
              </div>
            ))}
            {wins.length === 0 && <p style={{ fontSize: 11, color: B.mid, fontWeight: 300, fontStyle: "italic" }}>No wins logged yet — add your first one!</p>}
          </Card>
          <Card style={{ padding: "18px 20px" }}>
            <Section style={{ marginBottom: 12 }}>Sessions</Section>
            {Array.from({ length: profile.sessionsTotal || 0 }, (_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < (profile.sessionsTotal - 1) ? `1px solid ${B.cloud}` : "none" }}>
                <div style={{ width: 20, height: 20, background: i < profile.sessionsCompleted ? B.blush : B.cloud, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {i < profile.sessionsCompleted ? <Ic n="check" size={10} color={B.white} /> : <span style={{ fontSize: 8, color: B.mid, fontWeight: 700 }}>{i + 1}</span>}
                </div>
                <span style={{ fontSize: 11, color: i < profile.sessionsCompleted ? B.mid : B.charcoal, fontWeight: 300 }}>Session {i + 1}</span>
                {i === profile.sessionsCompleted && <BlushTag>Next</BlushTag>}
              </div>
            ))}
          </Card>
        </div>
        <Card style={{ padding: "16px 20px", borderLeft: `3px solid ${B.blush}` }}>
          <Section style={{ marginBottom: 8 }}>A Note from Jess</Section>
          <p style={{ fontFamily: FONTS.script, fontStyle: "italic", fontSize: 14, color: B.charcoal, margin: "0 0 6px", lineHeight: 1.65, fontWeight: 400 }}>"You are further ahead than you feel. Every session, every check-in compounds. Keep going — the breakthrough is closer than you think."</p>
          <span style={{ fontSize: 9, color: B.mid, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>— Jess</span>
        </Card>
      </Pg>
    ),

    // ── 1. WIN TRACKER ─────────────────────────────────────────────────
    wins: (
      <Pg title="My Wins" sub="Win Tracker">
        <p style={{ color: B.mid, fontSize: 13, margin: "-14px 0 20px", fontWeight: 300 }}>Every win counts. Log it, own it, celebrate it.</p>

        {/* Add a win */}
        <Card style={{ padding: "20px 22px", marginBottom: 16, borderTop: `3px solid ${B.blush}` }}>
          <Section style={{ marginBottom: 14 }}>Log a New Win</Section>
          <div style={{ display: "flex", gap: 2, marginBottom: 12, flexWrap: "nowrap", overflowX: "auto" }}>
            {Object.entries(catLabels).map(([k, v]) => (
              <button key={k} onClick={() => setWinCat(k)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 9px", border: `1px solid ${winCat === k ? catColors[k] : B.cloud}`, background: winCat === k ? `${catColors[k]}15` : "transparent", color: winCat === k ? catColors[k] : B.mid, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: 0.5, textTransform: "uppercase", transition: "all .15s", whiteSpace: "nowrap", flexShrink: 0 }}>
                <Ic n={catIcons[k]} size={10} color={winCat === k ? catColors[k] : B.mid} sw={1.5} />{v}
              </button>
            ))}
          </div>
          <textarea value={winInput} onChange={e => setWinInput(e.target.value)} placeholder="What happened? Be specific — numbers make wins feel real. e.g. 'Raised my prices $20 and kept all 8 clients.'" rows={4} style={{ width: "100%", padding: "12px 16px", border: `1px solid ${B.cloud}`, fontSize: 14, color: B.black, fontFamily: FONTS.body, outline: "none", resize: "vertical", boxSizing: "border-box", fontWeight: 300, minHeight: 100 }} />
          <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
            <Btn variant="blush" icon="trophy" onClick={addWin} disabled={!winInput.trim()}>Log This Win</Btn>
          </div>
        </Card>

        {/* Win history */}
        <Section style={{ marginBottom: 12 }}>Win History ({wins.length})</Section>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {wins.map((w, i) => (
            <Card key={i} style={{ padding: "16px 18px", borderLeft: `3px solid ${catColors[w.cat] || B.blush}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: catColors[w.cat] || B.blush, letterSpacing: 1.5, textTransform: "uppercase" }}>{catLabels[w.cat]}</span>
                <span style={{ fontSize: 9, color: B.mid, fontWeight: 300, flexShrink: 0 }}>{w.date}</span>
              </div>
              <p style={{ fontSize: 13, color: B.charcoal, margin: 0, lineHeight: 1.6, fontWeight: 300 }}>{w.text}</p>
            </Card>
          ))}
          {wins.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", border: `1px dashed ${B.cloud}` }}>
              <Ic n="trophy" size={32} color={B.cloud} />
              <p style={{ color: B.mid, fontSize: 13, marginTop: 12, fontWeight: 300 }}>Your wins are waiting to be claimed.<br/>Log your first one above.</p>
            </div>
          )}
        </div>
      </Pg>
    ),

    // ── 2. COMMUNITY ───────────────────────────────────────────────────
    community: (
      <Pg title="Community Feed" sub="The Inner Circle">
        <p style={{ color: B.mid, fontSize: 13, margin: "-14px 0 20px", fontWeight: 300 }}>Your people. Real nail techs doing the work alongside you.</p>

        {/* Jess's Voice — original card style with real audio */}
        <div style={{ background: B.black, borderLeft: `3px solid ${B.blush}`, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, borderRadius: "50%" }}>
            <Ic n="mic" size={18} color={B.white} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: B.blushLight, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 4px" }}>Jess's Voice — This Week</p>
            {jessVoice ? (
              <>
                <p style={{ color: B.ivory, fontSize: 13, fontWeight: 300, margin: "0 0 10px", lineHeight: 1.4 }}>"{jessVoice.text}"</p>
                <audio controls src={jessVoice.audioUrl} style={{ width:"100%", height:32, outline:"none" }} controlsList="nodownload" />
              </>
            ) : (
              <p style={{ color: "#9a8880", fontSize: 12, fontWeight: 300, margin: 0, fontStyle: "italic" }}>Jess hasn't posted this week's note yet — check back soon.</p>
            )}
          </div>
        </div>

        {/* Post composer */}
        <div style={{ background: B.white, border: `1px solid ${B.cloud}`, padding: "18px 20px", marginBottom: 16, borderTop: `3px solid ${B.blush}` }}>
          <div style={{ display: "flex", gap: 2, marginBottom: 12, flexWrap: "nowrap", overflowX: "auto" }}>
            {Object.entries(commCatLabels).map(([k, v]) => (
              <button key={k} onClick={() => setCommPostCat(k)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 9px", border: `1px solid ${commPostCat === k ? commCatColors[k] : B.cloud}`, background: commPostCat === k ? `${commCatColors[k]}12` : "transparent", color: commPostCat === k ? commCatColors[k] : B.mid, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: 0.5, transition: "all .15s", whiteSpace: "nowrap", flexShrink: 0 }}>
                <Ic n={commCatIcons[k]} size={10} color={commPostCat === k ? commCatColors[k] : B.mid} sw={1.5} />{v}
              </button>
            ))}
          </div>
          <textarea value={commPostInput} onChange={e => setCommPostInput(e.target.value)} placeholder="Share a win, ask a question, drop a tip — this community grows because you show up." rows={4} style={{ width: "100%", padding: "12px 14px", border: `1px solid ${B.cloud}`, fontSize: 14, color: B.black, fontFamily: FONTS.body, outline: "none", resize: "vertical", boxSizing: "border-box", fontWeight: 300, minHeight: 100 }} />
          {commPostImage && (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background:B.off, border:`1px solid ${B.cloud}`, marginTop:6 }}>
              <Ic n="file" size={12} color={B.blush} />
              <span style={{ fontSize:11, color:B.charcoal, flex:1, fontWeight:300 }}>{commPostImage.name}</span>
              <button onClick={() => { setCommPostImage(null); if(commPostImageRef.current) commPostImageRef.current.value=""; }} style={{ background:"none", border:"none", cursor:"pointer", color:B.mid, fontSize:14, padding:0 }}>×</button>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: B.white, borderRadius: "50%" }}>{user.avatar}</div>
              <span style={{ fontSize: 11, color: B.mid, fontWeight: 300 }}>Posting as {user.firstName}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <input ref={commPostImageRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => setCommPostImage(e.target.files[0])} />
              <button onClick={() => commPostImageRef.current?.click()} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", border:`1px solid ${B.cloud}`, background:B.white, color:B.mid, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:"0.08em", textTransform:"uppercase" }}>
                <Ic n="file" size={12} color={B.mid} />Add Photo
              </button>
              <button onClick={submitCommPost} disabled={!commPostInput.trim() && !commPostImage} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: (commPostInput.trim() || commPostImage) ? B.blush : B.cloud, border: "none", color: B.white, fontSize: 11, fontWeight: 700, cursor: (commPostInput.trim() || commPostImage) ? "pointer" : "default", fontFamily: FONTS.body, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                <Ic n="send" size={12} color={B.white} />Post
              </button>
            </div>
          </div>
        </div>

        {/* Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {communityPosts.filter(post => !(post.pinned && post.audioUrl)).length === 0 && (
            <div style={{ padding: "32px 20px", textAlign: "center", color: B.mid, fontSize: 13, fontWeight: 300, border: `1px solid ${B.cloud}`, background: B.white }}>
              The community feed is just getting started — check back soon!
            </div>
          )}
          {communityPosts.filter(post => !(post.pinned && post.audioUrl)).map((post) => (
            <div key={post.id} style={{ background: B.white, border: `1px solid ${B.cloud}`, padding: "20px 22px", borderTop: post.isJess ? `3px solid ${B.blush}` : `1px solid ${B.cloud}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, background: post.isJess ? B.blush : B.off, border: post.isJess ? "none" : `1px solid ${B.cloud}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: post.isJess ? B.white : B.steel, flexShrink: 0, borderRadius: "50%" }}>{post.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: B.black, letterSpacing: "0.02em", display: "flex", alignItems: "center", gap: 7 }}>
                    {post.author}
                    {post.isJess && <span style={{ fontSize: 8, background: B.blush, color: B.white, padding: "1px 6px", fontWeight: 700, letterSpacing: 1 }}>JESS</span>}
                    {post.isGraduate && !post.isJess && <span style={{ fontSize: 7, background: "#2D7D4E", color: B.white, padding: "1px 6px", fontWeight: 700, letterSpacing: 1 }}>🎓 GRAD</span>}
                  </div>
                  <div style={{ fontSize: 9, color: B.mid, fontWeight: 300, marginTop: 1 }}>{post.time}</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: B.charcoal, lineHeight: 1.75, margin: "0 0 14px", fontWeight: 300 }}>{post.text}</p>
              {post.audioUrl && (
                <div style={{ background:B.off, border:`1px solid ${B.cloud}`, borderLeft:`3px solid ${B.blush}`, padding:"10px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
                  <Ic n="mic" size={13} color={B.blush} />
                  <audio controls src={post.audioUrl} style={{ flex:1, height:32, outline:"none" }} controlsList="nodownload" />
                </div>
              )}
              {post.imageUrl && (
                <img src={post.imageUrl} alt="Post image" style={{ maxWidth:"100%", maxHeight:300, display:"block", borderRadius:2, marginBottom:14 }} />
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 16, borderTop: `1px solid ${B.cloud}`, paddingTop: 12 }}>
                <button onClick={() => setCommLiked(p => p.includes(post.id) ? p.filter(x => x !== post.id) : [...p, post.id])} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: commLiked.includes(post.id) ? B.blush : B.mid, fontFamily: FONTS.body, fontSize: 12, fontWeight: commLiked.includes(post.id) ? 700 : 300, padding: 0 }}>
                  <Ic n="heart" size={14} color={commLiked.includes(post.id) ? B.blush : B.mid} sw={commLiked.includes(post.id) ? 0 : 1.8} />
                  {post.likes + (commLiked.includes(post.id) ? 1 : 0)}
                </button>
                {post.comments?.length > 0 && <span style={{ fontSize: 10, color: B.mid, fontWeight: 300 }}>{post.comments.length} comments</span>}
              </div>
            </div>
          ))}
        </div>
      </Pg>
    ),

    // ── 3. SESSION PREP ────────────────────────────────────────────────
    sessionprep: (
      <Pg title="Session Prep" sub={`For ${profile.nextSession?.type}`}>
        <div style={{ background: B.black, padding: "16px 20px", marginBottom: 20, borderLeft: `3px solid ${B.blush}` }}>
          <div style={{ color: B.ivory, fontSize: 13, fontWeight: 500 }}>{profile.nextSession?.date} · {profile.nextSession?.time}</div>
          <div style={{ color: "#9a8880", fontSize: 11, fontWeight: 300, marginTop: 2 }}>Your answers go directly to Jess before the call so she's prepared for YOU.</div>
        </div>
        {sessionPrep.submitted ? (
          <Card style={{ padding: "32px 24px", textAlign: "center", borderTop: `3px solid ${B.success}` }}>
            <div style={{ width: 52, height: 52, background: B.successPale, border: `2px solid ${B.success}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Ic n="check" size={24} color={B.success} sw={2.5} /></div>
            <h3 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 26, textTransform: "uppercase", color: B.black, margin: "0 0 8px" }}>Prep Submitted.</h3>
            <p style={{ color: B.mid, fontSize: 13, fontWeight: 300, lineHeight: 1.6 }}>Jess has your answers. She'll come prepared with exactly what you need. See you at the session.</p>
            <div style={{ marginTop: 20 }}><Btn onClick={() => setView("dashboard")} variant="blush" icon="home">Back to Dashboard</Btn></div>
          </Card>
        ) : (
          <div>
            {[["What's your biggest win since your last session?", "win", "Something shifted, no matter how small — what was it?"], ["What's your biggest challenge right now?", "challenge", "Be honest. The more specific, the more Jess can help."], ["What do you need most from Jess in this session?", "need", "Strategy? Accountability? A mindset reset? Clarity on something specific?"]].map(([label, key, hint], i) => (
              <div key={key} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: B.white, flexShrink: 0 }}>{i + 1}</div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: B.black, letterSpacing: "0.02em" }}>{label}</label>
                </div>
                <textarea value={sessionPrep[key]} onChange={e => setSessionPrep(p => ({ ...p, [key]: e.target.value }))} placeholder={hint} rows={4} style={{ width: "100%", padding: "12px 16px", border: `1px solid ${B.cloud}`, fontSize: 14, color: B.black, fontFamily: FONTS.body, outline: "none", resize: "vertical", boxSizing: "border-box", fontWeight: 300, minHeight: 100 }} />
              </div>
            ))}
            <Btn full variant="blush" icon="send" onClick={async () => {
              const msg = JSON.stringify({
                __type: "session_prep",
                name: profile.firstName || profile.name,
                win: sessionPrep.win,
                challenge: sessionPrep.challenge,
                need: sessionPrep.need,
              });
              await supabase.functions.invoke('send-message', {
                body: { mentee_email: user.email, sender: "mentee", text: msg }
              });
              setSessionPrep(p => ({ ...p, submitted: true }));
            }} disabled={!sessionPrep.win.trim() || !sessionPrep.challenge.trim() || !sessionPrep.need.trim()}>Send to Jess</Btn>
          </div>
        )}
      </Pg>
    ),

    // ── 4. RESOURCES ───────────────────────────────────────────────────
    resources: (
      <Pg title="Resources" sub="Resource Library">
        <p style={{ color: B.mid, fontSize: 13, margin: "-14px 0 20px", fontWeight: 300 }}>Tools, guides, and templates curated by Jess for your growth.</p>

        {/* Jess's uploaded resources grouped by category */}
        {menteeResources.length > 0 && (() => {
          const catColors = { "Pricing":B.blush, "Client Attraction":B.success, "Business Setup":"#9B6EA0", "Mindset":B.amber, "Social Media":"#E91E8C", "Education":"#2196F3", "Templates":"#FF6B35", "Other":B.steel, "General":B.mid };
          const grouped = menteeResources.reduce((acc, r) => {
            const cat = r.category || "General";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(r);
            return acc;
          }, {});
          return Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom:24 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:3, height:20, background:catColors[cat] || B.blush, flexShrink:0 }} />
                <Section style={{ color:catColors[cat] || B.blush }}>{cat}</Section>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                {items.map(r => (
                  <Card key={r.id} style={{ padding:"14px 18px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:B.black }}>{r.title}</span>
                          <span style={{ fontSize:8, fontWeight:700, color:catColors[cat]||B.blush, background:`${catColors[cat]||B.blush}15`, padding:"2px 7px", letterSpacing:1, textTransform:"uppercase" }}>{r.file_type?.toUpperCase()}</span>
                          {!r.mentee_email && <span style={{ fontSize:7, color:B.mid, fontWeight:300 }}>For all</span>}
                        </div>
                        {r.description && <div style={{ fontSize:11, color:B.mid, fontWeight:300 }}>{r.description}</div>}
                      </div>
                      <a href={r.file_url} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", border:`1px solid ${B.cloud}`, background:"none", color:B.steel, fontSize:9, textDecoration:"none", fontFamily:FONTS.body, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", flexShrink:0 }}>
                        <Ic n="download" size={11} color={catColors[cat]||B.blush} />Access
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ));
        })()}
        {menteeResources.length === 0 && (
          <div style={{ padding: "32px 20px", textAlign: "center", color: B.mid, fontSize: 13, fontWeight: 300, border: `1px solid ${B.cloud}`, background: B.white }}>
            Jess will add your resources here as your program progresses — check back soon!
          </div>
        )}
      </Pg>
    ),

    // ── 5. REFERRAL ────────────────────────────────────────────────────
    referral: (
      <Pg title="Refer a Friend" sub="Grow the Circle">
        <div style={{ background: B.black, padding: "28px 28px", marginBottom: 20, borderLeft: `3px solid ${B.blush}`, textAlign: isMobile ? "left" : "center" }}>
          <Ic n="gift" size={36} color={B.blush} />
          <h3 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 32, textTransform: "uppercase", color: B.ivory, margin: "12px 0 8px", letterSpacing: "-0.5px" }}>Share the Love.</h3>
          <p style={{ color: "#9a8880", fontSize: 14, lineHeight: 1.75, fontWeight: 300, maxWidth: 480, margin: "0 auto" }}>Know a nail tech who's ready to level up? Send them your link. When they book a discovery call, you earn a credit toward your next session.</p>
        </div>
        <Card style={{ padding: "22px 24px", marginBottom: 16 }}>
          <Section style={{ marginBottom: 12 }}>Your Personal Referral Link</Section>
          <div style={{ display: "flex", gap: 2 }}>
            <div style={{ flex: 1, padding: "12px 16px", background: B.off, border: `1px solid ${B.cloud}`, fontSize: 12, color: B.steel, fontFamily: FONTS.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              sayjesstonails.com/ref/{user.firstName.toLowerCase()}{user.avatar.toLowerCase()}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(`https://sayjesstonails.com/ref/${user.firstName?.toLowerCase()}${user.avatar?.toLowerCase()}`); setReferralCopied(true); setTimeout(() => setReferralCopied(false), 2000); }} style={{ padding: "12px 18px", background: referralCopied ? B.success : B.black, border: "none", color: B.white, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0, transition: "background .3s", display: "flex", alignItems: "center", gap: 7 }}>
              <Ic n={referralCopied ? "check" : "link"} size={13} color={B.white} />
              {referralCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 2, marginBottom: 20 }}>
          {[
            ["Share on Instagram", "instagram", B.blush, () => window.open("https://www.instagram.com/", "_blank")],
            ["Share via Text", "send", B.success, () => { const ref = `sayjesstonails.com/ref/${user.firstName?.toLowerCase()}${user.avatar?.toLowerCase()}`; window.open(`sms:?body=Hey! I've been working with Jess at SayJessToNails and it's been amazing. Check it out: https://${ref}`, "_blank"); }],
            ["Copy Link", "link", "#9B6EA0", () => { navigator.clipboard.writeText(`https://sayjesstonails.com/ref/${user.firstName?.toLowerCase()}${user.avatar?.toLowerCase()}`); setReferralCopied(true); setTimeout(() => setReferralCopied(false), 2000); }],
          ].map(([label, icon, color, onClick]) => (
            <button key={label} onClick={onClick} style={{ padding: "14px", border: `1px solid ${B.cloud}`, background: B.white, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontFamily: FONTS.body, fontSize: 12, fontWeight: 600, color: B.charcoal, letterSpacing: "0.02em" }}>
              <Ic n={icon} size={15} color={color} />{label}
            </button>
          ))}
        </div>
        <Card style={{ padding: "18px 20px", borderLeft: `3px solid ${B.blush}` }}>
          <Section style={{ marginBottom: 10 }}>How it Works</Section>
          {[["Share your link", "Send it to any nail tech you know who's ready to grow."], ["They book a call", "When they request a discovery call using your link, it's tracked."], ["You earn a credit", "After their call, Jess applies a session credit to your account."]].map(([t, d], i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < 2 ? `1px solid ${B.cloud}` : "none" }}>
              <div style={{ width: 22, height: 22, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: B.white, flexShrink: 0 }}>{i + 1}</div>
              <div><div style={{ fontSize: 12, fontWeight: 700, color: B.black, marginBottom: 2 }}>{t}</div><div style={{ fontSize: 11, color: B.mid, fontWeight: 300 }}>{d}</div></div>
            </div>
          ))}
        </Card>
      </Pg>
    ),

    payments: (
      <Pg title="Payments" sub="Billing">
        <Card style={{ marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${B.cloud}`, background: B.off, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Section>Transaction History</Section>
            <span style={{ fontSize: 9, fontWeight: 700, color: B.success, letterSpacing: 1.5, textTransform: "uppercase" }}>All Paid</span>
          </div>
          {profile.payments?.map((p, i) => (
            <div key={i} style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: B.black, letterSpacing: "0.02em" }}>{p.desc}</div><div style={{ fontSize: 10, color: B.mid, fontWeight: 300, marginTop: 2 }}>{p.date}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 22, color: B.black }}>{p.amount}</span>
                <Tag>{p.status}</Tag>
              </div>
              <Btn variant="ghost" size="sm" icon="download">Receipt</Btn>
            </div>
          ))}
        </Card>
      </Pg>
    ),

    more: (
      <div style={{ padding: "20px 18px 96px" }}>
        <div style={{ marginBottom: 20 }}><Logo height={42} /></div>
        <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 32, textTransform: "uppercase", color: B.black, margin: "0 0 18px", letterSpacing: "-0.5px" }}>More</h2>
        {[
          { id:"schedule",    icon:"calendar",  label:"Schedule" },
          { id:"sessionprep", icon:"clipBoard",  label:"Prepare for Session" },
          { id:"resources",   icon:"book",       label:"Resource Library" },
          { id:"progress",    icon:"award",      label:"My Progress" },
          { id:"referral",    icon:"gift",       label:"Refer a Friend" },
          { id:"payments",    icon:"card",       label:"Payments" },
        ].map(({ id, icon, label }) => (
          <button key={id} onClick={() => setView(id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", border: `1px solid ${B.cloud}`, background: B.white, color: B.charcoal, marginBottom: 2, fontFamily: FONTS.body, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", letterSpacing: "0.03em" }}>
            <div style={{ width: 36, height: 36, background: B.black, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ic n={icon} size={16} color={B.white} /></div>
            {label}
          </button>
        ))}
        <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", border: `1px solid ${B.cloud}`, background: B.white, color: B.mid, fontFamily: FONTS.body, fontSize: 13, cursor: "pointer", textAlign: "left", marginTop: 8 }}>
          <div style={{ width: 36, height: 36, background: B.off, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ic n="logout" size={16} color={B.mid} /></div>
          Sign out
        </button>
      </div>
    ),
  };

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", fontFamily: FONTS.body, background: B.off, position: "relative" }}>
      {callActive && <VideoCallModal
        onClose={() => setCallActive(false)}
        sessionName={profile.nextSession?.type || "Live Session"}
        participantName="Jess"
        isHost={false}
        presetRoomUrl={profile.roomUrl || null}
      />}
      {WelcomeModal}
      {GraduationModal}

      {/* Mentee stat drawer */}
      {menteeStatDrawer && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:500, display:"flex", justifyContent:"flex-end" }} onClick={() => setMenteeStatDrawer(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: isMobile ? "100%" : 380, background:B.white, height:"100%", overflowY:"auto", display:"flex", flexDirection:"column" }}>
            <div style={{ background:B.black, padding:"20px 24px", borderLeft:`4px solid ${B.blush}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
              <div>
                <div style={{ fontSize:9, fontWeight:700, color:B.blushLight, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Your Progress</div>
                <div style={{ fontSize:16, fontWeight:700, color:B.ivory }}>{{ sessions:"Live Sessions", days:"Days Left", wins:"Wins", assignments:"Assignments", progress:"Overall Progress" }[menteeStatDrawer]}</div>
              </div>
              <button onClick={() => setMenteeStatDrawer(null)} style={{ width:28, height:28, border:`1px solid #333`, background:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="close" size={13} color={B.mid} /></button>
            </div>
            <div style={{ padding:"20px 24px", flex:1 }}>

              {menteeStatDrawer === "sessions" && (
                <div>
                  <div style={{ fontSize:11, color:B.mid, fontWeight:300, marginBottom:16 }}>{profile.sessionsCompleted} of {profile.sessionsTotal} sessions completed</div>
                  <PBar value={Math.round((profile.sessionsCompleted / profile.sessionsTotal) * 100)} h={6} />
                  <div style={{ marginTop:20 }}>
                    {profile.nextSession && (
                      <div style={{ padding:"14px 16px", marginBottom:2, background:B.blushPale, borderLeft:`3px solid ${B.blush}` }}>
                        <div style={{ fontSize:12, fontWeight:700, color:B.black }}>{profile.nextSession.type}</div>
                        <div style={{ fontSize:10, color:B.mid, fontWeight:300, marginTop:2 }}>{profile.nextSession.date} · {profile.nextSession.time} — Scheduled</div>
                      </div>
                    )}
                    {Array.from({ length: profile.sessionsTotal }, (_, i) => {
                      const completed = i < profile.sessionsCompleted;
                      return (
                        <div key={i} style={{ padding:"14px 16px", marginBottom:2, background: completed ? B.successPale : B.off, borderLeft:`3px solid ${completed ? B.success : B.cloud}` }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <div style={{ fontSize:12, fontWeight:700, color: completed ? B.black : B.mid }}>Session {i+1}</div>
                            {completed ? <Ic n="check" size={14} color={B.success} /> : <span style={{ fontSize:9, color:B.mid, fontWeight:300 }}>Upcoming</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {menteeStatDrawer === "days" && (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ fontSize:11, color:B.mid, fontWeight:300 }}>Started {profile.startDate}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:B.blush }}>{profile.daysRemaining} days left</span>
                  </div>
                  <PBar value={Math.round(((profile.totalDays - profile.daysRemaining) / profile.totalDays) * 100)} h={8} />
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, marginBottom:20 }}>
                    <span style={{ fontSize:9, color:B.mid }}>Day 1</span>
                    <span style={{ fontSize:9, color:B.mid }}>Day {profile.totalDays}</span>
                  </div>
                  {[
                    { label:"Program Duration", value:`${profile.totalDays} days` },
                    { label:"Days Completed", value:`${profile.totalDays - profile.daysRemaining}` },
                    { label:"Days Remaining", value:`${profile.daysRemaining}` },
                    { label:"Completion", value:`${Math.round(((profile.totalDays - profile.daysRemaining) / profile.totalDays) * 100)}%` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${B.cloud}` }}>
                      <span style={{ fontSize:11, color:B.mid, fontWeight:300 }}>{label}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:B.black }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {menteeStatDrawer === "wins" && (
                <div>
                  <div style={{ fontSize:11, color:B.mid, fontWeight:300, marginBottom:16 }}>{wins.length} win{wins.length !== 1 ? "s" : ""} logged</div>
                  {wins.map((w, i) => (
                    <div key={i} style={{ padding:"10px 0", borderBottom:`1px solid ${B.cloud}` }}>
                      <div style={{ fontSize:12, fontWeight:600, color:B.black, marginBottom:2 }}>{w.text}</div>
                      <div style={{ fontSize:10, color:B.mid, fontWeight:300 }}>{w.date}</div>
                    </div>
                  ))}
                  {wins.length === 0 && <p style={{ fontSize:12, color:B.mid, fontWeight:300, fontStyle:"italic" }}>No wins logged yet — add your first one!</p>}
                </div>
              )}
                           {menteeStatDrawer === "assignments" && (
                <div>
                  <div style={{ fontSize:11, color:B.mid, fontWeight:300, marginBottom:16 }}>{tasks.filter(t=>t.completed).length} of {tasks.length} completed</div>
                  {tasks.length === 0 && <p style={{ fontSize:12, color:B.mid, fontStyle:"italic", fontWeight:300 }}>No assignments yet.</p>}
                  {tasks.map(task => (
                    <div key={task.id} style={{ padding:"12px 0", borderBottom:`1px solid ${B.cloud}` }}>
                      <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                        <button onClick={() => completeTask(task)} style={{ width:20, height:20, background: task.completed ? B.blush : "transparent", border:`2px solid ${task.completed ? B.blush : B.cloud}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, cursor:"pointer", marginTop:2, padding:0 }}>
                          {task.completed && <Ic n="check" size={9} color={B.white} />}
                        </button>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700, color: task.completed ? B.mid : B.black, textDecoration: task.completed ? "line-through" : "none" }}>{task.title}</div>
                          {task.due_date && <div style={{ fontSize:9, color:B.blush, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginTop:3 }}>Due {task.due_date}</div>}
                          {task.jess_notes && <div style={{ marginTop:6, background:B.blushPale, borderLeft:`2px solid ${B.blush}`, padding:"6px 10px" }}>
                            <div style={{ fontSize:8, fontWeight:700, color:B.blush, letterSpacing:1.5, textTransform:"uppercase", marginBottom:3 }}>From Jess</div>
                            <p style={{ fontSize:11, color:B.charcoal, margin:0, fontWeight:300 }}>{task.jess_notes}</p>
                          </div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {menteeStatDrawer === "progress" && (() => {
                const sessionPct = profile.sessionsTotal ? Math.round((profile.sessionsCompleted / profile.sessionsTotal) * 100) : 0;
                const dayPct = profile.totalDays ? Math.round(((profile.totalDays - profile.daysRemaining) / profile.totalDays) * 100) : 0;
                const milestonePct = milestones.length ? Math.round((done / milestones.length) * 100) : 0;
                const overall = Math.round((sessionPct + dayPct + milestonePct) / 3);
                return (
                  <div>
                    <div style={{ padding:"24px", background:B.blushPale, borderLeft:`3px solid ${B.blush}`, marginBottom:20, textAlign:"center" }}>
                      <div style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:64, color:B.blush, lineHeight:1 }}>{overall}%</div>
                      <div style={{ fontSize:10, color:B.blush, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginTop:6 }}>Overall Progress</div>
                    </div>
                    {[["Live Sessions", sessionPct], ["Timeline", dayPct], ["Wins", wins.length > 0 ? 100 : 0]].map(([label, p]) => (
                      <div key={label} style={{ marginBottom:18 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <span style={{ fontSize:11, color:B.steel, fontWeight:300 }}>{label}</span>
                          <span style={{ fontSize:11, color:B.blush, fontWeight:700 }}>{p}%</span>
                        </div>
                        <PBar value={p} h={6} />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=DM+Sans:wght@300;400;500;600&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0} button{-webkit-tap-highlight-color:transparent;transition:all .18s} button:active{opacity:.78} input,textarea{font-size:16px!important;font-family:inherit} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:${B.cloud}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}} @keyframes celebPop{0%{transform:scale(0) rotate(-10deg);opacity:0}60%{transform:scale(1.08) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}} @keyframes celebFade{0%{opacity:1}70%{opacity:1}100%{opacity:0}} @keyframes confettiDrop{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(80px) rotate(360deg);opacity:0}}`}</style>

      {/* ── Celebration overlays ── */}
      {(celebratingWin || celebratingMilestone) && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", animation: "celebFade 3.5s ease forwards" }} onClick={() => { setCelebratingWin(null); setCelebratingMilestone(null); }}>
          {/* Confetti dots */}
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: [B.blush, B.white, B.blushLight, B.success, "#9B6EA0"][i % 5], left: `${10 + i * 7}%`, top: "20%", animation: `confettiDrop ${0.8 + (i % 4) * 0.3}s ease ${i * 0.1}s both` }} />
          ))}
          <div style={{ textAlign: "center", animation: "celebPop .5s cubic-bezier(.16,1,.3,1) both", padding: "0 32px", maxWidth: 400 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Ic n={celebratingMilestone ? "award" : "catWin"} size={32} color={B.white} sw={1.5} />
            </div>
            <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 52, textTransform: "uppercase", color: B.white, letterSpacing: "-1px", lineHeight: 0.95, marginBottom: 12 }}>
              {celebratingMilestone ? "Milestone\nUnlocked!" : "Win\nLogged!"}
            </h2>
            <div style={{ width: 48, height: 3, background: B.blush, margin: "0 auto 16px" }} />
            <p style={{ color: "#9a8880", fontSize: 15, fontWeight: 300, lineHeight: 1.65 }}>
              {celebratingMilestone ? `"${celebratingMilestone.label}" — that's real growth. Jess is proud of you.` : `"${(celebratingWin?.text || "").slice(0, 80)}${(celebratingWin?.text || "").length > 80 ? "…" : ""}"`}
            </p>
            <div style={{ marginTop: 20, fontSize: 10, color: "#555", letterSpacing: 1.5, textTransform: "uppercase" }}>tap anywhere to continue</div>
          </div>
        </div>
      )}

      {useSidebar && (
        <div style={{ width: 220, background: B.white, borderRight: `1px solid ${B.cloud}`, display: "flex", flexDirection: "column", height: "100%", flexShrink: 0 }}>
          <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${B.cloud}` }}><Logo height={isMobile ? 50 : 60} /></div>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${B.cloud}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: B.white, flexShrink: 0 }}>{user.avatar}</div>
            <div><div style={{ color: B.ink, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{user.firstName}</div><div style={{ fontSize: 8, color: B.blush, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>{profile.tier}</div></div>
          </div>
          <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
            {NAV.map(({ id, icon, label }) => {
              const on = view === id; const badge = id === "messages" && unread > 0;
              return <button key={id} onClick={() => setView(id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "none", background: on ? B.blushPale : "transparent", color: on ? B.blush : B.steel, marginBottom: 2, fontFamily: FONTS.body, fontSize: 12, fontWeight: on ? 700 : 400, textAlign: "left", cursor: "pointer", borderLeft: `3px solid ${on ? B.blush : "transparent"}`, transition: "all .15s", letterSpacing: "0.03em", position: "relative", borderRadius: "0 6px 6px 0" }}><Ic n={icon} size={14} color={on ? B.blush : B.mid} />{label}{badge && <span style={{ marginLeft: "auto", background: B.blush, color: B.white, fontSize: 7, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>{unread}</span>}</button>;
            })}
          </nav>
          <div style={{ padding: "10px 10px", borderTop: `1px solid ${B.cloud}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", marginBottom: 4 }}>
              <Ic n="lock" size={10} color={B.success} /><span style={{ fontSize: 8, color: B.success, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>256-bit encrypted</span>
            </div>
            <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: "none", background: "transparent", color: B.mid, fontFamily: FONTS.body, fontSize: 11, cursor: "pointer", letterSpacing: "0.05em" }}><Ic n="logout" size={13} color={B.mid} />Sign out</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ position: "sticky", top: 0, background: B.white, borderBottom: `1px solid ${B.cloud}`, padding: "11px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 50, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: B.mid, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{view === "more" ? "More" : view}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {unread > 0 && <button onClick={() => setView("messages")} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 3 }}><Ic n="bell" size={16} color={B.mid} /><div style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, background: B.blush, fontSize: 6, color: B.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{unread}</div></button>}
            <div style={{ width: 26, height: 26, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: B.white }}>{user.avatar}</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>{views[view] || views.dashboard}</div>
      </div>

      {!useSidebar && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: B.white, borderTop: `1px solid ${B.cloud}`, display: "flex", paddingBottom: "env(safe-area-inset-bottom)", zIndex: 100 }}>
          {TABS.map(({ id, icon, label }) => { const on = view === id; const badge = id === "messages" && unread > 0; return (<button key={id} onClick={() => setView(id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px 8px", border: "none", background: "transparent", color: on ? B.blush : B.mid, cursor: "pointer", fontFamily: FONTS.body, fontSize: 8, fontWeight: on ? 700 : 300, position: "relative", letterSpacing: 1.5, textTransform: "uppercase" }}><Ic n={icon} size={20} color={on ? B.blush : B.mid} />{label}{badge && <div style={{ position: "absolute", top: 8, right: "calc(50% - 14px)", width: 12, height: 12, background: B.blush, fontSize: 6, color: B.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{unread}</div>}</button>); })}

        </nav>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   COMMUNITY PORTAL
════════════════════════════════════════════════════════════════════════ */
const CommunityPg = ({ title, sub, children }) => {
  const { isMobile } = useLayout();
  return (
    <div style={{ padding: isMobile ? "20px 18px 96px" : "28px 32px", maxWidth: 860, width: "100%" }}>
      {title && <div style={{ marginBottom: 20 }}>
        {sub && <p style={{ fontSize: 9, fontWeight: 700, color: B.blush, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 8px" }}>{sub}</p>}
        <h1 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 32 : 44, textTransform: "uppercase", color: B.black, margin: 0, lineHeight: 0.95, letterSpacing: "-0.5px" }}>{title}</h1>
      </div>}
      {children}
    </div>
  );
};

/* ── Graduate Welcome Modal — standalone to avoid JSX nesting issues ── */
const GradWelcomeModal = ({ user, onDismiss, isMobile }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:1001, overflowY:"auto", display:"flex", alignItems:"flex-start", justifyContent:"center", padding: isMobile ? "0" : "40px 16px" }}>
    <div style={{ background:B.white, width:"100%", maxWidth:580, minHeight: isMobile ? "100dvh" : "auto", display:"flex", flexDirection:"column" }}>
      <div style={{ background:B.blush, padding:"32px 32px 24px", textAlign:"center" }}>
        <Logo height={56} />
      </div>
      <div style={{ background:B.black, padding:"24px 32px", borderLeft:`4px solid ${B.blush}` }}>
        <div style={{ fontSize:10, fontWeight:700, color:B.blushLight, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Welcome Back, Graduate 🎓</div>
        <h2 style={{ fontFamily:FONTS.display, fontWeight:900, fontSize: isMobile ? 30 : 38, textTransform:"uppercase", color:B.ivory, margin:0, letterSpacing:"-0.5px", lineHeight:1.05 }}>
          This is your<br/>
          <span style={{ color:B.blushLight, fontStyle:"italic", fontWeight:300 }}>Inner Circle.</span>
        </h2>
      </div>
      <div style={{ padding:isMobile?"20px 18px":"28px 32px", flex:1 }}>
        <p style={{ fontSize:14, color:B.charcoal, lineHeight:1.85, marginBottom:16, fontWeight:300 }}>
          Welcome to your new home in the community. You've earned your place here — not just as a member, but as someone who went all in, did the work, and came out the other side.
        </p>
        <p style={{ fontSize:14, color:B.charcoal, lineHeight:1.85, marginBottom:24, fontWeight:300 }}>
          The nail techs in this community look up to people like you. Your journey, your wins, your lessons — they matter here. You're not just a member. <strong>You're an ambassador.</strong>
        </p>
        <div style={{ background:B.blushPale, border:`1px solid ${B.blushMid}`, borderLeft:`3px solid ${B.blush}`, padding:"20px 24px", marginBottom:24 }}>
          <div style={{ fontSize:9, fontWeight:700, color:B.blush, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Your Graduate Privileges</div>
          {[
            { icon:"🎓", text:"Graduate badge next to your name on every post — the community knows you went through the full program" },
            { icon:"💬", text:"Your voice carries weight here — share what worked, what didn't, and how you grew" },
            { icon:"🌟", text:"1 full year of complimentary community access — no monthly fee, ever" },
            { icon:"🤝", text:"Direct line to Jess and the Inner Circle — you're part of the family now" },
          ].map((item, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:12 }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{item.icon}</span>
              <span style={{ fontSize:12, color:B.charcoal, fontWeight:300, lineHeight:1.6 }}>{item.text}</span>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:28, paddingTop:8, borderTop:`1px solid ${B.cloud}` }}>
          <div style={{ width:44, height:44, background:B.blush, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:B.white, flexShrink:0 }}>JR</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:B.black, fontStyle:"italic" }}>So proud of you, Jessica Ramos</div>
            <div style={{ fontSize:11, color:B.mid, fontWeight:300 }}>info@sayjesstonails.com · 954.544.2888</div>
          </div>
        </div>
        <button onClick={onDismiss} style={{ width:"100%", padding:"16px", background:B.blush, border:"none", color:B.white, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase" }}>
          Enter the Community — Sign In →
        </button>
        <p style={{ fontSize:11, color:B.mid, fontWeight:300, textAlign:"center", marginTop:10, lineHeight:1.5 }}>
          You'll be signed out and taken to the login screen. Sign back in with your same email and password.
        </p>
      </div>
    </div>
  </div>
);

const CommunityPortal = ({ user, onLogout, onUpgrade }) => {
  const { isMobile, useSidebar } = useLayout();
  const [view, setView] = useState("feed");
  const [postInput, setPostInput] = useState("");
  const [postCat, setPostCat] = useState("win");
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isGraduate, setIsGraduate] = useState(false);
  const [showGradWelcome, setShowGradWelcome] = useState(false);
  const gradWelcomeKey = `sjtn_grad_welcome_${user.email}`;
  const [resources, setResources] = useState([]);
  useEffect(() => {
    supabase.functions.invoke('assign-task', { body: { action: 'get_all_resources' } })
      .then(({ data }) => {
        if (data) {
          const globalOnes = (Array.isArray(data) ? data : data.resources || [])
            .filter(r => !r.mentee_email)
            .map(r => ({ name: r.title, type: r.file_type?.toUpperCase() || "FILE", desc: r.description || "", url: r.file_url }));
          setResources(globalOnes);
        }
      });
  }, []);

  useEffect(() => {
    if (!user.email || user.password) return;
    supabase.functions.invoke('assign-task', { body: { action: 'check_graduated', email: user.email } })
      .then(({ data }) => {
        if (data?.graduated) {
          setIsGraduate(true);
          try { if (!localStorage.getItem(gradWelcomeKey)) setShowGradWelcome(true); } catch { setShowGradWelcome(true); }
        }
      });
  }, [user.email]);

  useEffect(() => {
    const fetchPosts = () => {
      supabase.functions.invoke("community-post", { body: { action: "fetch" } })
        .then(({ data }) => {
          const posts = data?.posts || [];
          if (posts.length > 0) {
            setPosts(posts.map(p => ({
              id: p.id, author: p.author, avatar: p.avatar,
              time: new Date(p.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric" }),
              text: p.text, likes: p.likes || 0, isJess: p.is_jess, cat: p.cat,
              audioUrl: p.audio_url?.startsWith("__POSTIMAGE__") ? null : (p.audio_url || null),
              imageUrl: p.audio_url?.startsWith("__POSTIMAGE__") ? p.audio_url.replace("__POSTIMAGE__", "") : null,
              isGraduate: p.is_graduate || false
            })));
          } else {
            setPosts([]);
          }
        });
    };
    fetchPosts();
    const interval = setInterval(fetchPosts, 15000);
    return () => clearInterval(interval);
  }, []);

  // Trial detection — graduates and paid members are never on trial
  const isTrial = !user.paid && !user.graduated && user.tierKey !== "graduate";

  // Lock gate component for trial users
  const LockedGate = ({ section }) => (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:400, padding:"48px 24px", textAlign:"center" }}>
      <div style={{ width:64, height:64, background:B.blushPale, border:`2px solid ${B.blushMid}`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24 }}>
        <Ic n="lock" size={28} color={B.blush} />
      </div>
      <h3 style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:32, textTransform:"uppercase", color:B.black, margin:"0 0 12px", letterSpacing:"-0.5px" }}>{section} is a<br/>Member Benefit</h3>
      <p style={{ color:B.mid, fontSize:14, maxWidth:360, lineHeight:1.8, margin:"0 0 32px", fontWeight:300 }}>
        You're currently on your free trial — community feed access only. Upgrade to full membership to unlock {section.toLowerCase()}, audio check-ins, and everything inside.
      </p>
      <div style={{ background:B.white, border:`1px solid ${B.cloud}`, borderTop:`3px solid ${B.blush}`, padding:"20px 24px", maxWidth:320, width:"100%", marginBottom:24, textAlign:"left" }}>
        <div style={{ fontSize:9, fontWeight:700, color:B.blush, letterSpacing:3, textTransform:"uppercase", marginBottom:12 }}>Full Membership Includes</div>
        {["Community feed access", "Full resource library", "Jess's weekly audio check-ins", "Peer accountability & wins", "Direct path to 1:1 mentorship"].map((f, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ width:16, height:16, background:B.blush, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Ic n="check" size={9} color={B.white} sw={3} />
            </div>
            <span style={{ fontSize:13, color:B.charcoal, fontWeight:300 }}>{f}</span>
          </div>
        ))}
        <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${B.cloud}` }}>
          <span style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:28, color:B.black }}>$27</span>
          <span style={{ fontSize:12, color:B.mid, fontWeight:300 }}>/month</span>
        </div>
      </div>
      <Btn variant="blush" icon="zap" onClick={onUpgrade}>Upgrade to Full Membership</Btn>
      <p style={{ color:B.mid, fontSize:11, marginTop:16, fontWeight:300 }}>Cancel anytime. No contracts.</p>
    </div>
  );

  const catColors = { win: B.blush, tip: B.success, question: "#9B6EA0", resource: B.amber, intro: B.steel };
  const catLabels = { win: "Win", tip: "Tip", question: "Question", resource: "Resource", intro: "Intro" };
  const catIcons  = { win: "catWin", tip: "catTip", question: "catQuestion", resource: "catResource", intro: "catIntro" };
  const Pg = CommunityPg;

  const submitPost = async () => {
    if (!postInput.trim()) return;
    const newPost = { id: Date.now(), author: user.firstName, avatar: user.avatar, time: "Just now", text: postInput, likes: 0, isJess: false, cat: postCat, isGraduate: isGraduate };
    setPosts(p => [newPost, ...p]);
    setPostInput("");
    await supabase.functions.invoke("community-post", { body: { action: "insert", author: user.firstName, avatar: user.avatar, text: postInput, cat: postCat, is_jess: false, is_graduate: isGraduate } });
  };

  const NAV_C = [
    { id:"feed",      icon:"users",    label:"Community Feed" },
    { id:"resources", icon:"book",     label:"Resources" },
    { id:"audio",     icon:"mic",      label:"Jess's Voice" },
    { id:"upgrade",   icon:"zap",      label:"Level Up" },
  ];
  const TABS_C = [
    { id:"feed",      icon:"users",  label:"Feed" },
    { id:"resources", icon:"book",   label:"Library" },
    { id:"audio",     icon:"mic",    label:"Jess" },
    { id:"upgrade",   icon:"zap",    label:"Level Up" },
  ];

  const views = {
    feed: (
      <Pg title="Community Feed" sub="The Inner Circle">
        <p style={{ color: B.mid, fontSize: 13, margin: "-12px 0 20px", fontWeight: 300 }}>Real nail techs. Real growth. All in one place.</p>

        {/* Trial banner */}
        {isTrial && (
          <div style={{ background:`${B.amber}12`, border:`1px solid ${B.amber}40`, borderLeft:`3px solid ${B.amber}`, padding:"14px 18px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
            <div>
              <div style={{ fontSize:9, fontWeight:700, color:B.amber, letterSpacing:2, textTransform:"uppercase", marginBottom:3 }}>Free Trial Active</div>
              <div style={{ fontSize:12, color:B.charcoal, fontWeight:300 }}><strong style={{ fontWeight:700 }}>Community Feed Access Only.</strong> Resources and audio check-ins unlock with full membership.</div>
            </div>
            <button onClick={onUpgrade} style={{ padding:"8px 16px", background:B.amber, border:"none", color:B.white, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase", whiteSpace:"nowrap" }}>Upgrade — $27/mo</button>
          </div>
        )}

        {/* Audio check-in teaser */}
        {jessVoice ? (
          <div style={{ background: B.black, borderLeft: `3px solid ${B.blush}`, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => setView("audio")}>
            <div style={{ width: 40, height: 40, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, borderRadius: "50%" }}>
              <Ic n="mic" size={18} color={B.white} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: B.blushLight, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 3px" }}>Jess's Voice — This Week</p>
              <div style={{ color: B.ivory, fontSize: 13, fontWeight: 300 }}>"{jessVoice.text}"</div>
            </div>
            <div style={{ fontSize: 9, color: "#9a8880", flexShrink: 0 }}>Tap to listen →</div>
          </div>
        ) : (
          <div style={{ background: B.black, borderLeft: `3px solid #333`, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, background: "#222", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, borderRadius: "50%" }}>
              <Ic n="mic" size={18} color={B.mid} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#666", letterSpacing: 3, textTransform: "uppercase", margin: "0 0 3px" }}>Jess's Voice — This Week</p>
              <div style={{ color: "#9a8880", fontSize: 12, fontWeight: 300, fontStyle: "italic" }}>Jess hasn't posted this week's note yet — check back soon.</div>
            </div>
          </div>
        )}

        {/* Post composer */}
        <div style={{ background: B.white, border: `1px solid ${B.cloud}`, padding: "18px 20px", marginBottom: 16, borderTop: `3px solid ${B.blush}` }}>
          <div style={{ display: "flex", gap: 2, marginBottom: 12, flexWrap: "nowrap", overflowX: "auto" }}>
            {Object.entries(catLabels).map(([k, v]) => (
              <button key={k} onClick={() => setPostCat(k)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 9px", border: `1px solid ${postCat === k ? catColors[k] : B.cloud}`, background: postCat === k ? `${catColors[k]}12` : "transparent", color: postCat === k ? catColors[k] : B.mid, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: 0.5, transition: "all .15s", whiteSpace: "nowrap", flexShrink: 0 }}>
                <Ic n={catIcons[k]} size={10} color={postCat === k ? catColors[k] : B.mid} sw={1.5} />{v}
              </button>
            ))}
          </div>
          <textarea value={postInput} onChange={e => setPostInput(e.target.value)} placeholder="Share a win, ask a question, drop a tip — this community grows because you show up." rows={4} style={{ width: "100%", padding: "12px 14px", border: `1px solid ${B.cloud}`, fontSize: 14, color: B.black, fontFamily: FONTS.body, outline: "none", resize: "vertical", boxSizing: "border-box", fontWeight: 300, minHeight: 100 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: B.white, borderRadius: "50%" }}>{user.avatar}</div>
              <span style={{ fontSize: 11, color: B.mid, fontWeight: 300 }}>Posting as {user.firstName}</span>
            </div>
            <button onClick={submitPost} disabled={!postInput.trim()} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: postInput.trim() ? B.blush : B.cloud, border: "none", color: B.white, fontSize: 11, fontWeight: 700, cursor: postInput.trim() ? "pointer" : "default", fontFamily: FONTS.body, letterSpacing: "0.08em", textTransform: "uppercase", transition: "background .2s" }}>
              <Ic n="send" size={12} color={B.white} />Post
            </button>
          </div>
        </div>

        {/* Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {posts.length === 0 && (
            <div style={{ padding: "32px 20px", textAlign: "center", color: B.mid, fontSize: 13, fontWeight: 300, border: `1px solid ${B.cloud}`, background: B.white }}>
              The community feed is getting started — be the first to post! 👇
            </div>
          )}
          {posts.map((post, i) => (
            <div key={post.id} style={{ background: B.white, border: `1px solid ${B.cloud}`, padding: "20px 22px", borderTop: post.isJess ? `3px solid ${B.blush}` : `1px solid ${B.cloud}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, background: post.isJess ? B.blush : B.off, border: post.isJess ? "none" : `1px solid ${B.cloud}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: post.isJess ? B.white : B.steel, flexShrink: 0, borderRadius: "50%" }}>{post.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: B.black, letterSpacing: "0.02em", display: "flex", alignItems: "center", gap: 7 }}>
                    {post.author}
                    {post.isJess && <span style={{ fontSize: 8, background: B.blush, color: B.white, padding: "1px 6px", fontWeight: 700, letterSpacing: 1 }}>JESS</span>}
                    {post.isGraduate && !post.isJess && <span style={{ fontSize: 7, background: "#2D7D4E", color: B.white, padding: "1px 6px", fontWeight: 700, letterSpacing: 1 }}>🎓 GRAD</span>}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 8, background: `${catColors[post.cat]}15`, color: catColors[post.cat], padding: "2px 8px", fontWeight: 700, letterSpacing: 1 }}>
                      <Ic n={catIcons[post.cat]} size={9} color={catColors[post.cat]} sw={1.5} />{catLabels[post.cat]}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: B.mid, fontWeight: 300, marginTop: 1 }}>{post.time}</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: B.charcoal, lineHeight: 1.75, margin: "0 0 14px", fontWeight: 300 }}>{post.text}</p>
              {post.audioUrl && (
                <div style={{ background:B.off, border:`1px solid ${B.cloud}`, borderLeft:`3px solid ${B.blush}`, padding:"12px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
                  <Ic n="mic" size={14} color={B.blush} />
                  <audio controls src={post.audioUrl} style={{ flex:1, height:32, outline:"none" }} controlsList="nodownload" />
                </div>
              )}
              {post.imageUrl && (
                <img src={post.imageUrl} alt="Post image" style={{ maxWidth:"100%", maxHeight:300, display:"block", borderRadius:2, marginBottom:14 }} />
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 16, borderTop: `1px solid ${B.cloud}`, paddingTop: 12 }}>
                <button onClick={() => setLikedPosts(p => p.includes(post.id) ? p.filter(x => x !== post.id) : [...p, post.id])} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: likedPosts.includes(post.id) ? B.blush : B.mid, fontFamily: FONTS.body, fontSize: 12, fontWeight: likedPosts.includes(post.id) ? 700 : 300, padding: 0, transition: "color .15s" }}>
                  <Ic n="heart" size={14} color={likedPosts.includes(post.id) ? B.blush : B.mid} sw={likedPosts.includes(post.id) ? 0 : 1.8} />
                  {post.likes + (likedPosts.includes(post.id) ? 1 : 0)}
                </button>
                <span style={{ fontSize: 9, color: B.mid, fontWeight: 300 }}>Reply coming soon</span>
              </div>
            </div>
          ))}
        </div>
      </Pg>
    ),

    resources: isTrial ? <LockedGate section="Resource Library" /> : (
      <Pg title="Resources" sub="Free for Members">
        <p style={{ color: B.mid, fontSize: 13, margin: "-12px 0 20px", fontWeight: 300 }}>Starter tools from Jess — yours as a community member.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 24 }}>
          {resources.length === 0 && <div style={{ padding:"20px", textAlign:"center", color:B.mid, fontSize:12, fontWeight:300, fontStyle:"italic", border:`1px solid ${B.cloud}` }}>Jess will add community resources here — check back soon!</div>}
          {resources.map((r, i) => (
            <div key={i} style={{ background: B.white, border: `1px solid ${B.cloud}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: B.black }}>{r.name}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: B.blush, background: B.blushPale, padding: "2px 7px", letterSpacing: 1 }}>{r.type}</span>
                </div>
                <div style={{ fontSize: 11, color: B.mid, fontWeight: 300 }}>{r.desc}</div>
              </div>
              <a href={r.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", border: `1px solid ${B.cloud}`, background: "none", color: B.steel, fontSize: 9, cursor: "pointer", fontFamily: FONTS.body, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", flexShrink: 0, textDecoration: "none" }}>
                <Ic n="download" size={11} color={B.blush} />Access
              </a>
            </div>
          ))}
        </div>

        {/* Upgrade tease */}
        <div style={{ background: B.black, padding: "24px 24px", borderLeft: `3px solid ${B.blush}` }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: B.blushLight, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 8px" }}>Want the full library?</p>
          <p style={{ color: B.ivory, fontSize: 14, fontWeight: 300, lineHeight: 1.7, margin: "0 0 16px" }}>Mentorship members get 20+ premium resources — pricing calculators, client scripts, social media templates, and more.</p>
          <button onClick={onUpgrade} style={{ display: "flex", alignItems: "center", gap: 7, background: B.blush, border: "none", padding: "10px 20px", color: B.white, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            <Ic n="zap" size={13} color={B.white} />Explore Mentorship
          </button>
        </div>
      </Pg>
    ),

    audio: isTrial ? <LockedGate section="Jess's Voice" /> : (
      <Pg title="Jess's Voice" sub="Weekly Check-In">
        <p style={{ color: B.mid, fontSize: 13, margin: "-12px 0 24px", fontWeight: 300 }}>A personal message from Jess every week — just for this community.</p>
        {jessVoice ? (
          <div style={{ background: B.black, borderLeft: `3px solid ${B.blush}`, padding: "28px 28px", marginBottom: 16 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: B.blushLight, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 6px" }}>This Week</p>
            <h3 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 26, textTransform: "uppercase", color: B.ivory, margin: "0 0 12px", letterSpacing: "-0.5px" }}>"{jessVoice.text}"</h3>
            <audio controls src={jessVoice.audioUrl} style={{ width: "100%", height: 32, outline: "none" }} controlsList="nodownload" />
          </div>
        ) : (
          <div style={{ background: B.black, borderLeft: `3px solid #333`, padding: "28px 28px", marginBottom: 16, textAlign: "center" }}>
            <Ic n="mic" size={32} color={B.mid} />
            <p style={{ color: "#9a8880", fontSize: 13, fontWeight: 300, margin: "12px 0 0", fontStyle: "italic" }}>Jess hasn't posted this week's note yet — check back soon.</p>
          </div>
        )}
      </Pg>
    ),

    upgrade: (
      <Pg title="Level Up" sub="When You're Ready">
        <p style={{ color: B.mid, fontSize: 13, margin: "-12px 0 24px", fontWeight: 300 }}>You've been doing the work. This is what the next level looks like.</p>
        <div style={{ background: B.black, padding: "28px 28px", marginBottom: 16, borderLeft: `3px solid ${B.blush}` }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: B.blushLight, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 8px" }}>From Jess</p>
          <p style={{ color: B.ivory, fontSize: 15, lineHeight: 1.8, fontWeight: 300, fontStyle: "italic", margin: "0 0 6px" }}>"The community is where it starts — and I'm glad you're here. When you feel ready to go deeper, 1:1 is where the real shift happens. No rush. Just know I'm here when you are."</p>
          <span style={{ fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>— Jess</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 2, marginBottom: 20 }}>
          {[
            { name: "Hourly Session", price: "$250", desc: "One focused session. Total clarity. No commitment.", icon: "zap" },
            { name: "30-Day Intensive", price: "$1,120", desc: "Real momentum in one month. Built around your goals.", icon: "calendar" },
            { name: "3-Month Elite", price: "$3,360", desc: "Complete transformation. The full Jess experience.", icon: "award" },
          ].map(({ name, price, desc, icon }) => (
            <div key={name} style={{ background: B.white, border: `1px solid ${B.cloud}`, padding: "24px 20px", textAlign: "center" }}>
              <div style={{ width: 40, height: 40, background: B.blushPale, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <Ic n={icon} size={18} color={B.blush} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: B.steel, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{name}</div>
              <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 36, color: B.black, lineHeight: 1, marginBottom: 10 }}>{price}</div>
              <div style={{ fontSize: 12, color: B.mid, fontWeight: 300, lineHeight: 1.5, marginBottom: 18 }}>{desc}</div>
              <button onClick={onUpgrade} style={{ width: "100%", padding: "10px", background: B.black, border: "none", color: B.white, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: "0.08em", textTransform: "uppercase" }}>Book Discovery Call</button>
            </div>
          ))}
        </div>
        <div style={{ background: B.blushPale, border: `1px solid ${B.blushMid}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: B.blush, marginBottom: 3 }}>Discovery call is free.</div>
            <div style={{ fontSize: 12, color: B.steel, fontWeight: 300 }}>20 minutes. No pressure. Jess will help you pick the right path.</div>
          </div>
          <button onClick={onUpgrade} style={{ display: "flex", alignItems: "center", gap: 7, background: B.blush, border: "none", padding: "10px 20px", color: B.white, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            <Ic n="calendar" size={12} color={B.white} />Book Free Call
          </button>
        </div>
      </Pg>
    ),
  };

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", fontFamily: FONTS.body, background: B.off, position: "relative" }}>

      {useSidebar && (
        <div style={{ width: 220, background: B.white, borderRight: `1px solid ${B.cloud}`, display: "flex", flexDirection: "column", height: "100%", flexShrink: 0 }}>
          <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${B.cloud}` }}><Logo height={isMobile ? 50 : 60} /></div>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${B.cloud}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: B.success, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: B.white, flexShrink: 0 }}>{user.avatar}</div>
            <div><div style={{ color: B.ink, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{user.firstName}</div><div style={{ fontSize: 8, color: B.success, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Community Member</div></div>
          </div>
          <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
            {NAV_C.map(({ id, icon, label }) => {
              const on = view === id;
              const isUpgrade = id === "upgrade";
              return <button key={id} onClick={() => setView(id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "none", background: on ? (isUpgrade ? `${B.blush}15` : B.blushPale) : "transparent", color: on ? (isUpgrade ? B.blush : B.blush) : isUpgrade ? B.blush : B.steel, marginBottom: 2, fontFamily: FONTS.body, fontSize: 12, fontWeight: on ? 700 : isUpgrade ? 600 : 400, textAlign: "left", cursor: "pointer", borderLeft: `3px solid ${on ? B.blush : "transparent"}`, transition: "all .15s", letterSpacing: "0.03em", borderRadius: "0 6px 6px 0" }}><Ic n={icon} size={14} color={on || isUpgrade ? B.blush : B.mid} />{label}</button>;
            })}
          </nav>
          <div style={{ padding: "10px 10px", borderTop: `1px solid ${B.cloud}` }}>
            <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: "none", background: "transparent", color: B.mid, fontFamily: FONTS.body, fontSize: 11, cursor: "pointer", letterSpacing: "0.05em" }}><Ic n="logout" size={13} color={B.mid} />Sign out</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <div style={{ position: "sticky", top: 0, background: B.white, borderBottom: `1px solid ${B.cloud}`, padding: "11px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 50, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: B.mid, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{NAV_C.find(n => n.id === view)?.label || "Community"}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setView("upgrade")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: B.blush, border: "none", color: B.white, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: 1.5, textTransform: "uppercase" }}>
              <Ic n="zap" size={10} color={B.white} />Upgrade
            </button>
            <div style={{ width: 26, height: 26, background: B.success, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: B.white }}>{user.avatar}</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>{views[view] || views.feed}</div>
      </div>

      {!useSidebar && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: B.white, borderTop: `1px solid ${B.cloud}`, display: "flex", paddingBottom: "env(safe-area-inset-bottom)", zIndex: 100 }}>
          {TABS_C.map(({ id, icon, label }) => {
            const on = view === id;
            const isUpgrade = id === "upgrade";
            return <button key={id} onClick={() => setView(id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "9px 2px 7px", border: "none", background: "transparent", color: on || isUpgrade ? B.blush : B.mid, fontFamily: FONTS.body, fontSize: 7, fontWeight: on ? 700 : isUpgrade ? 600 : 300, letterSpacing: 1, textTransform: "uppercase" }}><Ic n={icon} size={18} color={on || isUpgrade ? B.blush : B.mid} />{label}</button>;
          })}
          <button onClick={onLogout} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "9px 2px 7px", border: "none", background: "transparent", color: B.mid, fontFamily: FONTS.body, fontSize: 7, fontWeight: 300, letterSpacing: 1, textTransform: "uppercase" }}>
            <Ic n="logout" size={18} color={B.mid} />Out
          </button>
        </nav>
      )}
      {showGradWelcome && <GradWelcomeModal user={user} isMobile={isMobile} onDismiss={() => {
        try { localStorage.setItem(gradWelcomeKey, "1"); } catch {}
        setShowGradWelcome(false);
        // Log them out so they can sign back in as community member
        setTimeout(() => onLogout(), 300);
      }} />}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
════════════════════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════════════════════════
   INVOICES VIEW — stable component outside AdminDashboard
════════════════════════════════════════════════════════════════════════ */
const InvoicesView = () => {
  const { isMobile } = useLayout();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [preview, setPreview] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("active");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ to:"", email:"", tier:"Hourly Session", amount:"250", note:"" });
  const tiers = [["Hourly Session","250"],["30-Day Intensive","1120"],["3-Month Elite","3360"],["Community","27"],["Custom",""]];
  const statusColor = { paid: B.success, pending: B.amber, draft: B.mid, declined: B.mid };
  const statusBg    = { paid: B.successPale, pending: B.amberPale, draft: B.off, declined: B.off };

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-invoice', { body: { action: 'get_invoices' } });
      if (error) throw error;
      setInvoices(data?.invoices || []);
    } catch (e) {
      showToast("Failed to load invoices", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const sendInvoice = async () => {
    if (!form.to.trim() || !form.email.trim() || !form.amount) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-invoice', {
        body: {
          action: 'create_invoice',
          to_name: form.to,
          mentee_email: form.email,
          tier: form.tier,
          amount: Number(form.amount),
          note: form.note,
        }
      });
      if (error) throw error;
      showToast(`Invoice sent! Payment link created.`);
      setForm({ to:"", email:"", tier:"Hourly Session", amount:"250", note:"" });
      setShowNew(false);
      setPreview(false);
      await fetchInvoices();
    } catch (e) {
      showToast(e.message || "Failed to create invoice", true);
    } finally {
      setSending(false);
    }
  };

  const markPaid = async (id) => {
    try {
      const { error } = await supabase.functions.invoke('stripe-invoice', { body: { action: 'mark_paid', id } });
      if (error) throw error;
      setInvoices(p => p.map(i => i.id === id ? { ...i, status: "paid" } : i));
      showToast("Marked as paid!");
    } catch (e) {
      showToast("Failed to update invoice", true);
    }
  };

  const declineInvoice = async (id) => {
    try {
      const { error } = await supabase.functions.invoke('stripe-invoice', { body: { action: 'decline_invoice', id } });
      if (error) throw error;
      setInvoices(p => p.map(i => i.id === id ? { ...i, status: "declined" } : i));
      showToast("Invoice moved to declined.");
    } catch (e) {
      showToast("Failed to decline invoice", true);
    }
  };

  const deleteInvoice = async (id) => {
    try {
      const { error } = await supabase.functions.invoke('stripe-invoice', { body: { action: 'delete_invoice', id } });
      if (error) throw error;
      setInvoices(p => p.filter(i => i.id !== id));
      setConfirmDelete(null);
      showToast("Invoice deleted.");
    } catch (e) {
      showToast("Failed to delete invoice", true);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
  };

  const formatAmount = (cents) => {
    if (!cents) return "$0";
    return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 });
  };

  const closeNew = () => { setShowNew(false); setPreview(false); setForm({ to:"", email:"", tier:"Hourly Session", amount:"250", note:"" }); };

  /* InvoicesView uses its own Pg-like wrapper since Pg is scoped to AdminDashboard */
  return (
    <div style={{ padding: isMobile ? "20px 18px 40px" : "28px 32px", maxWidth: 1020, width: "100%", position:"relative" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background: toast.isError ? B.black : B.success, color:B.white, padding:"10px 20px", fontSize:12, fontWeight:700, letterSpacing:0.5, zIndex:9999, borderRadius:2, boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
        <div>
          <p style={{ fontSize:9, fontWeight:700, color:B.blush, letterSpacing:3, textTransform:"uppercase", margin:"0 0 8px" }}>Payment Requests</p>
          <h1 style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:isMobile?32:44, textTransform:"uppercase", color:B.black, margin:0, lineHeight:0.95, letterSpacing:"-0.5px" }}>Invoices</h1>
        </div>
        <button onClick={() => { setShowNew(s => !s); setPreview(false); }} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 16px", background:B.blush, border:"none", color:B.white, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:"0.08em", textTransform:"uppercase", flexShrink:0 }}>
          <Ic n="send" size={12} color={B.white} />New Invoice
        </button>
      </div>

      <p style={{ color:B.mid, fontSize:13, margin:"-14px 0 20px", fontWeight:300 }}>Request payment or send an invoice to any mentee or lead. A Stripe payment link is created automatically.</p>

      {showNew && !preview && (
        <div style={{ background:B.white, border:`1px solid ${B.cloud}`, borderRadius:4, marginBottom:16, padding:"20px 20px", borderTop:`3px solid ${B.blush}` }}>
          <p style={{ fontSize:9, fontWeight:700, color:B.blush, letterSpacing:3, textTransform:"uppercase", margin:"0 0 14px" }}>New Payment Request</p>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10, marginBottom:10 }}>
            {[["Name","to","text","e.g. Client Name"],["Email","email","email","e.g. client@email.com"]].map(([lbl,key,type,ph]) => (
              <div key={key}>
                <div style={{ fontSize:10, fontWeight:700, color:B.steel, letterSpacing:1, textTransform:"uppercase", marginBottom:5 }}>{lbl}</div>
                <input type={type} value={form[key]} onChange={e => setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={{ width:"100%", padding:"10px 12px", border:`1px solid ${B.cloud}`, fontSize:13, fontFamily:FONTS.body, outline:"none", color:B.black, boxSizing:"border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:B.steel, letterSpacing:1, textTransform:"uppercase", marginBottom:5 }}>Service</div>
              <select value={form.tier} onChange={e => { const t=tiers.find(([n])=>n===e.target.value); setForm(p=>({...p,tier:e.target.value,amount:t&&t[1]?t[1]:p.amount})); }} style={{ width:"100%", padding:"10px 12px", border:`1px solid ${B.cloud}`, fontSize:13, fontFamily:FONTS.body, outline:"none", color:B.black, background:B.white, boxSizing:"border-box" }}>
                {tiers.map(([n]) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:B.steel, letterSpacing:1, textTransform:"uppercase", marginBottom:5 }}>Amount ($)</div>
              <input type="number" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} style={{ width:"100%", padding:"10px 12px", border:`1px solid ${B.cloud}`, fontSize:13, fontFamily:FONTS.body, outline:"none", color:B.black, boxSizing:"border-box" }} />
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:B.steel, letterSpacing:1, textTransform:"uppercase", marginBottom:5 }}>Note (optional)</div>
            <textarea value={form.note} onChange={e => setForm(p=>({...p,note:e.target.value}))} placeholder="e.g. Discovery call follow-up — 3-Month Elite program" rows={2} style={{ width:"100%", padding:"10px 12px", border:`1px solid ${B.cloud}`, fontSize:13, fontFamily:FONTS.body, outline:"none", resize:"vertical", color:B.black, boxSizing:"border-box" }} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="blush" onClick={() => { if (!form.to.trim()||!form.email.trim()||!form.amount) return; setPreview(true); }} disabled={!form.to.trim()||!form.email.trim()||!form.amount}>
              Preview Invoice
            </Btn>
            <Btn variant="ghost" onClick={closeNew}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {showNew && preview && (
        <div style={{ background:B.white, border:`1px solid ${B.cloud}`, borderRadius:4, marginBottom:16, borderTop:`3px solid ${B.blush}` }}>
          {/* Preview header */}
          <div style={{ padding:"14px 20px", borderBottom:`1px solid ${B.cloud}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontSize:9, fontWeight:700, color:B.blush, letterSpacing:3, textTransform:"uppercase", margin:0 }}>Invoice Preview</p>
            <button onClick={() => setPreview(false)} style={{ fontSize:10, fontWeight:700, color:B.steel, background:"none", border:"none", cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase" }}>← Edit</button>
          </div>

          {/* Mock invoice card */}
          <div style={{ padding: isMobile ? "24px 20px" : "32px 40px" }}>
            {/* From / To */}
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:isMobile?16:20, marginBottom:28 }}>
              <div>
                <div style={{ fontSize:9, fontWeight:700, color:B.steel, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>From</div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <img src="https://eytysuurxsfsbimgpion.supabase.co/storage/v1/object/public/Assets/SJTN_Favicon.png" alt="SJTN" style={{ width:36, height:36, objectFit:"contain", flexShrink:0 }} onError={e => { e.target.style.display="none"; }} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:B.black }}>Jess — SayJessToNails</div>
                    <div style={{ fontSize:11, color:B.mid }}>info@sayjesstonails.com</div>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize:9, fontWeight:700, color:B.steel, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>To</div>
                <div style={{ fontSize:13, fontWeight:700, color:B.black }}>{form.to}</div>
                <div style={{ fontSize:11, color:B.mid }}>{form.email}</div>
              </div>
            </div>

            {/* Line item */}
            {(() => {
              const tierDescriptions = {
                "Hourly Session": "One-on-one mentorship session with Jess — personalized coaching, Q&A, and strategy.",
                "30-Day Intensive": "30 days of focused mentorship — daily access, custom action plan, and accountability check-ins.",
                "3-Month Elite": "Full 3-month elite program — deep-dive strategy, weekly calls, community access, and ongoing support.",
                "Community": "Monthly SayJessToNails community membership — resources, group coaching, and peer support.",
              };
              const desc = tierDescriptions[form.tier] || null;
              return (
                <div style={{ border:`1px solid ${B.cloud}`, borderRadius:2, overflow:"hidden", marginBottom:20 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, padding:"10px 16px", background:B.off, borderBottom:`1px solid ${B.cloud}` }}>
                    <div style={{ fontSize:9, fontWeight:700, color:B.steel, letterSpacing:1.5, textTransform:"uppercase" }}>Description</div>
                    <div style={{ fontSize:9, fontWeight:700, color:B.steel, letterSpacing:1.5, textTransform:"uppercase" }}>Amount</div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, padding:"14px 16px" }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:B.black }}>{form.tier}</div>
                      {desc && <div style={{ fontSize:11, color:B.steel, marginTop:3 }}>{desc}</div>}
                      {form.note && <div style={{ fontSize:11, color:B.mid, marginTop:4, fontStyle:"italic" }}>{form.note}</div>}
                    </div>
                    <div style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:18, color:B.black, whiteSpace:"nowrap" }}>${Number(form.amount).toLocaleString()}</div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, padding:"12px 16px", background:B.off, borderTop:`1px solid ${B.cloud}` }}>
                    <div style={{ fontSize:10, fontWeight:700, color:B.black, letterSpacing:1, textTransform:"uppercase" }}>Total Due</div>
                    <div style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:20, color:B.blush }}>${Number(form.amount).toLocaleString()}</div>
                  </div>
                </div>
              );
            })()}

            <div style={{ fontSize:11, color:B.mid, marginBottom:24 }}>A Stripe payment link will be generated and saved. You can share it with {form.to} directly.</div>

            <div style={{ display:"flex", flexDirection:isMobile?"column":"row", gap:6 }}>
              <Btn variant="blush" icon="send" onClick={sendInvoice} disabled={sending}>
                {sending ? "Creating…" : "Confirm & Create Invoice"}
              </Btn>
              <div style={{ display:"flex", gap:6 }}>
                <Btn variant="ghost" onClick={() => setPreview(false)}>← Edit</Btn>
                <Btn variant="ghost" onClick={closeNew}>Cancel</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary tiles */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:2, marginBottom:20 }}>
        {[
          ["Total Sent", invoices.filter(i=>i.status!=="declined").length, false, B.cloud],
          ["Paid", invoices.filter(i=>i.status==="paid").length, false, B.success],
          ["Pending", invoices.filter(i=>i.status==="pending").length, true, B.amber],
          ["Declined", invoices.filter(i=>i.status==="declined").length, false, B.mid],
        ].map(([l,v,warn,accent]) => (
          <div key={l} style={{ padding:"16px 18px", border:`1px solid ${B.cloud}`, background:B.white, borderTop:`3px solid ${warn&&v>0?B.amber:accent}` }}>
            <div style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:32, color:B.black, lineHeight:1 }}>{loading ? "—" : v}</div>
            <div style={{ fontSize:9, fontWeight:700, color:B.mid, marginTop:5, letterSpacing:1.5, textTransform:"uppercase" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:2, marginBottom:16 }}>
        {[["active","Active"],["declined","Declined"],["all","All"]].map(([val,label]) => (
          <button key={val} onClick={() => setFilter(val)} style={{ padding:"7px 16px", fontSize:9, fontWeight:700, letterSpacing:1, textTransform:"uppercase", fontFamily:FONTS.body, cursor:"pointer", border:`1px solid ${filter===val?B.blush:B.cloud}`, background:filter===val?B.blush:"transparent", color:filter===val?B.white:B.steel, transition:"all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9998, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:B.white, padding:"28px 32px", maxWidth:380, width:"90%", borderTop:`3px solid ${B.black}` }}>
            <p style={{ fontSize:9, fontWeight:700, color:B.mid, letterSpacing:2, textTransform:"uppercase", margin:"0 0 10px" }}>Confirm Delete</p>
            <p style={{ fontSize:14, fontWeight:700, color:B.black, margin:"0 0 8px" }}>Permanently delete this invoice?</p>
            <p style={{ fontSize:12, color:B.mid, margin:"0 0 22px", lineHeight:1.5 }}>This cannot be undone. If you may need to revisit it, use <strong>Decline</strong> instead.</p>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => deleteInvoice(confirmDelete)} style={{ padding:"9px 20px", background:B.black, border:"none", color:B.white, fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase" }}>Delete Forever</button>
              <button onClick={() => setConfirmDelete(null)} style={{ padding:"9px 20px", background:"none", border:`1px solid ${B.cloud}`, color:B.steel, fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice list */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"40px 0", color:B.mid, fontSize:13 }}>Loading invoices…</div>
      ) : (
        (() => {
          const filtered = invoices.filter(inv => {
            if (filter === "active") return inv.status !== "declined";
            if (filter === "declined") return inv.status === "declined";
            return true;
          });
          if (filtered.length === 0) return (
            <div style={{ textAlign:"center", padding:"40px 0", color:B.mid, fontSize:13 }}>
              {filter === "declined" ? "No declined invoices." : filter === "active" ? "No active invoices yet. Create one above." : "No invoices yet."}
            </div>
          );
          return (
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              {filtered.map((inv) => (
                <div key={inv.id} style={{ background:B.white, border:`1px solid ${B.cloud}`, borderRadius:4, padding:"16px 18px", opacity: inv.status==="declined" ? 0.75 : 1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:36, height:36, background: inv.status==="declined" ? B.off : B.blushPale, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color: inv.status==="declined" ? B.mid : B.blush, flexShrink:0 }}>
                        {(inv.to_name||"?").split(" ").map(w=>w[0]).join("").toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:B.black }}>{inv.to_name}</div>
                        <div style={{ fontSize:10, color:B.mid, fontWeight:300 }}>{inv.mentee_email}</div>
                        <div style={{ fontSize:10, color:B.steel, fontWeight:300, marginTop:2 }}>{inv.tier} · {formatDate(inv.created_at)}</div>
                        {inv.note && <div style={{ fontSize:10, color:B.steel, fontWeight:300, marginTop:2, fontStyle:"italic" }}>{inv.note}</div>}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:22, color: inv.status==="declined" ? B.mid : B.black }}>{formatAmount(inv.amount)}</div>
                      <span style={{ fontSize:8, fontWeight:700, padding:"3px 8px", letterSpacing:1, textTransform:"uppercase", color:statusColor[inv.status]||B.mid, background:statusBg[inv.status]||B.off }}>{inv.status}</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, marginTop:12, flexWrap:"wrap" }}>
                    {inv.stripe_payment_link && inv.status !== "declined" && (
                      <a href={inv.stripe_payment_link} target="_blank" rel="noreferrer" style={{ padding:"7px 14px", background:B.blush, border:"none", color:B.white, fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase", textDecoration:"none", display:"inline-block" }}>
                        Copy Link ↗
                      </a>
                    )}
                    {inv.status === "pending" && (
                      <button onClick={() => markPaid(inv.id)} style={{ padding:"7px 14px", background:B.success, border:"none", color:B.white, fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase" }}>Mark Paid</button>
                    )}
                    {inv.status === "pending" && (
                      <button onClick={() => declineInvoice(inv.id)} style={{ padding:"7px 14px", background:"none", border:`1px solid ${B.cloud}`, color:B.steel, fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase" }}>Decline</button>
                    )}
                    {inv.status === "declined" && (
                      <button onClick={() => declineInvoice(inv.id)} style={{ display:"none" }} />
                    )}
                    <button onClick={() => setConfirmDelete(inv.id)} style={{ padding:"7px 14px", background:"none", border:`1px solid ${B.cloud}`, color:B.mid, fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   APPLICATIONS VIEW — community membership requests
════════════════════════════════════════════════════════════════════════ */
const ApplicationsView = () => {
  const { isMobile } = useLayout();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      const { data } = await supabase.functions.invoke('assign-task', { body: { action: 'get_applications' } });
      if (data?.applications) {
        setApplications(data.applications.map(a => ({
          id: a.id,
          firstName: a.first_name,
          email: a.email,
          q1: a.q1,
          q2: a.q2,
          q3: a.q3,
          status: a.status || "pending",
          date: new Date(a.applied_at).toLocaleDateString("en-US", { month:"short", day:"numeric" }),
          trialStart: a.trial_start ? new Date(a.trial_start).toLocaleDateString("en-US", { month:"short", day:"numeric" }) : null,
          trialEnd: a.trial_end ? new Date(a.trial_end).toLocaleDateString("en-US", { month:"short", day:"numeric" }) : null,
          paid: a.paid || false,
        })));
      }
      setLoading(false);
    };
    fetchApplications();
  }, []);

  const approve = async (id) => {
    const trialStart = new Date();
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await supabase.functions.invoke('assign-task', { body: { action: 'update_application', id,
      status: "approved",
      trial_start: trialStart.toISOString(),
      trial_end: trialEnd.toISOString()
    } });
    setApplications(p => p.map(a => a.id === id ? { ...a, status:"approved", trialStart: trialStart.toLocaleDateString("en-US",{month:"short",day:"numeric"}), trialEnd: trialEnd.toLocaleDateString("en-US",{month:"short",day:"numeric"}) } : a));
  };

  const decline = async (id) => {
    await supabase.functions.invoke('assign-task', { body: { action: 'update_application', id, status: 'declined' } });
    setApplications(p => p.map(a => a.id === id ? { ...a, status:"declined" } : a));
  };

  const markPaid = async (id) => {
    await supabase.functions.invoke('assign-task', { body: { action: 'update_application', id, paid: true } });
    setApplications(p => p.map(a => a.id === id ? { ...a, paid:true } : a));
  };

  const statusColor = { pending:B.amber, approved:B.success, declined:B.mid };
  const statusBg = { pending:B.amberPale, approved:B.successPale, declined:B.off };

  const filtered = filter === "all" ? applications : applications.filter(a => a.status === filter);
  const pending = applications.filter(a => a.status === "pending").length;
  const onTrial = applications.filter(a => a.status === "approved" && !a.paid).length;
  const paid = applications.filter(a => a.paid).length;

  return (
    <div style={{ padding: isMobile ? "20px 18px 40px" : "28px 32px", maxWidth:1020, width:"100%" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22, flexWrap:"wrap", gap:12 }}>
        <div>
          <p style={{ fontSize:9, fontWeight:700, color:B.blush, letterSpacing:3, textTransform:"uppercase", margin:"0 0 8px" }}>Community</p>
          <h1 style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:isMobile?32:44, textTransform:"uppercase", color:B.black, margin:0, lineHeight:0.95, letterSpacing:"-0.5px" }}>Applications</h1>
        </div>
      </div>

      <p style={{ color:B.mid, fontSize:13, margin:"-14px 0 20px", fontWeight:300 }}>Review community membership requests. Approve to start their 7-day free trial.</p>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)", gap:2, marginBottom:20 }}>
        {[["Pending Review", pending, pending>0], ["On Free Trial", onTrial, false], ["Paid Members", paid, false]].map(([l,v,warn]) => (
          <div key={l} style={{ padding:"16px 18px", border:`1px solid ${B.cloud}`, background:B.white, borderTop:`3px solid ${warn&&v>0?B.amber:l==="Paid Members"?B.success:B.cloud}` }}>
            <div style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:32, color:B.black, lineHeight:1 }}>{v}</div>
            <div style={{ fontSize:9, fontWeight:700, color:B.mid, marginTop:5, letterSpacing:1.5, textTransform:"uppercase" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:2, marginBottom:16, flexWrap:"wrap" }}>
        {[["all","All"],["pending","Pending"],["approved","Approved"],["declined","Declined"]].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding:"7px 14px", border:`1px solid ${filter===k?B.blush:B.cloud}`, background:filter===k?`${B.blush}12`:"transparent", color:filter===k?B.blush:B.mid, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase" }}>{l}{k==="pending"&&pending>0?` (${pending})`:""}</button>
        ))}
      </div>

      {/* Application cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        {filtered.map(app => (
          <div key={app.id} style={{ background:B.white, border:`1px solid ${B.cloud}`, borderLeft:`3px solid ${statusColor[app.status]}` }}>
            <div style={{ padding:"16px 18px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10, cursor:"pointer" }} onClick={() => setExpanded(expanded===app.id?null:app.id)}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:40, height:40, background:B.blushPale, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:B.blush, flexShrink:0 }}>{app.firstName.split(" ").map(w=>w[0]).join("")}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:B.black }}>{app.firstName}</div>
                  <div style={{ fontSize:10, color:B.mid, fontWeight:300 }}>{app.email}</div>
                  <div style={{ fontSize:9, color:B.mid, fontWeight:300, marginTop:2 }}>Applied {app.date} · {app.q3}</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {app.paid && <span style={{ fontSize:8, fontWeight:700, padding:"3px 8px", background:B.successPale, color:B.success, letterSpacing:1, textTransform:"uppercase" }}>PAID</span>}
                {app.status==="approved"&&!app.paid&&app.trialEnd && <span style={{ fontSize:8, fontWeight:700, padding:"3px 8px", background:B.amberPale, color:B.amber, letterSpacing:1, textTransform:"uppercase" }}>TRIAL ENDS {app.trialEnd}</span>}
                <span style={{ fontSize:8, fontWeight:700, padding:"3px 8px", letterSpacing:1, textTransform:"uppercase", color:statusColor[app.status], background:statusBg[app.status] }}>{app.status}</span>
                <Ic n={expanded===app.id?"close":"arrow"} size={14} color={B.mid} />
              </div>
            </div>

            {expanded === app.id && (
              <div style={{ padding:"0 18px 18px", borderTop:`1px solid ${B.cloud}` }}>
                <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12, marginTop:16, marginBottom:16 }}>
                  {[["What brings you to this community?", app.q1],["What do you hope to get out of it?", app.q2]].map(([q,a]) => (
                    <div key={q} style={{ background:B.off, padding:"14px 16px", border:`1px solid ${B.cloud}` }}>
                      <div style={{ fontSize:9, fontWeight:700, color:B.blush, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>{q}</div>
                      <div style={{ fontSize:13, color:B.charcoal, fontWeight:300, lineHeight:1.6 }}>{a}</div>
                    </div>
                  ))}
                </div>

                {app.status === "pending" && (
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => approve(app.id)} style={{ padding:"9px 20px", background:B.success, border:"none", color:B.white, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase" }}>✓ Approve — Start Trial</button>
                    <button onClick={() => decline(app.id)} style={{ padding:"9px 20px", background:"none", border:`1px solid ${B.cloud}`, color:B.mid, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase" }}>Decline</button>
                  </div>
                )}
                {app.status === "approved" && !app.paid && (
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <button onClick={() => markPaid(app.id)} style={{ padding:"9px 20px", background:B.blush, border:"none", color:B.white, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase" }}>Mark as Paid Member</button>
                    <span style={{ fontSize:11, color:B.mid, fontWeight:300 }}>Trial: {app.trialStart} → {app.trialEnd}</span>
                  </div>
                )}
                {app.status === "approved" && app.paid && (
                  <div style={{ fontSize:12, color:B.success, fontWeight:700 }}>✓ Active paying member since {app.trialStart}</div>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && <div style={{ padding:"40px 20px", textAlign:"center", color:B.mid, fontSize:13, fontWeight:300 }}>Loading applications…</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding:"40px 20px", textAlign:"center", color:B.mid, fontSize:13, fontWeight:300 }}>No applications in this category yet.</div>
        )}
      </div>
    </div>
  );
};

/* ── Community Voice Recorder — standalone to prevent remount on state change ── */
const CommunityVoiceRecorder = ({ onPost }) => {
  const titleRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const fmtTime = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" :
                       MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e) {
      alert("Microphone access is required. Please allow microphone access and try again.");
    }
  };

  const stopRec = () => new Promise(resolve => {
    const mr = mediaRecorderRef.current;
    if (!mr) { resolve(null); return; }
    mr.onstop = async () => {
      clearInterval(timerRef.current);
      setRecording(false);
      const mimeType = mr.mimeType || "audio/webm";
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      const fileName = `voice-${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from("voice-notes").upload(fileName, blob, { contentType: mimeType });
      if (error) { alert("Failed to upload voice note."); resolve(null); return; }
      const { data: urlData } = supabase.storage.from("voice-notes").getPublicUrl(fileName);
      resolve(urlData.publicUrl);
      mr.stream.getTracks().forEach(t => t.stop());
    };
    mr.stop();
  });

  const handleClick = async () => {
    if (!recording) {
      startRec();
    } else {
      const audioUrl = await stopRec();
      if (!audioUrl) return;
      const title = titleRef.current?.value?.trim() || "This week's voice note from Jess";
      if (titleRef.current) titleRef.current.value = "";
      onPost(title, audioUrl);
    }
  };

  return (
    <div style={{ background:"#0D0D0D", borderLeft:"3px solid #C4607A", padding:"18px 20px", marginBottom:16 }}>
      <p style={{ fontSize:9, fontWeight:700, color:"#E8A0B0", letterSpacing:3, textTransform:"uppercase", margin:"0 0 12px" }}>Jess's Voice — This Week</p>
      <input
        ref={titleRef}
        type="text"
        defaultValue=""
        placeholder="Give this week's note a title..."
        style={{ width:"100%", padding:"10px 12px", background:"#1a1a1a", border:`1px solid ${recording ? "#C4607A" : "#333"}`, color:"#FAF6F1", fontSize:13, fontFamily:"'DM Sans', 'Helvetica Neue', sans-serif", outline:"none", boxSizing:"border-box", marginBottom:12 }}
      />
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={handleClick} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", background: recording ? "#C4607A" : "#333", border:"none", color:"#FAF6F1", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans', 'Helvetica Neue', sans-serif", letterSpacing:1, textTransform:"uppercase" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          {recording ? `Stop & Post — ${fmtTime(recordingTime)}` : "Start Recording"}
        </button>
        {recording && (
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#C4607A" }} />
            <span style={{ fontSize:11, color:"#E8A0B0", fontWeight:300 }}>Recording...</span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Invite Graduate Form — invite past mentees directly to community with grad badge ── */
const InviteGraduateForm = () => {
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    const name = nameRef.current?.value?.trim();
    const email = emailRef.current?.value?.trim();
    if (!name || !email) { alert("Name and email are required."); return; }
    setBusy(true);
    try {
      // Invite as community user
      const { error } = await supabase.functions.invoke('invite-mentee', {
        body: { email, first_name: name, tier: "Community Graduate", role: "community" }
      });
      if (error) throw new Error(error.message);
      // Mark as graduated in mentee_profiles
      await supabase.functions.invoke('assign-task', { body: { action: 'upsert_profile', profile: {
        email: email.toLowerCase(),
        first_name: name,
        tier: "Community Graduate",
        graduated: true,
        start_date: new Date().toISOString().split("T")[0], // ISO format for reliable date math
        sessions_completed: 0, sessions_total: 0, days_remaining: 0, total_days: 0
      } } });
      if (nameRef.current) nameRef.current.value = "";
      if (emailRef.current) emailRef.current.value = "";
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
    setBusy(false);
  };

  return (
    <div style={{ background:"#f0faf4", border:`1px solid #2D7D4E40`, borderLeft:`3px solid #2D7D4E`, padding:"18px 20px", marginBottom:20 }}>
      <div style={{ fontSize:9, fontWeight:700, color:"#2D7D4E", letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>Invite Past Mentee as Graduate</div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-end" }}>
        <input ref={nameRef} type="text" placeholder="First name" style={{ flex:1, minWidth:120, padding:"9px 12px", border:`1px solid #2D7D4E60`, fontSize:13, fontFamily:"'DM Sans', sans-serif", outline:"none" }} />
        <input ref={emailRef} type="email" placeholder="Email address" style={{ flex:2, minWidth:180, padding:"9px 12px", border:`1px solid #2D7D4E60`, fontSize:13, fontFamily:"'DM Sans', sans-serif", outline:"none" }} />
        <button onClick={submit} disabled={busy} style={{ padding:"9px 18px", background: done ? "#2D7D4E" : "#2D7D4E", border:"none", color:"#fff", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans', sans-serif", letterSpacing:1, textTransform:"uppercase", opacity: busy ? 0.6 : 1 }}>
          {done ? "✓ Invited!" : busy ? "Sending…" : "🎓 Invite as Graduate"}
        </button>
      </div>
      <div style={{ fontSize:10, color:"#2D7D4E", marginTop:8, fontWeight:300 }}>They'll receive a community invite email and get the 🎓 Graduate badge on their posts.</div>
    </div>
  );
};

/* ── Invite Mentee Form — standalone component to prevent remount on state change ── */
const InviteForm = ({ isMobile }) => {
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const tierRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const inp = { width:"100%", padding:"10px 12px", border:"1px solid #E8E8E8", fontSize:16, fontFamily:"'DM Sans', 'Helvetica Neue', sans-serif", outline:"none", color:"#0D0D0D", boxSizing:"border-box", borderRadius:0, WebkitAppearance:"none" };

  const send = async () => {
    const firstName = nameRef.current?.value?.trim();
    const email = emailRef.current?.value?.trim();
    const tier = tierRef.current?.value || "Hourly Session";
    if (!firstName) { alert("Please enter the mentee's first name."); nameRef.current?.focus(); return; }
    if (!email) { alert("Please enter an email address."); emailRef.current?.focus(); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-mentee', {
        body: { email, tier, first_name: firstName }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Store profile with correct total_days and start_date so days remaining calculates correctly
      const totalDays = tier.includes("Elite") ? 90 : tier.includes("Intensive") ? 30 : 1;
      const sessionsTotal = tier.includes("Elite") ? 6 : tier.includes("Intensive") ? 2 : 1;
      await supabase.functions.invoke('assign-task', { body: { action: 'upsert_profile', profile: {
        email: email.toLowerCase(),
        first_name: firstName,
        tier,
        tier_key: tier.includes("Elite") ? "elite" : tier.includes("Intensive") ? "intensive" : "hourly",
        start_date: new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }),
        total_days: totalDays,
        days_remaining: totalDays,
        sessions_total: sessionsTotal,
        sessions_completed: 0,
      } } });
      if (nameRef.current) nameRef.current.value = "";
      if (emailRef.current) emailRef.current.value = "";
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
    setBusy(false);
  };

  return (
    <div style={{ background:"#FFFFFF", border:"1px solid #E8E8E8", borderTop:"3px solid #C4607A", padding:"20px", marginBottom:20 }}>
      <p style={{ fontSize:9, fontWeight:700, color:"#C4607A", letterSpacing:3, textTransform:"uppercase", margin:"0 0 14px" }}>Invite a Mentee</p>
      {sent && <div style={{ background:"#E8F5EE", border:"1px solid #2D7D4E", borderLeft:"3px solid #2D7D4E", padding:"10px 14px", marginBottom:14, fontSize:12, color:"#2D7D4E", fontWeight:500 }}>Invite sent successfully. They will receive an email to set their password.</div>}
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <div style={{ fontSize:9, fontWeight:700, color:"#4A4A4A", letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>First Name</div>
          <input ref={nameRef} type="text" defaultValue="" placeholder="e.g. Taylor" style={inp} />
        </div>
        <div>
          <div style={{ fontSize:9, fontWeight:700, color:"#4A4A4A", letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>Email Address</div>
          <input ref={emailRef} type="email" defaultValue="" placeholder="mentee@email.com" style={inp} />
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap:10 }}>
        <div>
          <div style={{ fontSize:9, fontWeight:700, color:"#4A4A4A", letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>Program Tier</div>
          <select ref={tierRef} defaultValue="Hourly Session" style={{ ...inp, background:"#FFFFFF" }}>
            <option value="Hourly Session">Hourly Session</option>
            <option value="30-Day Intensive">30-Day Intensive</option>
            <option value="3-Month Elite">3-Month Elite</option>
          </select>
        </div>
        <div style={{ display:"flex", alignItems:"flex-end" }}>
          <button disabled={busy} onClick={send} style={{ width:"100%", padding:"11px 16px", background: busy ? "#888" : "#C4607A", border:"none", color:"#FFFFFF", fontSize:11, fontWeight:700, cursor: busy ? "default" : "pointer", fontFamily:"'DM Sans', 'Helvetica Neue', sans-serif", letterSpacing:"0.08em", textTransform:"uppercase" }}>
            {busy ? "Sending…" : "Invite Mentee"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Admin Community Resources — manage global resources ── */
const AdminCommunityResources = () => {
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState({ title:"", description:"", category:"", file:null });
  const [busy, setBusy] = useState(false);
  const [customCat, setCustomCat] = useState(false);
  const fileRef = useRef(null);

  const DEFAULT_CATS = ["Pricing", "Client Attraction", "Business Setup", "Mindset", "Social Media", "Education", "Templates", "Other"];

  useEffect(() => {
    supabase.functions.invoke('assign-task', { body: { action: 'get_all_resources' } })
      .then(({ data }) => { if (data) setResources(data); });
  }, []);

  const upload = async () => {
    if (!form.title || !form.file) { alert("Title and file are required."); return; }
    setBusy(true);
    try {
      const file = form.file;
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("resources").upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("resources").getPublicUrl(fileName);
      const { data: resResult } = await supabase.functions.invoke('assign-task', { body: { action: 'insert_resource', title: form.title, description: form.description, file_url: urlData.publicUrl, file_name: file.name, file_type: ext, mentee_email: null, category: form.category || 'General' } });
      const inserted = resResult?.resource;
      if (inserted) setResources(r => [inserted, ...r]);
      setForm({ title:"", description:"", category:"", file:null });
      setCustomCat(false);
      if (fileRef.current) fileRef.current.value = "";
    } catch(e) { alert(`Error: ${e.message}`); }
    setBusy(false);
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this resource?")) return;
    await supabase.functions.invoke('assign-task', { body: { action: 'delete_resource', id } });
    setResources(r => r.filter(x => x.id !== id));
  };

  const globalResources = resources.filter(r => !r.mentee_email);
  const specificResources = resources.filter(r => r.mentee_email);

  return (
    <div>
      {/* Upload global resource */}
      <div style={{ background:B.black, borderLeft:`3px solid ${B.blush}`, padding:"18px 20px", marginBottom:20 }}>
        <div style={{ fontSize:9, fontWeight:700, color:B.blushLight, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Add Global Resource — All Mentees</div>
        <input value={form.title} onChange={e => setForm(f => ({...f, title:e.target.value}))} placeholder="Resource title..." style={{ width:"100%", padding:"9px 12px", background:"#1a1a1a", border:`1px solid #333`, color:B.ivory, fontSize:13, fontFamily:FONTS.body, outline:"none", boxSizing:"border-box", marginBottom:8 }} />
        <input value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))} placeholder="Short description..." style={{ width:"100%", padding:"9px 12px", background:"#1a1a1a", border:`1px solid #333`, color:B.ivory, fontSize:13, fontFamily:FONTS.body, outline:"none", boxSizing:"border-box", marginBottom:8 }} />
        <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap" }}>
          {DEFAULT_CATS.map(cat => (
            <button key={cat} onClick={() => { setForm(f => ({...f, category:cat})); setCustomCat(false); }}
              style={{ padding:"5px 10px", border:`1px solid ${form.category===cat ? B.blush : "#444"}`, background: form.category===cat ? B.blush : "transparent", color: form.category===cat ? B.white : "#999", fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:0.5, textTransform:"uppercase" }}>
              {cat}
            </button>
          ))}
          <button onClick={() => { setCustomCat(true); setForm(f => ({...f, category:""})); }}
            style={{ padding:"5px 10px", border:`1px solid ${customCat ? B.blush : "#444"}`, background: customCat ? B.blush : "transparent", color: customCat ? B.white : "#999", fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:0.5, textTransform:"uppercase" }}>
            + Custom
          </button>
        </div>
        {customCat && <input value={form.category} onChange={e => setForm(f => ({...f, category:e.target.value}))} placeholder="Enter category name..." style={{ width:"100%", padding:"9px 12px", background:"#1a1a1a", border:`1px solid ${B.blush}`, color:B.ivory, fontSize:13, fontFamily:FONTS.body, outline:"none", boxSizing:"border-box", marginBottom:8 }} />}
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={e => setForm(f => ({...f, file:e.target.files[0]}))} style={{ fontSize:12, flex:1, color:B.ivory }} />
          <button onClick={upload} disabled={busy} style={{ padding:"9px 18px", background:B.blush, border:"none", color:B.white, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase", opacity:busy?0.6:1 }}>
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>

      {/* Global resources list */}
      {globalResources.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:9, fontWeight:700, color:B.mid, letterSpacing:1.5, textTransform:"uppercase", marginBottom:10 }}>Global Resources ({globalResources.length})</div>
          {globalResources.map(r => (
            <div key={r.id} style={{ background:B.white, border:`1px solid ${B.cloud}`, padding:"12px 16px", marginBottom:2, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:B.black }}>{r.title}</div>
                {r.description && <div style={{ fontSize:10, color:B.mid, fontWeight:300, marginTop:2 }}>{r.description}</div>}
                <div style={{ fontSize:9, color:B.blush, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginTop:3 }}>{r.file_type?.toUpperCase()} · All mentees</div>
              </div>
              <a href={r.file_url} target="_blank" rel="noreferrer" style={{ fontSize:9, padding:"4px 10px", border:`1px solid ${B.cloud}`, color:B.steel, textDecoration:"none", fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>View</a>
              <button onClick={() => remove(r.id)} style={{ fontSize:9, padding:"4px 10px", border:`1px solid ${B.cloud}`, background:"none", color:B.mid, cursor:"pointer", fontFamily:FONTS.body, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* Per-mentee resources list */}
      {specificResources.length > 0 && (
        <div>
          <div style={{ fontSize:9, fontWeight:700, color:B.mid, letterSpacing:1.5, textTransform:"uppercase", marginBottom:10 }}>Mentee-Specific Resources ({specificResources.length})</div>
          {specificResources.map(r => (
            <div key={r.id} style={{ background:B.white, border:`1px solid ${B.cloud}`, padding:"12px 16px", marginBottom:2, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:B.black }}>{r.title}</div>
                {r.description && <div style={{ fontSize:10, color:B.mid, fontWeight:300, marginTop:2 }}>{r.description}</div>}
                <div style={{ fontSize:9, color:B.steel, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginTop:3 }}>{r.file_type?.toUpperCase()} · {r.mentee_email}</div>
              </div>
              <a href={r.file_url} target="_blank" rel="noreferrer" style={{ fontSize:9, padding:"4px 10px", border:`1px solid ${B.cloud}`, color:B.steel, textDecoration:"none", fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>View</a>
              <button onClick={() => remove(r.id)} style={{ fontSize:9, padding:"4px 10px", border:`1px solid ${B.cloud}`, background:"none", color:B.mid, cursor:"pointer", fontFamily:FONTS.body, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {resources.length === 0 && (
        <div style={{ color:B.mid, fontSize:13, fontWeight:300, fontStyle:"italic", padding:"20px 0" }}>No resources uploaded yet.</div>
      )}
    </div>
  );
};

/* ── Admin Community — fully standalone to prevent remounting ── */
const AdminCommunity = ({ menteeList, communityList }) => {
  const { isMobile } = useLayout();
  const [posts, setCommunityPosts] = useState([]);
  const [postInput, setCommunityPostInput] = useState("");
  const [postCat, setCommunityPostCat] = useState("tip");
  const [tab, setTab] = useState("feed");
  const [jessVoiceAdmin, setJessVoiceAdmin] = useState(null);
  const [postImage, setPostImage] = useState(null);
  const postImageRef = useRef(null);

  useEffect(() => {
    supabase.functions.invoke('jess-voice', { body: { action:'get' } })
      .then(({ data }) => { if (data?.voice) setJessVoiceAdmin(data.voice); });
  }, []);

  useEffect(() => {
    supabase.functions.invoke("community-post", { body: { action: "fetch" } })
      .then(({ data }) => {
        const posts = data?.posts || [];
        if (posts.length > 0) setCommunityPosts(posts.map(p => ({
          id: p.id, author: p.author, avatar: p.avatar,
          time: new Date(p.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric" }),
          text: p.text, likes: p.likes || 0, isJess: p.is_jess, cat: p.cat, pinned: p.pinned,
          audioUrl: p.audio_url?.startsWith("__POSTIMAGE__") ? null : (p.audio_url || null),
          imageUrl: p.audio_url?.startsWith("__POSTIMAGE__") ? p.audio_url.replace("__POSTIMAGE__", "") : null,
          isGraduate: p.is_graduate || false
        })));
      });
  }, []);

  const submitPost = async () => {
    if (!postInput.trim() && !postImage) return;
    let imageUrl = null;
    if (postImage) {
      const ext = postImage.name.split('.').pop();
      const fileName = `post-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("images").upload(fileName, postImage, { contentType: postImage.type });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
      setPostImage(null);
      if (postImageRef.current) postImageRef.current.value = "";
    }
    const { data, error } = await supabase.functions.invoke('community-post', {
      body: { action:'insert', author:"Jess", avatar:"J", text:postInput || "📷", cat:postCat, is_jess:true, pinned:false, audio_url: imageUrl ? `__POSTIMAGE__${imageUrl}` : null }
    });
    if (error) { alert(`Post error: ${error.message}`); return; }
    if (data?.error) { alert(`Post error: ${data.error}`); return; }
    if (data?.post) setCommunityPosts(p => [{ id:data.post.id, author:"Jess", avatar:"J", time:"Just now", text:postInput || "", likes:0, isJess:true, cat:postCat, pinned:false, audioUrl:null, imageUrl }, ...p]);
    setCommunityPostInput("");
  };

  const removePost = async (postId) => {
    if (!window.confirm("Remove this post?")) return;
    await supabase.functions.invoke('community-post', { body: { action:'delete', id:postId } });
    setCommunityPosts(p => p.filter(x => x.id !== postId));
  };

  const pinPost = async (post) => {
    await supabase.functions.invoke('community-post', { body: { action:'update', id:post.id, pinned:!post.pinned } });
    setCommunityPosts(p => p.map(x => x.id === post.id ? { ...x, pinned:!x.pinned } : x));
  };

  const catColors = { win: B.blush, tip: B.success, question: "#9B6EA0", resource: B.amber, intro: B.steel };
  const catLabels = { win: "Win", tip: "Tip", question: "Question", resource: "Resource", intro: "Intro" };
  const catIcons  = { win: "catWin", tip: "catTip", question: "catQuestion", resource: "catResource", intro: "catIntro" };

  // ── Admin Community state moved to standalone AdminCommunity component ──

  return (
    <div style={{ padding: isMobile ? "20px 18px 100px" : "28px 28px" }}>
      <div style={{ fontSize:9, fontWeight:700, color:B.blush, letterSpacing:3, textTransform:"uppercase", marginBottom:4 }}>Community</div>
      <h1 style={{ fontFamily:FONTS.display, fontWeight:900, fontSize: isMobile ? 32 : 44, textTransform:"uppercase", color:B.black, margin:"0 0 20px", letterSpacing:"-0.5px" }}>Inner Circle</h1>

      {/* Sub tabs */}
      <div style={{ display:"flex", gap:2, marginBottom:20 }}>
        {[["feed","Community Feed"], ["members","Members"], ["wins","Mentee Wins"], ["resources","Resources"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding:"8px 18px", border:`1px solid ${tab===id ? B.blush : B.cloud}`, background: tab===id ? B.blush : B.white, color: tab===id ? B.white : B.steel, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase" }}>{label}</button>
        ))}
      </div>

      {tab === "feed" && (
        <div>
          <CommunityVoiceRecorder onPost={async (title, audioUrl) => {
            const { data, error } = await supabase.functions.invoke('jess-voice', {
              body: { action:'post', title, audio_url: audioUrl }
            });
            if (error) { alert(`Error: ${error.message}`); return; }
            if (data?.voice) setJessVoiceAdmin({ title: data.voice.title, audio_url: data.voice.audio_url });
          }} />

          {/* Show current Jess's Voice */}
          {jessVoiceAdmin && (
            <div style={{ background:B.black, borderLeft:`3px solid ${B.blush}`, padding:"16px 20px", marginBottom:16 }}>
              <div style={{ fontSize:9, fontWeight:700, color:B.blushLight, letterSpacing:3, textTransform:"uppercase", marginBottom:8 }}>Current — Jess's Voice This Week</div>
              <div style={{ color:B.ivory, fontSize:13, fontWeight:300, marginBottom:10 }}>"{jessVoiceAdmin.title}"</div>
              <audio controls src={jessVoiceAdmin.audio_url} style={{ width:"100%", height:32, outline:"none" }} controlsList="nodownload" />
            </div>
          )}

          <div style={{ background:B.white, border:`1px solid ${B.cloud}`, padding:"18px 20px", marginBottom:16, borderTop:`3px solid ${B.blush}` }}>
            <div style={{ display:"flex", gap:2, marginBottom:12, flexWrap:"nowrap", overflowX:"auto" }}>
              {Object.entries(catLabels).map(([k, v]) => (
                <button key={k} onClick={() => setCommunityPostCat(k)} style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 9px", border:`1px solid ${postCat===k ? catColors[k] : B.cloud}`, background: postCat===k ? `${catColors[k]}12` : "transparent", color: postCat===k ? catColors[k] : B.mid, fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, whiteSpace:"nowrap", flexShrink:0 }}>
                  <Ic n={catIcons[k]} size={10} color={postCat===k ? catColors[k] : B.mid} sw={1.5} />{v}
                </button>
              ))}
            </div>
            <textarea value={postInput} onChange={e => setCommunityPostInput(e.target.value)} placeholder="Share a tip, drop a resource, post a challenge — post as Jess..." rows={4} style={{ width:"100%", padding:"12px 14px", border:`1px solid ${B.cloud}`, fontSize:13, color:B.black, fontFamily:FONTS.body, outline:"none", resize:"vertical", boxSizing:"border-box", fontWeight:300 }} />
            {postImage && (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background:B.off, border:`1px solid ${B.cloud}`, marginTop:6 }}>
                <Ic n="file" size={12} color={B.blush} />
                <span style={{ fontSize:11, color:B.charcoal, flex:1, fontWeight:300 }}>{postImage.name}</span>
                <button onClick={() => { setPostImage(null); if(postImageRef.current) postImageRef.current.value=""; }} style={{ background:"none", border:"none", cursor:"pointer", color:B.mid, fontSize:14, padding:0 }}>×</button>
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:26, height:26, background:B.blush, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:B.white, borderRadius:"50%" }}>J</div>
                <span style={{ fontSize:11, color:B.mid, fontWeight:300 }}>Posting as Jess</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <input ref={postImageRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => setPostImage(e.target.files[0])} />
                <button onClick={() => postImageRef.current?.click()} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", border:`1px solid ${B.cloud}`, background:B.white, color:B.mid, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:"0.08em", textTransform:"uppercase" }}>
                  <Ic n="file" size={12} color={B.mid} />Add Photo
                </button>
                <button onClick={submitPost} disabled={!postInput.trim() && !postImage} style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 18px", background: (postInput.trim() || postImage) ? B.blush : B.cloud, border:"none", color:B.white, fontSize:11, fontWeight:700, cursor: (postInput.trim() || postImage) ? "pointer" : "default", fontFamily:FONTS.body, letterSpacing:"0.08em", textTransform:"uppercase" }}>
                  <Ic n="send" size={12} color={B.white} />Post
                </button>
              </div>
            </div>
          </div>

          {posts.length === 0 && (
            <div style={{ padding: "32px 20px", textAlign: "center", color: B.mid, fontSize: 13, fontWeight: 300, border: `1px solid ${B.cloud}`, background: B.white }}>
              No posts yet. Be the first to post in the community!
            </div>
          )}
          {posts.map(post => (
            <div key={post.id} style={{ background:B.white, border:`1px solid ${B.cloud}`, padding:"16px 20px", marginBottom:2, borderLeft:`3px solid ${post.pinned ? B.amber : post.isJess ? B.blush : B.cloud}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:32, height:32, background: post.isJess ? B.blush : B.steel, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:B.white, borderRadius:"50%", flexShrink:0 }}>{post.avatar}</div>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:12, fontWeight:700, color: post.isJess ? B.blush : B.black }}>{post.author}</span>
                      {post.isJess && <span style={{ fontSize:7, background:B.blush, color:B.white, padding:"1px 5px", fontWeight:700, letterSpacing:1 }}>JESS</span>}
                      {post.isGraduate && !post.isJess && <span style={{ fontSize:7, background:"#2D7D4E", color:B.white, padding:"1px 5px", fontWeight:700, letterSpacing:1 }}>🎓 GRAD</span>}
                      {post.pinned && <span style={{ fontSize:7, background:B.amber, color:B.white, padding:"1px 5px", fontWeight:700, letterSpacing:1 }}>PINNED</span>}
                    </div>
                    <div style={{ fontSize:9, color:B.mid, marginTop:1 }}>{post.time} · <span style={{ color: catColors[post.cat], fontWeight:700, fontSize:8, textTransform:"uppercase", letterSpacing:1 }}>{catLabels[post.cat]}</span></div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                  <button onClick={() => pinPost(post)} style={{ fontSize:8, padding:"3px 8px", border:`1px solid ${post.pinned ? B.amber : B.cloud}`, background: post.pinned ? `${B.amber}15` : "none", color: post.pinned ? B.amber : B.mid, cursor:"pointer", fontFamily:FONTS.body, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>{post.pinned ? "Unpin" : "Pin"}</button>
                  <button onClick={() => removePost(post.id)} style={{ fontSize:8, padding:"3px 8px", border:`1px solid ${B.cloud}`, background:"none", color:B.mid, cursor:"pointer", fontFamily:FONTS.body, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>Remove</button>
                </div>
              </div>
              <p style={{ fontSize:13, color:B.charcoal, lineHeight:1.7, margin:0, fontWeight:300 }}>{post.text}</p>
              {post.audioUrl && (
                <div style={{ background:B.off, border:`1px solid ${B.cloud}`, borderLeft:`3px solid ${B.blush}`, padding:"12px 14px", marginTop:10, display:"flex", alignItems:"center", gap:10 }}>
                  <Ic n="mic" size={14} color={B.blush} />
                  <audio controls src={post.audioUrl} style={{ flex:1, height:32, outline:"none" }} controlsList="nodownload" />
                </div>
              )}
              {post.imageUrl && (
                <img src={post.imageUrl} alt="Post image" style={{ maxWidth:"100%", maxHeight:300, display:"block", borderRadius:2, marginBottom:14 }} />
              )}
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:10 }}>
                <Ic n="heart" size={12} color={B.mid} />
                <span style={{ fontSize:10, color:B.mid, fontWeight:300 }}>{post.likes} likes</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "members" && (
        <div>
          <div style={{ fontSize:11, color:B.mid, fontWeight:300, marginBottom:16 }}>{communityList.length} community members</div>
          {communityList.map((m, i) => (
            <div key={i} style={{ background:B.white, border:`1px solid ${B.cloud}`, padding:"14px 18px", marginBottom:2, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:36, height:36, background:B.steel, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:B.white }}>{m.avatar}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:B.black }}>{m.name}</div>
                  <div style={{ fontSize:10, color:B.mid, fontWeight:300 }}>{m.email}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <span style={{ fontSize:8, fontWeight:700, color:B.steel, border:`1px solid ${B.cloud}`, padding:"2px 8px", letterSpacing:1, textTransform:"uppercase" }}>{m.paid ? "Member" : "Trial"}</span>
                {m.graduated && <span style={{ fontSize:7, background:"#2D7D4E", color:B.white, padding:"2px 8px", fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>🎓 Grad</span>}
                <button style={{ fontSize:8, padding:"3px 8px", border:`1px solid ${B.cloud}`, background:"none", color:B.mid, cursor:"pointer", fontFamily:FONTS.body, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "wins" && (
        <div>
          <div style={{ fontSize:11, color:B.mid, fontWeight:300, marginBottom:16 }}>Wins posted by your mentees</div>
          {menteeList.map((m, i) => {
            const mWins = posts.filter(p => p.cat === "win" && !p.isJess && p.author === (m.firstName || m.name));
            return mWins.length > 0 ? (
              <div key={i} style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:700, color:B.blush, letterSpacing:1.5, textTransform:"uppercase", marginBottom:6, paddingBottom:6, borderBottom:`1px solid ${B.cloud}` }}>{m.firstName || m.name} — {m.tier}</div>
                {mWins.map(win => (
                  <div key={win.id} style={{ background:B.white, border:`1px solid ${B.cloud}`, borderLeft:`3px solid ${B.blush}`, padding:"12px 16px", marginBottom:2 }}>
                    <p style={{ fontSize:13, color:B.charcoal, margin:"0 0 6px", fontWeight:300, lineHeight:1.6 }}>{win.text}</p>
                    <div style={{ fontSize:9, color:B.mid, fontWeight:300 }}>{win.time} · {win.likes} likes</div>
                  </div>
                ))}
              </div>
            ) : null;
          })}
          {menteeList.every(m => !posts.some(p => p.cat === "win" && !p.isJess && p.author === (m.firstName || m.name))) && (
            <div style={{ color:B.mid, fontSize:13, fontWeight:300, fontStyle:"italic" }}>No mentee wins posted yet.</div>
          )}
        </div>
      )}

      {tab === "resources" && (
        <AdminCommunityResources />
      )}
    </div>
  );
};

const AdminDashboard = ({ onLogout }) => {
  const { isMobile, useSidebar } = useLayout();
  const [view, setView] = useState("overview");
  const [adminCall, setAdminCall] = useState(null);
  const [welcomeLetter, setWelcomeLetter] = useState(null);
  const [scheduleSession, setScheduleSession] = useState(null);
  const [sessionForm, setSessionForm] = useState({ type:"", date:"", time:"", notes:"" });
  const [sessionBusy, setSessionBusy] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name:"", email:"", tier:"Hourly Session" });
  const [menteeDrawer, setMenteeDrawer] = useState(null);
  const [sessionsHistory, setSessionsHistory] = useState({});
  const [winsCache, setWinsCache] = useState({});
  const [assignTask, setAssignTask] = useState(null); // { mentee }
  const [addResource, setAddResource] = useState(null); // null | { mentee } | "global"
  const [resourceForm, setResourceForm] = useState({ title:"", description:"", category:"", file:null });
  const [resourceUploading, setResourceUploading] = useState(false);
  const RESOURCE_CATS = ["Pricing", "Client Attraction", "Business Setup", "Mindset", "Social Media", "Education", "Templates", "Other"];
  const [taskForm, setTaskForm] = useState({ title:"", due_date:"", jess_notes:"" });
  const [taskBusy, setTaskBusy] = useState(false);
  const [adminTasks, setAdminTasks] = useState({});
  const [menteesTab, setMenteesTab] = useState("active");
  const [graduates, setGraduates] = useState([]);

  const fetchGraduates = () => {
    supabase.functions.invoke('assign-task', { body: { action: 'get_graduates' } })
      .then(({ data }) => {
        if (data?.profiles) setGraduates(data.profiles.map(g => ({
          email: g.email,
          firstName: g.first_name || g.email.split("@")[0],
          name: g.first_name || g.email.split("@")[0],
          avatar: (g.first_name || g.email.split("@")[0]).slice(0,2).toUpperCase(),
          tier: g.tier || "Mentorship",
          startDate: g.start_date || "",
          sessionsCompleted: g.sessions_completed || 0,
          sessionsTotal: g.sessions_total || 0,
        })));
      });
  };

  useEffect(() => { fetchGraduates(); }, []);

  useEffect(() => {
    const fetchTasks = () => {
      supabase.functions.invoke('assign-task', { body: { action: 'fetch_all' } })
        .then(({ data }) => {
          if (data?.tasks) {
            const grouped = {};
            data.tasks.forEach(t => {
              if (!grouped[t.mentee_email]) grouped[t.mentee_email] = [];
              grouped[t.mentee_email].push(t);
            });
            setAdminTasks(grouped);
          }
        });
    };
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch sessions history grouped by mentee email
  useEffect(() => {
    supabase.functions.invoke('assign-task', { body: { action: 'get_sessions' } })
      .then(({ data }) => {
        const sessions = data?.sessions || [];
        if (sessions.length > 0) {
          const grouped = {};
          sessions.forEach(s => {
            if (!grouped[s.mentee_email]) grouped[s.mentee_email] = [];
            grouped[s.mentee_email].push(s);
          });
          setSessionsHistory(grouped);
        }
      });
  }, []);
  const [leads, setLeads] = useState(DB.leads);
  const [selLead, setSelLead] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [leadFilter, setLeadFilter] = useState("all");
  const { isMobile: crmIsMobile } = useLayout();
  const [crmView, setCrmView] = useState(() => window.innerWidth < 768 ? "list" : "board");
  const [selChat, setSelChat] = useState(null);
  const [showChatList, setShowChatList] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [chatMsgs, setChatMsgs] = useState({});
  const [chatInput, setChatInput] = useState("");
  const [chatImage, setChatImage] = useState(null);
  const chatImageRef = useRef(null);
  const chatEnd = useRef(null);

  const pending = leads.filter(l => l.status === "pending");
  const mainLeads = leads.filter(l => ["pending","accepted","happened","enrolled"].includes(l.status));
  const archivedLeads = leads.filter(l => l.status === "declined" || l.status === "followup");
  const filtered = leadFilter === "all" ? mainLeads : mainLeads.filter(l => l.status === leadFilter);
  const [showArchive, setShowArchive] = useState(false);
  const accept    = id => setLeads(p => p.map(l => l.id === id ? { ...l, status: "accepted",  acceptedAt: "Just now" } : l));
  const markHappened = id => setLeads(p => p.map(l => l.id === id ? { ...l, status: "happened" } : l));
  const enroll    = id => setLeads(p => p.map(l => l.id === id ? { ...l, status: "enrolled" } : l));
  const decline   = id => { setLeads(p => p.map(l => l.id === id ? { ...l, status: "declined" } : l)); setSelLead(null); setShowDetail(false); };
  const followup  = id => { setLeads(p => p.map(l => l.id === id ? { ...l, status: "followup" } : l)); setSelLead(null); setShowDetail(false); };
  const undoLead  = id => { setLeads(p => p.map(l => l.id === id ? { ...l, status: "pending"  } : l)); setSelLead(null); setShowDetail(false); };

  const [invitingLead, setInvitingLead] = useState(null);
  const inviteMenteeFromLead = async (lead) => {
    if (!lead?.email) { alert("No email found for this lead."); return; }
    setInvitingLead(lead.id);
    const tierClean = lead.tier.replace(/\s*\(\$[\d,]+\)/, "").trim();
    const firstName = lead.name.split(" ")[0];
    try {
      const { data, error } = await supabase.functions.invoke('invite-mentee', {
        body: { email: lead.email, tier: tierClean, first_name: firstName }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLeads(p => p.map(l => l.id === lead.id ? { ...l, invited: true, invitedAt: "Just now" } : l));
      if (selLead?.id === lead.id) setSelLead(p => ({ ...p, invited: true, invitedAt: "Just now" }));
      alert(`Invite sent to ${firstName} at ${lead.email}. They will receive an email to set their password and access their portal.`);
    } catch (e) {
      alert(`Error sending invite: ${e.message}`);
    }
    setInvitingLead(null);
  };
  const [menteeList, setMenteeList] = useState(
    [] // Populated from Supabase on mount
  );

  // Fetch real mentees from Supabase and merge with demo data
  useEffect(() => {
    supabase.functions.invoke('assign-task', { body: { action: 'get_all_profiles' } })
      .then(({ data }) => {
        if (data?.profiles && data.profiles.length > 0) {
          const realMentees = data.profiles.filter(m => !m.graduated && m.role !== "community").map(m => ({
            email: m.email,
            name: m.first_name || m.email.split("@")[0],
            firstName: m.first_name || m.email.split("@")[0],
            avatar: (m.first_name || m.email.split("@")[0]).slice(0, 2).toUpperCase(),
            tier: m.tier || "Hourly Session",
            tierKey: m.tier_key || "hourly",
            startDate: m.start_date || "Recently",
            totalDays: m.total_days || (m.tier?.includes("Elite") ? 90 : m.tier?.includes("Intensive") ? 30 : 30),
            daysRemaining: calcDaysRemaining(m.start_date, m.total_days || (m.tier?.includes("Elite") ? 90 : m.tier?.includes("Intensive") ? 30 : 30)),
            sessionsCompleted: m.sessions_completed ?? 0,
            sessionsTotal: m.sessions_total || 2,
            goal: m.goal || "",
            milestones: m.milestones || [],
            nextSession: m.next_session_date ? {
              date: m.next_session_date,
              time: m.next_session_time || "",
              type: m.next_session_type || "Session"
            } : null,
          }));
          // Use only real Supabase mentees
          setMenteeList(realMentees);
          // Pre-fetch wins for all mentees so counter shows without opening drawer
          realMentees.forEach(m => {
            supabase.functions.invoke('assign-task', { body: { action: 'get_wins', mentee_email: m.email } })
              .then(({ data }) => {
                setWinsCache(p => ({ ...p, [m.email]: data?.wins?.map(w => ({ text: w.text, date: w.date })) || [] }));
              });
          });
        }
      });
  }, []);

  const [communityList, setCommunityList] = useState([]);
  useEffect(() => {
    supabase.functions.invoke('assign-task', { body: { action: 'get_all_profiles' } })
      .then(({ data }) => {
        if (data?.profiles) {
          const community = data.profiles
            .filter(m => m.role === "community" || m.graduated)
            .map(m => ({
              email: m.email,
              name: m.first_name || m.email.split("@")[0],
              firstName: m.first_name || m.email.split("@")[0],
              avatar: (m.first_name || m.email.split("@")[0]).slice(0, 2).toUpperCase(),
              tier: m.tier || "Community Member",
              graduated: m.graduated || false,
              paid: m.paid || false,
              joinDate: m.start_date || "",
            }));
          setCommunityList(community);
        }
      });
  }, []);

  // Real revenue from invoices
  const [allInvoices, setAllInvoices] = useState([]);
  useEffect(() => {
    supabase.functions.invoke('stripe-invoice', { body: { action: 'get_invoices' } })
      .then(({ data }) => { if (data?.invoices) setAllInvoices(data.invoices); });
  }, []);
  const totalRev = allInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.amount / 100), 0);
  const pendingRev = allInvoices.filter(i => i.status === "pending").reduce((s, i) => s + (i.amount / 100), 0);

  // Fetch all mentee conversations for admin with real-time
  const selChatRef = useRef(null);
  const viewRef = useRef("overview");
  const [adminUnread, setAdminUnread] = useState(0);
  useEffect(() => { selChatRef.current = selChat; }, [selChat]);
  useEffect(() => { viewRef.current = view; }, [view]);

  useEffect(() => {
    const fetchAllMessages = () => {
      supabase.functions.invoke("send-message", { body: { action: "get_all" } })
        .then(({ data }) => {
          const allMsgs = (data?.messages || []).filter(m => !m.text?.startsWith("__GRADUATION__"));
          if (!allMsgs || allMsgs.length === 0) return;
          const grouped = {};
          allMsgs.forEach(m => {
            if (!m.mentee_email) return;
            if (!grouped[m.mentee_email]) grouped[m.mentee_email] = [];
            grouped[m.mentee_email].push(m);
          });
          const contactList = Object.entries(grouped).map(([email, msgs]) => {
            const currentContactEmail = selChatRef.current !== null && contacts[selChatRef.current]?.email;
            const isCurrentlyViewed = viewRef.current === "messages" && currentContactEmail === email;
            const mentee = menteeList.find(m => m.email?.toLowerCase() === email?.toLowerCase())
              || communityList.find(m => m.email?.toLowerCase() === email?.toLowerCase())
              || graduates.find(m => m.email?.toLowerCase() === email?.toLowerCase());
            const name = mentee
              ? (mentee.firstName && mentee.firstName !== email.split("@")[0] ? mentee.firstName : mentee.name || mentee.firstName || email.split("@")[0])
              : email.split("@")[0];
            return {
              email, name,
              preview: msgs[msgs.length - 1]?.text || "",
              unread: isCurrentlyViewed ? 0 : msgs.filter(m => !m.read && m.sender === "mentee").length,
              tier: mentee?.tierKey || "mentee"
            };
          });
          setContacts(contactList);
          if (contactList.length > 0 && selChatRef.current === null) setSelChat(0);
          const msgMap = {};
          contactList.forEach((c, i) => {
            msgMap[i] = grouped[c.email].filter(m => !m.text?.startsWith("__GRADUATION__")).map(m => {
              const isImage = m.audio_url?.startsWith("__IMAGE__");
              return {
                from: m.sender === "mentee" ? c.name : "Jess",
                sender: m.sender,
                text: m.text,
                audioUrl: isImage ? null : (m.audio_url || null),
                imageUrl: isImage ? m.audio_url.replace("__IMAGE__", "") : null,
                t: new Date(m.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric" })
              };
            });
          });
          setChatMsgs(msgMap);
        });
    };

    fetchAllMessages();
    const interval = setInterval(fetchAllMessages, 5000);
    return () => clearInterval(interval);
  }, [menteeList.length]);

  // Derive unread count from contacts state — already computed in fetchAllMessages
  useEffect(() => {
    if (viewRef.current === "messages") {
      setAdminUnread(0);
      return;
    }
    const total = contacts.reduce((sum, c) => sum + (c.unread || 0), 0);
    setAdminUnread(total);
  }, [contacts, view]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs, selChat]);

  // Mark messages as read ONLY when Jess is viewing the Messages tab
  useEffect(() => {
    if (selChat === null || viewRef.current !== "messages") return;
    setContacts(prev => {
      const contact = prev[selChat];
      if (!contact) return prev;
      supabase.functions.invoke("send-message", { body: { action: "mark_read", mentee_email: contact.email } })
        .then(({ error }) => {
          if (error) console.error("Mark read failed:", error.message);
        });
      return prev.map((c, i) => i === selChat ? { ...c, unread: 0 } : c);
    });
    setAdminUnread(0);
  }, [selChat, chatMsgs]);

  const sendChat = async () => {
    if (!chatInput.trim() && !chatImage || selChat === null || !contacts[selChat]) return;
    const contact = contacts[selChat];
    const text = chatInput;
    let imageUrl = null;

    if (chatImage) {
      const ext = chatImage.name.split('.').pop();
      const fileName = `msg-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("images").upload(fileName, chatImage, { contentType: chatImage.type });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
      setChatImage(null);
      if (chatImageRef.current) chatImageRef.current.value = "";
    }

    setChatMsgs(p => ({ ...p, [selChat]: [...(p[selChat] || []), { from: "Jess", text: text || "📷", t: "now", imageUrl }] }));
    setChatInput("");
    await supabase.functions.invoke('send-message', {
      body: {
        mentee_email: contact.email, sender: "jess",
        text: text || (imageUrl ? "📷 Image" : ""),
        audio_url: imageUrl ? `__IMAGE__${imageUrl}` : null
      }
    });
  };

  // ── Voice Note Recording ─────────────────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [recordingFor, setRecordingFor] = useState(null); // "message" | "community"
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const startRecording = async (target) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Safari supports mp4, Chrome/Firefox support webm
      const mimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" :
                       MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
                       MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
      setRecordingFor(target);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e) {
      alert("Microphone access is required to send voice notes. Please allow microphone access and try again.");
    }
  };

  const stopRecording = async () => {
    return new Promise(resolve => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) { resolve(null); return; }
      mediaRecorder.onstop = async () => {
        clearInterval(recordingTimerRef.current);
        setRecording(false);
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const fileName = `voice-${Date.now()}.${ext}`;
        const { data, error } = await supabase.storage.from("voice-notes").upload(fileName, blob, { contentType: mimeType });
        if (error) { alert("Failed to upload voice note. Please try again."); resolve(null); return; }
        const { data: urlData } = supabase.storage.from("voice-notes").getPublicUrl(fileName);
        resolve(urlData.publicUrl);
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.stop();
    });
  };

  const sendVoiceNote = async () => {
    if (!contacts[selChat]) return;
    const audioUrl = await stopRecording();
    if (!audioUrl) return;
    const contact = contacts[selChat];
    setChatMsgs(p => ({ ...p, [selChat]: [...(p[selChat] || []), { from: "Jess", text: "🎤 Voice note", audioUrl, t: "now" }] }));
    await supabase.functions.invoke('send-message', {
      body: { mentee_email: contact.email, sender: "jess", text: "🎤 Voice note", audio_url: audioUrl }
    });
  };

  const fmtTime = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  const scMap = { pending: [B.amber, B.amberPale], accepted: [B.success, B.successPale], happened: ["#7B5EA7", "#F3EEF9"], enrolled: [B.blush, B.blushPale], declined: [B.mid, B.off], followup: ["#B8860B", B.amberPale] };
  const stageLabel = { pending: "Waiting on Me", accepted: "Call Confirmed", happened: "Call Happened", enrolled: "Enrolled", declined: "Not a Fit", followup: "Follow Up Later" };

  const ADMIN_NAV = [{ id:"overview",icon:"grid",label:"Overview" }, { id:"leads",icon:"zap",label:"Leads" }, { id:"mentees",icon:"users",label:"Mentees" }, { id:"applications",icon:"clipBoard",label:"Applications" }, { id:"invoices",icon:"send",label:"Invoices" }, { id:"messages",icon:"message",label:"Messages" }, { id:"community",icon:"users",label:"Community" }, { id:"settings",icon:"settings",label:"Settings" }];
  const ADMIN_TABS = [{ id:"overview",icon:"grid",label:"Overview" }, { id:"leads",icon:"zap",label:"Leads" }, { id:"mentees",icon:"users",label:"Mentees" }, { id:"messages",icon:"message",label:"Messages" }, { id:"community",icon:"users",label:"Community" }, { id:"settings",icon:"settings",label:"Settings" }];

  const Pg = ({ title, sub, children, action }) => (
    <div style={{ padding: isMobile ? "20px 18px 40px" : "28px 32px", maxWidth: 1020, width: "100%" }}>
      {title && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>{sub && <Section style={{ marginBottom: 8 }}>{sub}</Section>}<h1 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 32 : 44, textTransform: "uppercase", color: B.black, margin: 0, lineHeight: 0.95, letterSpacing: "-0.5px" }}>{title}</h1></div>
        {action}
      </div>}
      {children}
    </div>
  );

  const Overview = (
    <Pg title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, Jess.`} sub="Admin Overview">
      <p style={{ color: B.mid, fontSize: 13, margin: "-14px 0 20px", fontWeight: 300 }}>Here's everything happening across your mentorship program.</p>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 2, marginBottom: 20 }}>
        {[[menteeList.length, "Active Mentees", true], [communityList.length, "Community Members", false], [`$${totalRev.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}`, "Revenue Collected", false], [`$${pendingRev.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}`, "Pending Revenue", pendingRev > 0]].map(([v, l, accent], i) => (
          <div key={i} style={{ padding: "18px 20px", border: `1px solid ${B.cloud}`, background: B.white, borderTop: `3px solid ${accent ? B.blush : B.cloud}` }}>
            <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 28 : 36, color: accent ? B.blush : B.black, lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: B.mid, marginTop: 6, letterSpacing: 1.5, textTransform: "uppercase" }}>{l}</div>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div style={{ background: B.amberPale, border: `1px solid ${B.amber}40`, padding: "14px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, borderLeft: `3px solid ${B.amber}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Ic n="bell" size={15} color={B.amber} /><span style={{ fontSize: 12, color: B.charcoal, fontWeight: 400 }}><strong>{pending.length} new discovery call request{pending.length > 1 ? "s" : ""}</strong> waiting for your review.</span></div>
          <button onClick={() => setView("leads")} style={{ padding: "8px 16px", border: "none", background: B.amber, color: B.white, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: 1.5, textTransform: "uppercase" }}>Review Now →</button>
        </div>
      )}

      <Section style={{ marginBottom: 10 }}>Active Mentees</Section>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 2, marginBottom: 20 }}>
        {menteeList.map((m, i) => {
          const pct = Math.round((m.sessionsCompleted / m.sessionsTotal) * 100);
          return (
            <Card key={i} style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 34, height: 34, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: B.white, flexShrink: 0 }}>{m.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: B.black, letterSpacing: "0.02em" }}>{m.name}</span>
                    <Tag>{m.tier}</Tag>
                  </div>
                  <div style={{ fontSize: 10, color: B.mid, fontWeight: 300, marginTop: 2 }}>Next: {m.nextSession?.date} · {m.daysRemaining}d remaining</div>
                </div>
              </div>
              <PBar value={pct} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 9, color: B.mid, fontWeight: 300 }}>{m.sessionsCompleted}/{m.sessionsTotal} sessions</span>
                <span style={{ fontSize: 9, color: B.blush, fontWeight: 700, letterSpacing: 1 }}>{pct}%</span>
              </div>
              <div style={{ display: "flex", gap: 2 }}>
                <Btn size="sm" variant="primary" icon="video" onClick={async () => {
                  const { data, error } = await supabase.functions.invoke('create-video-room', {
                    body: { sessionName: "Quick Call", participantName: m.name }
                  });
                  if (error || data?.error) { alert("Could not create video room."); return; }
                  await supabase.functions.invoke('assign-task', { body: { action: 'upsert_profile', profile: { email: m.email, room_url: data.url } } });
                  setAdminCall({ name: m.name, roomUrl: data.url, menteeEmail: m.email, isSession: false });
                }}>Start Call</Btn>
                <Btn size="sm" variant="ghost" icon="message" onClick={() => { setSelChat(i); setView("messages"); }}>Message</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Community members — conversion pipeline */}
      {communityList.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Section>Community Members · Warm Leads</Section>
            <span style={{ fontSize: 9, color: B.mid, fontWeight: 300, letterSpacing: 1 }}>{communityList.length} members</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {communityList.map((m, i) => (
              <div key={i} style={{ background: B.white, border: `1px solid ${B.cloud}`, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, background: B.successPale, border: `1px solid ${B.success}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: B.success, flexShrink: 0 }}>{m.avatar}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: B.black, letterSpacing: "0.02em" }}>{m.name}</div>
                    <div style={{ fontSize: 9, color: B.mid, fontWeight: 300 }}>Community · Joined {m.joinDate}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <Btn size="sm" variant="blush" icon="message" onClick={() => { const idx = contacts.findIndex(c => c.email === m.email); setSelChat(idx >= 0 ? idx : null); setView("messages"); }}>Invite to Mentor</Btn>
                  <Btn size="sm" variant="ghost" icon="eye" onClick={() => setView("community")}>View Activity</Btn>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, padding: "10px 14px", background: B.blushPale, border: `1px solid ${B.blushMid}`, fontSize: 11, color: B.blush, fontWeight: 300, lineHeight: 1.5 }}>
            💡 Community members are warm leads — they're already engaged with Jess's content. Use "Invite to Mentor" to start a personal conversation.
          </div>
        </div>
      )}

      <Section style={{ marginBottom: 10 }}>Today's Sessions</Section>
      {(() => {
        const todayStr = new Date().toLocaleDateString("en-US", { weekday:"long", month:"short", day:"numeric" }); // e.g. "Monday, Apr 28"
        const todaySessions = menteeList.filter(m => {
          if (!m.nextSession?.date) return false;
          // next_session_date stored as e.g. "Monday Apr 28" or "Apr 28" — normalize both
          const d = m.nextSession.date.replace(",","").toLowerCase();
          return todayStr.replace(",","").toLowerCase().split(" ").some(part => part.length > 2 && d.includes(part))
            && d.split(" ").some(part => todayStr.replace(",","").toLowerCase().includes(part));
        });
        if (todaySessions.length === 0) return (
          <div style={{ background: B.off, border: `1px solid ${B.cloud}`, borderLeft: `3px solid ${B.cloud}`, padding: "20px 18px", color: B.mid, fontSize: 12, fontWeight: 300 }}>
            No sessions scheduled for today.
          </div>
        );
        return (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 2 }}>
            {todaySessions.map((s, i) => (
              <div key={i} style={{ background: B.black, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `3px solid ${B.blush}` }}>
                <div>
                  <div style={{ fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>{s.nextSession.time}</div>
                  <div style={{ color: B.ivory, fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>{s.name}</div>
                  <div style={{ color: "#9a8880", fontSize: 11, fontWeight: 300 }}>{s.nextSession.type}</div>
                </div>
                <Btn size="sm" variant="blush" icon="video" onClick={async () => {
                  const { data, error } = await supabase.functions.invoke('create-video-room', {
                    body: { sessionName: s.nextSession.type, participantName: s.name }
                  });
                  if (error || data?.error) { alert("Could not create video room."); return; }
                  await supabase.functions.invoke('assign-task', { body: { action: 'upsert_profile', profile: { email: s.email, room_url: data.url } } });
                  await supabase.functions.invoke('send-message', {
                    body: { mentee_email: s.email, sender: "jess", text: `Hi ${s.firstName || s.name.split(" ")[0]}! Your session is live — "${s.nextSession.type}". Join whenever you're ready! 🎯` }
                  });
                  setAdminCall({ name: s.name, roomUrl: data.url, menteeEmail: s.email, isSession: true, sessionType: s.nextSession.type });
                }}>Start</Btn>
              </div>
            ))}
          </div>
        );
      })()}
    </Pg>
  );

  // ── Lead Detail Panel (shared between kanban + table) ──────────────────
  const LeadDetailPanel = selLead ? (() => {
    const [sc, scPale] = scMap[selLead.status] || [B.mid, B.off];
    return (
      <div style={{ width: isMobile ? "100%" : 320, position: isMobile ? "fixed" : "relative", inset: isMobile ? 0 : undefined, background: B.white, borderLeft: isMobile ? "none" : `1px solid ${B.cloud}`, zIndex: isMobile ? 200 : undefined, display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 }}>
        <div style={{ padding: "13px 18px", borderBottom: `1px solid ${B.cloud}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: B.white, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><LogoMark size={22} /><span style={{ fontSize: 11, fontWeight: 700, color: B.black, letterSpacing: "0.05em", textTransform: "uppercase" }}>Lead Detail</span></div>
          <button onClick={() => { setShowDetail(false); setSelLead(null); }} style={{ width: 26, height: 26, border: `1px solid ${B.cloud}`, background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Ic n="close" size={12} color={B.mid} /></button>
        </div>
        <div style={{ padding: "18px 18px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, background: B.black, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: B.ivory, flexShrink: 0 }}>{selLead.name.split(" ").map(w => w[0]).join("")}</div>
            <div><div style={{ fontSize: 15, fontWeight: 700, color: B.black, letterSpacing: "0.02em" }}>{selLead.name}</div><span style={{ fontSize: 8, fontWeight: 700, color: sc, letterSpacing: 2, textTransform: "uppercase" }}>{selLead.status}</span></div>
          </div>
          {[[selLead.email, "Email"], [selLead.phone, "Phone"], [selLead.ig, "Instagram"], [selLead.licensed, "Licensed"], [selLead.experience, "Experience"], [selLead.tier, "Interested in"], [selLead.how, "Found via"]].filter(([v]) => v).map(([v, l]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${B.cloud}` }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: B.mid, letterSpacing: 1.5, textTransform: "uppercase" }}>{l}</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: B.black, maxWidth: "58%", textAlign: "right" }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, marginBottom: 14 }}>
            <div style={{ background: B.blushPale, borderLeft: `3px solid ${B.blush}`, padding: "12px 14px", marginBottom: 8 }}><div style={{ fontSize: 8, fontWeight: 700, color: B.blush, letterSpacing: 1.5, marginBottom: 5 }}>CHALLENGE</div><p style={{ fontSize: 12, color: B.charcoal, margin: 0, lineHeight: 1.6, fontWeight: 300 }}>{selLead.challenge}</p></div>
            <div style={{ background: B.off, padding: "12px 14px" }}><div style={{ fontSize: 8, fontWeight: 700, color: B.mid, letterSpacing: 1.5, marginBottom: 5 }}>GOAL</div><p style={{ fontSize: 12, color: B.charcoal, margin: 0, lineHeight: 1.6, fontWeight: 300 }}>{selLead.goal}</p></div>
          </div>
          <div style={{ background: B.black, padding: "14px 16px", marginBottom: 16, borderLeft: `3px solid ${B.blush}` }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: B.blushLight, letterSpacing: 1.5, marginBottom: 6 }}>REQUESTED TIME</div>
            <div style={{ color: B.ivory, fontSize: 13, fontWeight: 700, letterSpacing: "0.03em" }}>{selLead.slot.day}, {selLead.slot.date}</div>
            <div style={{ color: "#9a8880", fontSize: 11, fontWeight: 300 }}>{selLead.slot.time} EST · 20 min · Google Meet</div>
            {selLead.status === "accepted" && <div style={{ marginTop: 6, fontSize: 9, color: B.success, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>✓ Confirmed · email sent</div>}
          </div>
          {selLead.status === "pending" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Btn full variant="blush" icon="check" onClick={() => { accept(selLead.id); setSelLead(p => ({ ...p, status: "accepted" })); }}>Confirm the Call</Btn>
              <Btn full variant="ghost" onClick={() => { followup(selLead.id); }}>Follow Up Later</Btn>
              <Btn full variant="ghost" onClick={() => { decline(selLead.id); }}>Not a Fit</Btn>
            </div>
          )}
          {selLead.status === "accepted" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ background: B.successPale, borderLeft: `3px solid ${B.success}`, padding: "14px 16px", textAlign: "center", marginBottom: 2 }}><div style={{ fontSize: 11, fontWeight: 700, color: B.success }}>Call is Scheduled</div><div style={{ fontSize: 10, color: B.mid, fontWeight: 300, marginTop: 3 }}>When the call is done, mark it below</div></div>
              <Btn full variant="blush" onClick={() => { markHappened(selLead.id); setSelLead(p => ({ ...p, status: "happened" })); }}>Mark Call as Done</Btn>
              <Btn full variant="ghost" onClick={() => { undoLead(selLead.id); }}>Move Back to Waiting</Btn>
            </div>
          )}
          {selLead.status === "happened" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ background: "#F3EEF9", borderLeft: `3px solid #7B5EA7`, padding: "14px 16px", marginBottom: 2 }}><div style={{ fontSize: 11, fontWeight: 700, color: "#7B5EA7" }}>Call Complete — What happened?</div></div>
              <Btn full variant="blush" onClick={() => { enroll(selLead.id); setSelLead(p => ({ ...p, status: "enrolled" })); }}>They Said Yes — Enroll</Btn>
              <Btn full variant="ghost" onClick={() => { followup(selLead.id); }}>Follow Up Later</Btn>
              <Btn full variant="ghost" onClick={() => { decline(selLead.id); }}>Not a Fit</Btn>
              <Btn full variant="ghost" onClick={() => { undoLead(selLead.id); }}>Move Back</Btn>
            </div>
          )}
          {selLead.status === "enrolled" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ background: B.blushPale, borderLeft: `3px solid ${B.blush}`, padding: "14px 16px", marginBottom: 2 }}><div style={{ fontSize: 11, fontWeight: 700, color: B.blush }}>Ready to Enroll</div><div style={{ fontSize: 10, color: B.mid, fontWeight: 300, marginTop: 3 }}>Send the mentee invite to get them into the portal</div></div>
              <Btn full variant="blush" onClick={() => inviteMenteeFromLead(selLead)} disabled={!!selLead?.invited || invitingLead === selLead?.id}>{invitingLead === selLead?.id ? "Sending Invite…" : selLead?.invited ? `Invited ${selLead.invitedAt}` : "Invite as Mentee"}</Btn>
              <Btn full variant="ghost" onClick={() => { undoLead(selLead.id); }}>Move Back</Btn>
            </div>
          )}
          {selLead.status === "declined" && <Btn full variant="ghost" onClick={() => { undoLead(selLead.id); }}>Move Back to Waiting</Btn>}
          {selLead.status === "followup" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Btn full variant="blush" onClick={() => { accept(selLead.id); setSelLead(p => ({ ...p, status: "accepted" })); }}>Ready — Confirm the Call</Btn>
              <Btn full variant="ghost" onClick={() => { undoLead(selLead.id); }}>Move Back to Waiting</Btn>
            </div>
          )}
        </div>
      </div>
    );
  })() : null;

  // ── Board View — 4 active columns ───────────────────────────────────────
  const boardCols = [
    { key: "pending",  label: "Waiting on Me",  color: B.amber,    pale: B.amberPale,    desc: "Booked — awaiting confirmation" },
    { key: "accepted", label: "Call Confirmed",  color: B.success,  pale: B.successPale,  desc: "Scheduled — call hasn't happened yet" },
    { key: "happened", label: "Call Happened",   color: "#7B5EA7",  pale: "#F3EEF9",      desc: "Call done — decide the outcome" },
    { key: "enrolled", label: "Enrolled",        color: B.blush,    pale: B.blushPale,    desc: "They said yes — ready to invite" },
  ];

  const BoardView = (
    <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingBottom: 16, minHeight: 400 }}>
      {boardCols.map(col => {
        const colLeads = mainLeads.filter(l => l.status === col.key);
        return (
          <div key={col.key} style={{ flex: "0 0 260px", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "10px 14px", background: col.pale, borderTop: `3px solid ${col.color}`, marginBottom: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: col.color, letterSpacing: 2, textTransform: "uppercase" }}>{col.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: col.color, background: col.color + "22", padding: "2px 8px" }}>{colLeads.length}</span>
              </div>
              <div style={{ fontSize: 9, color: col.color, fontWeight: 300, opacity: 0.8 }}>{col.desc}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
              {colLeads.length === 0 && (
                <div style={{ padding: "24px 14px", textAlign: "center", color: B.silver, fontSize: 11, fontWeight: 300, border: `1px dashed ${B.cloud}` }}>None here yet</div>
              )}
              {colLeads.map(lead => (
                <div key={lead.id} onClick={() => { setSelLead(lead); setShowDetail(true); }} style={{ background: B.white, border: `1px solid ${B.cloud}`, borderLeft: `3px solid ${col.color}`, padding: "12px 14px", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 26, height: 26, background: B.black, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: B.white, flexShrink: 0 }}>{lead.name.split(" ").map(w => w[0]).join("")}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: B.black, letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</div>
                      <div style={{ fontSize: 9, color: B.mid, fontWeight: 300 }}>{lead.ig}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: B.black, background: B.off, padding: "3px 8px", marginBottom: 8, display: "inline-block" }}>{lead.tier}</div>
                  <p style={{ fontSize: 10, color: B.mid, margin: "0 0 8px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", fontWeight: 300 }}>{lead.goal}</p>
                  <div style={{ fontSize: 9, color: B.mid, fontWeight: 300, marginBottom: 10 }}>{lead.slot.date} · {lead.slot.time}</div>

                  {/* Actions per stage */}
                  {col.key === "pending" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Btn size="sm" variant="blush" onClick={ev => { ev.stopPropagation(); accept(lead.id); }}>Confirm Call</Btn>
                      <div style={{ display: "flex", gap: 2 }}>
                        <Btn size="sm" variant="ghost" onClick={ev => { ev.stopPropagation(); followup(lead.id); }}>Follow Up Later</Btn>
                        <Btn size="sm" variant="ghost" onClick={ev => { ev.stopPropagation(); decline(lead.id); }}>Not a Fit</Btn>
                      </div>
                    </div>
                  )}
                  {col.key === "accepted" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Btn size="sm" variant="blush" onClick={ev => { ev.stopPropagation(); markHappened(lead.id); }}>Mark Call as Done</Btn>
                      <Btn size="sm" variant="ghost" onClick={ev => { ev.stopPropagation(); undoLead(lead.id); }}>Move Back</Btn>
                    </div>
                  )}
                  {col.key === "happened" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Btn size="sm" variant="blush" onClick={ev => { ev.stopPropagation(); enroll(lead.id); }}>They Said Yes — Enroll</Btn>
                      <div style={{ display: "flex", gap: 2 }}>
                        <Btn size="sm" variant="ghost" onClick={ev => { ev.stopPropagation(); followup(lead.id); }}>Follow Up Later</Btn>
                        <Btn size="sm" variant="ghost" onClick={ev => { ev.stopPropagation(); decline(lead.id); }}>Not a Fit</Btn>
                      </div>
                      <Btn size="sm" variant="ghost" onClick={ev => { ev.stopPropagation(); undoLead(lead.id); }}>Move Back</Btn>
                    </div>
                  )}
                  {col.key === "enrolled" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Btn size="sm" variant="blush" onClick={ev => { ev.stopPropagation(); inviteMenteeFromLead(lead); }} disabled={!!lead.invited || invitingLead === lead.id}>{invitingLead === lead.id ? "Sending…" : lead.invited ? "Invited" : "Invite as Mentee"}</Btn>
                      <Btn size="sm" variant="ghost" onClick={ev => { ev.stopPropagation(); undoLead(lead.id); }}>Move Back</Btn>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── List View ────────────────────────────────────────────────────────────
  const ListView = (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: FONTS.body }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${B.cloud}` }}>
            {["Name", "Tier", "Call Slot", "Found Via", "Submitted", "Stage", "Actions"].map(h => (
              <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 8, fontWeight: 700, color: B.mid, letterSpacing: 1.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mainLeads.map(lead => {
            const [sc] = scMap[lead.status] || [B.mid];
            return (
              <tr key={lead.id} onClick={() => { setSelLead(lead); setShowDetail(true); }} style={{ borderBottom: `1px solid ${B.cloud}`, cursor: "pointer", background: selLead?.id === lead.id ? B.blushPale : "transparent" }}>
                <td style={{ padding: "12px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, background: B.black, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: B.white, flexShrink: 0 }}>{lead.name.split(" ").map(w => w[0]).join("")}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: B.black, letterSpacing: "0.02em" }}>{lead.name}</div>
                      <div style={{ fontSize: 9, color: B.mid, fontWeight: 300 }}>{lead.ig}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 12px", color: B.charcoal, fontWeight: 400, whiteSpace: "nowrap" }}>{lead.tier}</td>
                <td style={{ padding: "12px 12px", color: B.charcoal, whiteSpace: "nowrap" }}>{lead.slot.date} · {lead.slot.time}</td>
                <td style={{ padding: "12px 12px", color: B.mid, fontWeight: 300 }}>{lead.how}</td>
                <td style={{ padding: "12px 12px", color: B.mid, fontWeight: 300, whiteSpace: "nowrap" }}>{lead.submitted}</td>
                <td style={{ padding: "12px 12px" }}>
                  <span style={{ fontSize: 8, fontWeight: 700, color: sc, letterSpacing: 1.5, textTransform: "uppercase", background: sc + "18", padding: "3px 8px" }}>{stageLabel[lead.status] || lead.status}</span>
                </td>
                <td style={{ padding: "12px 12px" }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    {lead.status === "pending" && <><Btn size="sm" variant="blush" onClick={() => accept(lead.id)}>Confirm</Btn><Btn size="sm" variant="ghost" onClick={() => followup(lead.id)}>Later</Btn><Btn size="sm" variant="ghost" onClick={() => decline(lead.id)}>Not a Fit</Btn></>}
                    {lead.status === "accepted" && <><Btn size="sm" variant="blush" onClick={() => markHappened(lead.id)}>Call Done</Btn><Btn size="sm" variant="ghost" onClick={() => undoLead(lead.id)}>Move Back</Btn></>}
                    {lead.status === "happened" && <><Btn size="sm" variant="blush" onClick={() => enroll(lead.id)}>Enroll</Btn><Btn size="sm" variant="ghost" onClick={() => followup(lead.id)}>Later</Btn><Btn size="sm" variant="ghost" onClick={() => decline(lead.id)}>Not a Fit</Btn></>}
                    {lead.status === "enrolled" && <Btn size="sm" variant="blush" onClick={() => {}}>Invite</Btn>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {mainLeads.length === 0 && (
        <div style={{ padding: "40px", textAlign: "center", color: B.silver, fontSize: 13, fontWeight: 300 }}>Your board is clear — you are all caught up.</div>
      )}
    </div>
  );

  const LeadsView = (
    <div style={{ display: "flex", height: useSidebar ? "calc(100vh - 56px)" : "auto", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "20px 18px 40px" : "28px 28px", minWidth: 0 }}>

        {/* Header */}
        <Section style={{ marginBottom: 4 }}>Discovery Calls</Section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 32 : 44, textTransform: "uppercase", color: B.black, margin: 0, letterSpacing: "-0.5px" }}>Future Nail Bosses</h1>
          <div style={{ display: "flex", border: `1px solid ${B.cloud}`, overflow: "hidden" }}>
            {[{ k: "board", label: "Board View" }, { k: "list", label: "List View" }].map(v => (
              <button key={v.k} onClick={() => setCrmView(v.k)} style={{ padding: "8px 16px", border: "none", background: crmView === v.k ? B.black : "transparent", color: crmView === v.k ? B.white : B.mid, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: 1.5, textTransform: "uppercase" }}>{v.label}</button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 2, marginBottom: 20 }}>
          {[
            { label: "Waiting on Me",   value: leads.filter(l => l.status === "pending").length,  color: B.amber },
            { label: "Call Confirmed",  value: leads.filter(l => l.status === "accepted").length, color: B.success },
            { label: "Call Happened",   value: leads.filter(l => l.status === "happened").length, color: "#7B5EA7" },
            { label: "Enrolled",        value: leads.filter(l => l.status === "enrolled").length, color: B.blush },
          ].map(s => (
            <div key={s.label} style={{ padding: "12px 16px", background: B.white, border: `1px solid ${B.cloud}`, borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 28, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 8, fontWeight: 700, color: B.mid, letterSpacing: 1.5, textTransform: "uppercase", lineHeight: 1.4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Main view */}
        {crmIsMobile && crmView === "board" ? (
          <div style={{ padding:"8px 0 12px", fontSize:10, color:B.mid, fontWeight:300 }}>
            💡 Tip: List view is easier on mobile — try switching above.
          </div>
        ) : null}
        {crmView === "board" ? BoardView : ListView}

        {/* Archive */}
        {archivedLeads.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <button onClick={() => setShowArchive(p => !p)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: B.mid, letterSpacing: 2, textTransform: "uppercase" }}>{showArchive ? "▼" : "▶"} Archive · {archivedLeads.length} {archivedLeads.length === 1 ? "lead" : "leads"}</span>
            </button>
            {showArchive && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {archivedLeads.map(lead => {
                  const [sc] = scMap[lead.status] || [B.mid];
                  return (
                    <div key={lead.id} style={{ background: B.off, border: `1px solid ${B.cloud}`, borderLeft: `3px solid ${sc}`, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", opacity: 0.75 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 26, height: 26, background: B.steel, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: B.white, flexShrink: 0 }}>{lead.name.split(" ").map(w => w[0]).join("")}</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: B.charcoal }}>{lead.name}</div>
                          <div style={{ fontSize: 9, color: B.mid, fontWeight: 300 }}>{lead.tier}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 8, fontWeight: 700, color: sc, letterSpacing: 1.5, textTransform: "uppercase", background: sc + "18", padding: "3px 8px" }}>{stageLabel[lead.status]}</span>
                        <Btn size="sm" variant="ghost" onClick={() => undoLead(lead.id)}>Move Back</Btn>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {(!isMobile || showDetail) && selLead && LeadDetailPanel}
    </div>
  );

  // ── Tier data for welcome letter ────────────────────────────────────────
  const TIER_DATA = {
    "Hourly Session": {
      price: "$250", tagline: "per session / no commitment",
      includes: [
        { item: "1 virtual session (60 min)", value: "$500" },
        { item: "Goal-focused agenda set by you", value: "$0" },
        { item: "Written action plan after session", value: "$250" },
        { item: "Perfect first step — No commitment", value: "" },
      ],
      standalone: "$750", investment: "$250", save: "+ $500 saved",
      checkins: null, plan: null,
    },
    "30-Day Intensive": {
      price: "$1,120", tagline: "one month / real momentum",
      includes: [
        { item: "2 virtual sessions (60 min each)", value: "$1,000" },
        { item: "2 check-ins/week — 8 total", value: "$800" },
        { item: "Personalized 30-day plan", value: "$400" },
        { item: "Pricing + client attraction guidance", value: "$400" },
        { item: "DM support during business hours", value: "$250" },
        { item: "End-of-month review + roadmap", value: "$750" },
      ],
      standalone: "$3,600", investment: "$1,120", save: "+ $2,480 saved",
      checkins: "2 weekly check-ins via email on Tuesday and Friday",
      plan: "personalized 30-day plan",
    },
    "3-Month Elite": {
      price: "$3,360", tagline: "full quarter / complete transformation",
      includes: [
        { item: "6 virtual sessions (60 min each)", value: "$3,000" },
        { item: "2 check-ins/week — 24 total", value: "$2,400" },
        { item: "Personalized 90-day plan", value: "$500" },
        { item: "Skool community access (3 months)", value: "$1,000" },
        { item: "Pricing + client attraction guidance", value: "$400" },
        { item: "DM support during business hours", value: "$250" },
        { item: "End-of-quarter review + roadmap", value: "$1,000" },
      ],
      standalone: "$8,550", investment: "$3,360", save: "+ $5,190 saved",
      checkins: "2 weekly check-ins via email on Tuesday and Friday",
      plan: "personalized 90-day plan",
    },
  };

  // ── Welcome Letter Modal ─────────────────────────────────────────────────
  const WelcomeLetterModal = welcomeLetter ? (() => {
    const tier = TIER_DATA[welcomeLetter.tier] || TIER_DATA["30-Day Intensive"];
    const tierKey = welcomeLetter.tier;
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px" }}>
        <div style={{ background: B.white, width: "100%", maxWidth: 760, position: "relative" }}>
          {/* Close */}
          <button onClick={() => setWelcomeLetter(null)} style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, border: `1px solid ${B.cloud}`, background: B.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}><Ic n="close" size={14} color={B.mid} /></button>

          {/* Letter */}
          <div style={{ padding: "40px 48px", fontFamily: FONTS.body }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
              <Logo height={36} white={false} />
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 32, color: B.black, textTransform: "uppercase", lineHeight: 1 }}>A Mentor</div>
                <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 22, color: B.mid, textTransform: "uppercase", letterSpacing: 2 }}>In Your Corner</div>
              </div>
            </div>

            {/* Body */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 32 }}>
              <div>
                <p style={{ fontSize: 14, color: B.black, marginBottom: 16 }}>Hi {welcomeLetter.name},</p>
                <p style={{ fontSize: 13, color: B.charcoal, lineHeight: 1.8, marginBottom: 12, fontWeight: 300 }}>
                  I'm so excited to support you in this next step of your nail journey. Congratulations on securing your spot in the <strong>{tierKey}</strong> mentorship with me. Most nail techs learn the technical side — but nobody teaches them the business side. How to price without underselling. How to attract clients who stay. How to stop trading time for barely-enough money.
                </p>
                <p style={{ fontSize: 13, color: B.charcoal, lineHeight: 1.8, marginBottom: 12, fontWeight: 300 }}>
                  SayJessToNails was built to close that gap. Not with pressure — with presence.
                </p>
                <p style={{ fontSize: 13, color: B.black, lineHeight: 1.8, marginBottom: 12, fontWeight: 700, fontStyle: "italic" }}>
                  Every session, every check-in, every plan is built around one goal: seeing you win.
                </p>
                <p style={{ fontSize: 13, color: B.charcoal, lineHeight: 1.8, marginBottom: 24, fontWeight: 300 }}>
                  Throughout the program, we will communicate primarily through email so you have a permanent record of your progress and guidance. I look forward to helping you build clarity, confidence, and a stronger strategy for your business.
                </p>
                <div style={{ fontSize: 13, color: B.black, fontFamily: FONTS.script, fontStyle: "italic", marginBottom: 4 }}>Your Mentor, Jessica Ramos</div>
                <div style={{ fontSize: 11, color: B.mid, fontWeight: 300 }}>— Jess</div>
              </div>

              {/* Contact + Next Steps */}
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: B.blush, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Staying in Touch</div>
                  {[["website", "www.SayJessToNails.com"], ["instagram", "@sayjesstonails"], ["mobile", "954.544.2888"]].map(([l, v]) => (
                    <div key={l} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: B.mid, letterSpacing: 1, textTransform: "uppercase", fontStyle: "italic" }}>{l}</div>
                      <div style={{ fontSize: 10, color: B.black, fontWeight: 400 }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: B.charcoal, padding: "16px" }}>
                  <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 28, color: B.blush, textTransform: "uppercase", lineHeight: 1 }}>Next</div>
                  <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 28, color: B.blush, textTransform: "uppercase", lineHeight: 1, marginBottom: 12 }}>Steps</div>
                  {[
                    "Secure Your Spot",
                    "Complete your payment",
                    "Start the transformation" + (welcomeLetter.startDate ? ` on ${welcomeLetter.startDate}` : ""),
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: B.blush, flexShrink: 0 }}>{i + 1}.</span>
                      <span style={{ fontSize: 11, color: B.ivory, fontWeight: 400, lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid ${B.steel}`, marginTop: 12, paddingTop: 12 }}>
                    <p style={{ fontSize: 11, color: B.silver, fontStyle: "italic", lineHeight: 1.6, margin: 0 }}>"I want you to surpass every goal you set — not just hit them, exceed them." <strong style={{ color: B.ivory }}>— Jess</strong></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Program card */}
            <div style={{ marginTop: 32, border: `2px solid ${B.cloud}`, padding: "24px" }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: B.blush, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>{tierKey}</div>
                <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 48, color: B.black, lineHeight: 1 }}>{tier.price}</div>
                <div style={{ fontSize: 11, color: B.mid, fontWeight: 300, marginTop: 4 }}>{tier.tagline}</div>
              </div>
              <div style={{ borderTop: `1px solid ${B.cloud}`, paddingTop: 16 }}>
                {tier.includes.map((inc, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${B.cloud}` }}>
                    <span style={{ fontSize: 11, color: B.charcoal, fontWeight: 300 }}>{inc.item}</span>
                    {inc.value && <span style={{ fontSize: 11, color: B.mid, fontWeight: 400 }}>{inc.value}</span>}
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${B.cloud}` }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: B.mid, letterSpacing: 1, textTransform: "uppercase" }}>Standalone Value</span>
                  <span style={{ fontSize: 11, color: B.mid }}>{tier.standalone}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${B.cloud}` }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: B.black, letterSpacing: 1, textTransform: "uppercase" }}>Your Investment</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: B.black }}>{tier.investment}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: B.blush, letterSpacing: 1, textTransform: "uppercase" }}>You Save</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: B.blush }}>{tier.save}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setWelcomeLetter(null)}>Close</Btn>
              <Btn variant="blush" icon="send" onClick={async () => {
                try {
                  await supabase.functions.invoke('send-message', {
                    body: {
                      send_email: true,
                      welcome_email: true,
                      email_data: {
                        email: welcomeLetter.email,
                        firstName: welcomeLetter.name,
                        tier: welcomeLetter.tier,
                        startDate: welcomeLetter.startDate,
                      }
                    }
                  });
                  await supabase.functions.invoke('send-message', {
                    body: { mentee_email: welcomeLetter.email, sender: "jess", text: `Hi ${welcomeLetter.name}! Your welcome letter has been sent to your email. So excited to work with you! 🎉` }
                  });
                } catch(e) { console.error("Welcome letter error:", e); }
                setWelcomeLetter(null);
              }}>Send to {welcomeLetter.name}</Btn>
            </div>
          </div>
        </div>
      </div>
    );
  })() : null;

  // ── Assign Task Modal ────────────────────────────────────────────────────
  const AssignTaskModal = assignTask ? (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:B.white, width:"100%", maxWidth:460 }}>

        {/* Header */}
        <div style={{ background:B.black, padding:"20px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", borderLeft:`4px solid ${B.blush}` }}>
          <div>
            <div style={{ fontSize:9, fontWeight:700, color:B.blushLight, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Assign Task</div>
            <div style={{ fontSize:16, fontWeight:700, color:B.ivory }}>{assignTask.name}</div>
            <div style={{ fontSize:10, color:B.mid, fontWeight:300 }}>{assignTask.tier}</div>
          </div>
          <button onClick={() => { setAssignTask(null); setTaskForm({ title:"", due_date:"", jess_notes:"" }); }} style={{ width:28, height:28, border:`1px solid #333`, background:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="close" size={13} color={B.mid} /></button>
        </div>

        {/* Form */}
        <div style={{ padding:"24px" }}>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:9, fontWeight:700, color:B.steel, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>Task Title</div>
            <input type="text" value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Post 3 reels this week" style={{ width:"100%", padding:"10px 12px", border:`1px solid ${B.cloud}`, fontSize:13, fontFamily:FONTS.body, outline:"none", color:B.black, boxSizing:"border-box" }} />
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:9, fontWeight:700, color:B.steel, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>Due Date</div>
            <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} style={{ width:"100%", padding:"10px 12px", border:`1px solid ${B.cloud}`, fontSize:13, fontFamily:FONTS.body, outline:"none", color:B.black, boxSizing:"border-box" }} />
          </div>

          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:9, fontWeight:700, color:B.steel, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>Notes for Mentee (optional)</div>
            <textarea value={taskForm.jess_notes} onChange={e => setTaskForm(p => ({ ...p, jess_notes: e.target.value }))} rows={3} placeholder="Add context, instructions, or encouragement..." style={{ width:"100%", padding:"10px 12px", border:`1px solid ${B.cloud}`, fontSize:13, fontFamily:FONTS.body, outline:"none", color:B.black, boxSizing:"border-box", resize:"vertical" }} />
          </div>

          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="ghost" onClick={() => { setAssignTask(null); setTaskForm({ title:"", due_date:"", jess_notes:"" }); }}>Cancel</Btn>
            <Btn full variant="blush" icon="check" disabled={taskBusy || !taskForm.title.trim()} onClick={async () => {
              setTaskBusy(true);
              try {
                const dueDateFormatted = taskForm.due_date
                  ? new Date(taskForm.due_date + "T00:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })
                  : null;
                const { data, error } = await supabase.functions.invoke('assign-task', {
                  body: {
                    action: 'insert',
                    mentee_email: assignTask.email,
                    title: taskForm.title.trim(),
                    due_date: dueDateFormatted,
                    jess_notes: taskForm.jess_notes.trim() || null,
                  }
                });
                if (error) throw error;
                if (data?.error) throw new Error(data.error);
                // Send automated message
                await supabase.functions.invoke('send-message', {
                  body: {
                    mentee_email: assignTask.email,
                    sender: "jess",
                    text: `Hi ${assignTask.firstName || assignTask.name.split(" ")[0]}, I just assigned you a new task: "${taskForm.title}"${dueDateFormatted ? ` — due ${dueDateFormatted}` : ""}. Check your Assignments tab for details!`
                  }
                });
                setTaskForm({ title:"", due_date:"", jess_notes:"" });
                setAssignTask(null);
              } catch (e) {
                alert(`Error: ${e.message}`);
              }
              setTaskBusy(false);
            }}>{taskBusy ? "Assigning…" : "Assign Task"}</Btn>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // ── Add Resource Modal ───────────────────────────────────────────────────
  const ResourceModal = addResource ? (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:B.white, width:"100%", maxWidth:460 }}>
        <div style={{ background:B.black, padding:"20px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", borderLeft:`4px solid ${B.blush}` }}>
          <div>
            <div style={{ fontSize:9, fontWeight:700, color:B.blushLight, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Add Resource</div>
            <div style={{ fontSize:16, fontWeight:700, color:B.ivory }}>{addResource === "global" ? "All Mentees" : addResource.mentee.name}</div>
            <div style={{ fontSize:10, color:B.mid, fontWeight:300 }}>{addResource === "global" ? "This resource will be visible to every mentee" : addResource.mentee.tier}</div>
          </div>
          <button onClick={() => setAddResource(null)} style={{ width:28, height:28, border:`1px solid #333`, background:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="close" size={13} color={B.mid} /></button>
        </div>
        <div style={{ padding:"24px" }}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:9, fontWeight:700, color:B.mid, letterSpacing:1.5, textTransform:"uppercase", display:"block", marginBottom:6 }}>Title *</label>
            <input value={resourceForm.title} onChange={e => setResourceForm(f => ({...f, title:e.target.value}))} placeholder="e.g. Pricing Confidence Guide" style={{ width:"100%", padding:"10px 12px", border:`1px solid ${B.cloud}`, fontSize:13, fontFamily:FONTS.body, outline:"none", boxSizing:"border-box" }} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:9, fontWeight:700, color:B.mid, letterSpacing:1.5, textTransform:"uppercase", display:"block", marginBottom:6 }}>Description</label>
            <input value={resourceForm.description} onChange={e => setResourceForm(f => ({...f, description:e.target.value}))} placeholder="What is this resource about?" style={{ width:"100%", padding:"10px 12px", border:`1px solid ${B.cloud}`, fontSize:13, fontFamily:FONTS.body, outline:"none", boxSizing:"border-box" }} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:9, fontWeight:700, color:B.mid, letterSpacing:1.5, textTransform:"uppercase", display:"block", marginBottom:6 }}>Category</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {RESOURCE_CATS.map(cat => (
                <button key={cat} onClick={() => setResourceForm(f => ({...f, category:cat}))}
                  style={{ padding:"5px 10px", border:`1px solid ${resourceForm.category===cat ? B.blush : B.cloud}`, background: resourceForm.category===cat ? B.blush : "transparent", color: resourceForm.category===cat ? B.white : B.mid, fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:0.5, textTransform:"uppercase" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:9, fontWeight:700, color:B.mid, letterSpacing:1.5, textTransform:"uppercase", display:"block", marginBottom:6 }}>File *</label>
            <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4,.mov" onChange={e => setResourceForm(f => ({...f, file:e.target.files[0]}))} style={{ fontSize:12, fontFamily:FONTS.body, width:"100%" }} />
            {resourceForm.file && <div style={{ fontSize:10, color:B.success, marginTop:6 }}>✓ {resourceForm.file.name}</div>}
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={() => setAddResource(null)}>Cancel</Btn>
            <Btn variant="blush" onClick={async () => {
              if (!resourceForm.title || !resourceForm.file) { alert("Title and file are required."); return; }
              setResourceUploading(true);
              try {
                const file = resourceForm.file;
                const ext = file.name.split('.').pop();
                const fileName = `${Date.now()}-${file.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage.from("resources").upload(fileName, file, { contentType: file.type });
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage.from("resources").getPublicUrl(fileName);
                const menteeEmail = addResource === "global" ? null : addResource.mentee.email;
                await supabase.functions.invoke("assign-task", { body: { action: "insert_resource", title: resourceForm.title, description: resourceForm.description, file_url: urlData.publicUrl, file_name: file.name, file_type: ext, mentee_email: menteeEmail, category: resourceForm.category || "General" } });
                // Notify mentee if specific
                if (menteeEmail) {
                  await supabase.functions.invoke('send-message', {
                    body: { mentee_email: menteeEmail, sender:"jess", text:`📎 I just added a new resource for you: "${resourceForm.title}". Check your Resources tab!` }
                  });
                }
                setAddResource(null);
                setResourceForm({ title:"", description:"", file:null });
                alert("Resource added successfully!");
              } catch(e) { alert(`Error: ${e.message}`); }
              setResourceUploading(false);
            }} disabled={resourceUploading}>{resourceUploading ? "Uploading…" : "Upload Resource"}</Btn>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // ── Session Scheduling Modal ─────────────────────────────────────────────
  const hasExistingSession = scheduleSession?.nextSession?.date;

  const SessionScheduleModal = scheduleSession ? (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div style={{ background: B.white, width: "100%", maxWidth: 480, margin: "auto" }}>

        {/* Header */}
        <div style={{ background: B.black, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `4px solid ${B.blush}` }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: B.blushLight, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{hasExistingSession ? "Manage Session" : "Schedule Session"}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: B.ivory }}>{scheduleSession.name}</div>
            <div style={{ fontSize: 10, color: B.mid, fontWeight: 300 }}>{scheduleSession.tier}</div>
          </div>
          <button onClick={() => { setScheduleSession(null); setSessionForm({ type:"", date:"", time:"", notes:"" }); }} style={{ width: 28, height: 28, border: `1px solid #333`, background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="close" size={13} color={B.mid} /></button>
        </div>

        {/* Existing session banner */}
        {hasExistingSession && (
          <div style={{ background: B.amberPale, borderLeft: `3px solid ${B.amber}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: B.amber, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Currently Scheduled</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: B.black }}>{scheduleSession.nextSession.type}</div>
              <div style={{ fontSize: 11, color: B.steel, fontWeight: 300 }}>{scheduleSession.nextSession.date} · {scheduleSession.nextSession.time}</div>
            </div>
            <button disabled={sessionBusy} onClick={async () => {
              if (!window.confirm(`Cancel the session for ${scheduleSession.firstName || scheduleSession.name.split(" ")[0]}? They will receive a message in their portal.`)) return;
              setSessionBusy(true);
              try {
                await supabase.functions.invoke('assign-task', { body: { action: 'upsert_profile', profile: {
                  email: scheduleSession.email,
                  next_session_date: null,
                  next_session_time: null,
                  next_session_type: null,
                } } });
                // Send automated message via edge function
                await supabase.functions.invoke('send-message', {
                  body: {
                    mentee_email: scheduleSession.email,
                    sender: "jess",
                    text: `Hi ${scheduleSession.firstName || scheduleSession.name.split(" ")[0]}, I need to cancel our upcoming session (${scheduleSession.nextSession?.type}). I'll be in touch shortly to reschedule. Sorry for any inconvenience!`
                  }
                });
                setMenteeList(p => p.map(m => m.email === scheduleSession.email ? { ...m, nextSession: null } : m));
                setScheduleSession(null);
                setSessionForm({ type:"", date:"", time:"", notes:"" });
              } catch (e) {
                alert(`Error: ${e.message}`);
              }
              setSessionBusy(false);
            }} style={{ padding: "8px 14px", background: "none", border: `1px solid ${B.amber}`, color: B.amber, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: 1, textTransform: "uppercase" }}>
              Cancel Session
            </button>
          </div>
        )}

        {/* Form */}
        <div style={{ padding: "24px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: B.black, marginBottom: 16 }}>{hasExistingSession ? "Reschedule to a new date:" : "Set a new session:"}</div>

          {/* Session type */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: B.steel, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Session Type</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 220, overflowY: "auto" }}>
              {["Session 1 — Foundation & Plan", "Session 2 — Pricing & Technique", "Session 3 — Marketing Deep Dive", "Session 4 — Client Retention", "Session 5 — Scale & Systems", "Session 6 — End-of-Quarter Review", "Check-in", "End-of-Month Review"].map(opt => (
                <button key={opt} onClick={() => setSessionForm(p => ({ ...p, type: opt }))} style={{ padding: "10px 14px", border: `1px solid ${sessionForm.type === opt ? B.blush : B.cloud}`, background: sessionForm.type === opt ? B.blushPale : "transparent", color: sessionForm.type === opt ? B.blush : B.steel, fontSize: 12, fontWeight: sessionForm.type === opt ? 700 : 400, cursor: "pointer", fontFamily: FONTS.body, textAlign: "left" }}>{opt}</button>
              ))}
            </div>
          </div>

          {/* Date and time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: B.steel, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Date</div>
              <input type="date" value={sessionForm.date} onChange={e => setSessionForm(p => ({ ...p, date: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${B.cloud}`, fontSize: 13, fontFamily: FONTS.body, outline: "none", color: B.black, boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: B.steel, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Time (EST)</div>
              <input type="time" value={sessionForm.time} onChange={e => setSessionForm(p => ({ ...p, time: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${B.cloud}`, fontSize: 13, fontFamily: FONTS.body, outline: "none", color: B.black, boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: B.steel, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Notes for Mentee (optional)</div>
            <textarea value={sessionForm.notes} onChange={e => setSessionForm(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder="e.g. We'll focus on your rebooking language..." style={{ width: "100%", padding: "10px 12px", border: `1px solid ${B.cloud}`, fontSize: 13, fontFamily: FONTS.body, outline: "none", color: B.black, boxSizing: "border-box", resize: "vertical" }} />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={() => { setScheduleSession(null); setSessionForm({ type:"", date:"", time:"", notes:"" }); }}>Close</Btn>
            <Btn full variant="blush" icon="calendar" disabled={sessionBusy || !sessionForm.type || !sessionForm.date || !sessionForm.time} onClick={async () => {
              setSessionBusy(true);
              const dateFormatted = new Date(sessionForm.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const timeFormatted = new Date("1970-01-01T" + sessionForm.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              try {
                await supabase.functions.invoke('assign-task', { body: { action: 'upsert_profile', profile: {
                  email: scheduleSession.email,
                  next_session_date: dateFormatted,
                  next_session_time: `${timeFormatted} EST`,
                  next_session_type: sessionForm.type,
                } } });
                const firstName = scheduleSession.firstName || scheduleSession.name.split(" ")[0];
                // Send automated message via edge function
                const msgText = hasExistingSession
                  ? `Hi ${firstName}, your session has been rescheduled to ${dateFormatted} at ${timeFormatted} EST — ${sessionForm.type}. See you then!`
                  : `Hi ${firstName}, your live session has been scheduled for ${dateFormatted} at ${timeFormatted} EST — ${sessionForm.type}. Looking forward to it!`;
                await supabase.functions.invoke('send-message', {
                  body: {
                    mentee_email: scheduleSession.email,
                    sender: "jess",
                    text: msgText,
                    send_email: true,
                    email_data: {
                      email: scheduleSession.email,
                      firstName,
                      sessionType: sessionForm.type,
                      sessionDate: dateFormatted,
                      sessionTime: `${timeFormatted} EST`,
                      isReschedule: hasExistingSession
                    }
                  }
                });
                setMenteeList(p => p.map(m => m.email === scheduleSession.email ? { ...m, nextSession: { date: dateFormatted, time: `${timeFormatted} EST`, type: sessionForm.type } } : m));
                setScheduleSession(null);
                setSessionForm({ type:"", date:"", time:"", notes:"" });
              } catch (e) {
                alert(`Error: ${e.message}`);
              }
              setSessionBusy(false);
            }}>{sessionBusy ? "Saving…" : hasExistingSession ? "Reschedule Session" : "Schedule & Save"}</Btn>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const MessagesView = (
    <div style={{ display: "flex", height: isMobile ? "calc(100dvh - 116px)" : "calc(100vh - 56px)", overflow: "hidden" }}>

      {/* ── Contact Sidebar ── */}
      {(!isMobile || showChatList) && (
        <div style={{ width: isMobile ? "100%" : 260, borderRight: `1px solid ${B.cloud}`, background: B.white, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "18px 20px", borderBottom: `1px solid ${B.cloud}`, background: B.black }}>
            <div style={{ fontSize:9, fontWeight:700, color:B.blushLight, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Messages</div>
            <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 28, textTransform: "uppercase", color: B.ivory, margin: 0, letterSpacing: "-0.5px" }}>Inbox</h2>
          </div>
          <div style={{ flex:1, overflowY:"auto" }}>
            {contacts.length === 0 ? (
              <div style={{ padding:"32px 18px", textAlign:"center", color:B.mid, fontSize:13, fontWeight:300 }}>No messages yet.</div>
            ) : contacts.map((c, i) => {
              const isActive = selChat === i;
              return (
                <div key={i} onClick={() => { setSelChat(i); if (isMobile) setShowChatList(false); }}
                  style={{ padding:"14px 18px", borderBottom:`1px solid ${B.cloud}`, cursor:"pointer", borderLeft:`3px solid ${isActive ? B.blush : "transparent"}`, background: isActive ? B.blushPale : "transparent", transition:"background .15s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    {/* Avatar */}
                    <div style={{ width:40, height:40, background: isActive ? B.blush : B.black, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:B.white, flexShrink:0, letterSpacing:"0.05em", transition:"background .15s" }}>
                      {c.name.split(" ").map(w => w[0]).join("").slice(0,2)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                        <span style={{ fontSize:13, fontWeight:700, color: isActive ? B.blush : B.black }}>{c.name}</span>
                        {c.unread > 0 && <span style={{ background:B.blush, color:B.white, fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:10 }}>{c.unread}</span>}
                      </div>
                      <div style={{ fontSize:10, color:B.mid, fontWeight:300, letterSpacing:0.5, textTransform:"uppercase" }}>{c.tier === "elite" ? "3-Month Elite" : "30-Day Intensive"}</div>
                      <p style={{ fontSize:11, color:B.mid, margin:"4px 0 0", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", fontWeight:300 }}>{c.preview}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {(!isMobile || !showChatList) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {selChat === null || !contacts[selChat] ? (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:B.off }}>
              <div style={{ textAlign:"center" }}>
                <Ic n="message" size={40} color={B.cloud} />
                <p style={{ color:B.mid, fontSize:13, marginTop:16, fontWeight:300 }}>Select a conversation from the left</p>
              </div>
            </div>
          ) : (
            <>
          {/* Chat header — clear mentee identity */}
          <div style={{ background:B.black, padding:"14px 20px", display:"flex", alignItems:"center", gap:14, flexShrink:0, borderBottom:`3px solid ${B.blush}` }}>
            {isMobile && <button onClick={() => setShowChatList(true)} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Ic n="back" size={18} color={B.blush} /></button>}
            <div style={{ width:44, height:44, background:B.blush, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:B.white, flexShrink:0 }}>
              {contacts[selChat]?.name.split(" ").map(w => w[0]).join("").slice(0,2)}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:16, fontWeight:700, color:B.ivory, letterSpacing:"0.02em" }}>{contacts[selChat]?.name}</div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:2 }}>
                <span style={{ fontSize:9, fontWeight:700, color:B.blush, border:`1px solid ${B.blush}`, padding:"1px 8px", letterSpacing:1.5, textTransform:"uppercase" }}>{contacts[selChat]?.tier === "elite" ? "3-Month Elite" : "30-Day Intensive"}</span>
                <span style={{ fontSize:10, color:"#666", fontWeight:300 }}>{contacts[selChat]?.email}</span>
              </div>
            </div>
            {/* Safety indicator */}
            <div style={{ background:`${B.blush}20`, border:`1px solid ${B.blush}40`, padding:"6px 12px", flexShrink:0 }}>
              <div style={{ fontSize:8, fontWeight:700, color:B.blushLight, letterSpacing:1.5, textTransform:"uppercase" }}>Sending to</div>
              <div style={{ fontSize:11, fontWeight:700, color:B.blushLight }}>{contacts[selChat]?.name.split(" ")[0]}</div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", background: B.off }}>
            {(chatMsgs[selChat] || []).map((m, i) => {
              const isJ = m.from === "Jess" || m.sender === "jess";
              return (
                <div key={i} style={{ display: "flex", justifyContent: isJ ? "flex-end" : "flex-start", marginBottom: 12 }}>
                  <div style={{ maxWidth: "70%" }}>
                    <div style={{ fontSize:9, color:B.mid, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:3, textAlign: isJ ? "right" : "left" }}>
                      {isJ ? "Jess" : contacts[selChat]?.name.split(" ")[0]}
                    </div>
                    <div style={{ background: isJ ? B.black : B.white, border: isJ ? "none" : `1px solid ${B.cloud}`, padding: "10px 14px" }}>
                      {m.audioUrl ? (
                        <div>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                            <Ic n="mic" size={12} color={isJ ? B.blushLight : B.blush} />
                            <span style={{ fontSize:10, color: isJ ? B.blushLight : B.blush, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>Voice Note</span>
                          </div>
                          <audio controls src={m.audioUrl} style={{ width:"100%", minWidth:160, height:36 }} controlsList="nodownload" />
                        </div>
                      ) : m.imageUrl ? (
                        <img src={m.imageUrl} alt="Shared" style={{ maxWidth:"100%", maxHeight:220, display:"block", borderRadius:2 }} />
                      ) : (() => {
                        // Detect structured session prep card
                        let prep = null;
                        try { const p = JSON.parse(m.text); if (p.__type === "session_prep") prep = p; } catch {}
                        if (prep) return (
                          <div style={{ minWidth: 220 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, paddingBottom:8, borderBottom:`1px solid ${B.cloud}` }}>
                              <div style={{ width:28, height:28, background:B.blush, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                <Ic n="clipBoard" size={13} color={B.white} />
                              </div>
                              <div>
                                <div style={{ fontSize:9, fontWeight:700, color:B.blush, letterSpacing:1.5, textTransform:"uppercase" }}>Session Prep</div>
                                <div style={{ fontSize:10, color:B.mid, fontWeight:300 }}>{prep.name}</div>
                              </div>
                            </div>
                            {[
                              ["🏆 Win since last session", prep.win],
                              ["⚡ Biggest challenge", prep.challenge],
                              ["🎯 What they need", prep.need],
                            ].map(([label, val]) => (
                              <div key={label} style={{ marginBottom:10 }}>
                                <div style={{ fontSize:8, fontWeight:700, color:B.mid, letterSpacing:1.5, textTransform:"uppercase", marginBottom:3 }}>{label}</div>
                                <div style={{ fontSize:12, color:B.charcoal, fontWeight:400, lineHeight:1.5 }}>{val}</div>
                              </div>
                            ))}
                          </div>
                        );
                        return <p style={{ margin: 0, fontSize: 12, color: isJ ? B.ivory : B.charcoal, lineHeight: 1.55, fontWeight: 300 }}>{m.text}</p>;
                      })()}
                    </div>
                    <div style={{ fontSize: 9, color: B.mid, marginTop: 3, textAlign: isJ ? "right" : "left", fontWeight: 300, letterSpacing: "0.05em" }}>{m.t}</div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEnd} />
          </div>
          <Divider />
          {/* Recording indicator */}
          {recording && recordingFor === "message" && (
            <div style={{ padding:"8px 18px", background:`${B.blush}12`, borderTop:`1px solid ${B.blush}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:B.blush }} />
                <span style={{ fontSize:11, color:B.blush, fontWeight:700 }}>Recording {fmtTime(recordingTime)}</span>
              </div>
              <span style={{ fontSize:10, color:B.mid, fontWeight:300 }}>Tap mic again to send</span>
            </div>
          )}
          <div style={{ padding: "10px 18px", background: B.white, display: "flex", flexDirection:"column", gap:6, flexShrink: 0, borderTop:`1px solid ${B.cloud}` }}>
            <div style={{ fontSize:9, fontWeight:700, color:B.blush, letterSpacing:1.5, textTransform:"uppercase" }}>
              Replying to {contacts[selChat]?.name.split(" ")[0]}
            </div>
            {chatImage && (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background:B.off, border:`1px solid ${B.cloud}` }}>
                <Ic n="file" size={12} color={B.blush} />
                <span style={{ fontSize:11, color:B.charcoal, flex:1, fontWeight:300 }}>{chatImage.name}</span>
                <button onClick={() => { setChatImage(null); if(chatImageRef.current) chatImageRef.current.value=""; }} style={{ background:"none", border:"none", cursor:"pointer", color:B.mid, fontSize:14, padding:0 }}>×</button>
              </div>
            )}
            <div style={{ display:"flex", gap:2 }}>
              <input ref={chatImageRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => setChatImage(e.target.files[0])} />
              <button onClick={() => chatImageRef.current?.click()} style={{ width:44, height:44, border:"none", background:B.blush, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, fontSize:22, color:B.white, fontWeight:300, lineHeight:1 }}>
                +
              </button>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder={recording ? "Recording voice note..." : `Reply to ${contacts[selChat]?.name}…`} disabled={recording} style={{ flex: 1, border: `1px solid ${B.cloud}`, padding: "12px 14px", fontSize: 14, color: B.black, outline: "none", fontFamily: FONTS.body, fontWeight: 300, opacity: recording ? 0.5 : 1 }} />
              {/* Voice note button */}
              <button onClick={async () => { if (!recording) { startRecording("message"); } else if (recordingFor === "message") { await sendVoiceNote(); } }}
                style={{ width:44, height:44, background: recording && recordingFor === "message" ? B.blush : B.off, border:`1px solid ${recording && recordingFor === "message" ? B.blush : B.cloud}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, transition:"all .15s" }}>
                <Ic n="mic" size={16} color={recording && recordingFor === "message" ? B.white : B.mid} />
              </button>
              <button onClick={sendChat} disabled={recording} style={{ width: 44, height: 44, background: B.black, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, opacity: recording ? 0.4 : 1 }}><Ic n="send" size={15} color={B.white} /></button>
            </div>
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );

  const SettingsView = (
    <Pg title="Settings" sub="Platform">
      {[["Profile", [["Display Name", "Jess Ramos"], ["Email", "jess@sayjesstonails.com"], ["Phone", "954-544-2888"], ["Instagram", "@sayjesstonails"], ["Business", "Creations Beauty Lounge, Miramar FL"]]], ["Availability", [["DM Response Hours", "Mon–Fri 9AM–6PM EST"], ["Check-in Days", "Tuesday + Friday"], ["Session Length", "60 minutes"]]], ["Notifications", [["New lead request", "On"], ["Session reminder (24hr)", "On"], ["Check-in due", "On"], ["New message", "On"]]]].map(([grp, fields]) => (
        <Card key={grp} style={{ marginBottom: 2, overflow: "hidden" }}>
          <div style={{ padding: "10px 18px", borderBottom: `1px solid ${B.cloud}`, background: B.off }}>
            <Section>{grp}</Section>
          </div>
          {fields.map(([l, v], i) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", borderBottom: i < fields.length - 1 ? `1px solid ${B.cloud}` : "none" }}>
              <span style={{ fontSize: 13, color: B.charcoal, fontWeight: 300 }}>{l}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: B.black, letterSpacing: "0.03em" }}>{v}</span>
            </div>
          ))}
        </Card>
      ))}
      <Btn full variant="ghost" icon="logout" onClick={onLogout} style={{ marginTop: 8 }}>Sign Out</Btn>
    </Pg>
  );

  const viewMap = { overview: Overview, leads: LeadsView, messages: MessagesView, settings: SettingsView };

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", fontFamily: FONTS.body, background: B.off }}>
      {adminCall && <VideoCallModal
        onClose={async () => {
          if (adminCall.menteeEmail) {
            // Clear room URL
            await supabase.functions.invoke('assign-task', { body: { action: 'upsert_profile', profile: { email: adminCall.menteeEmail, room_url: null } } });
            // If this was a real session, archive it and increment counter
            if (adminCall.isSession) {
              await supabase.functions.invoke('assign-task', { body: { action: 'insert_session', mentee_email: adminCall.menteeEmail, session_type: adminCall.sessionType } });
              // Refresh sessions history
              supabase.functions.invoke("assign-task", { body: { action: "get_sessions" } })
                .then(({ data }) => {
                  const sessions_data = data?.sessions || [];
                  if (sessions_data.length > 0) {
                    const grouped = {};
                    sessions_data.forEach(s => {
                      if (!grouped[s.mentee_email]) grouped[s.mentee_email] = [];
                      grouped[s.mentee_email].push(s);
                    });
                    setSessionsHistory(grouped);
                  }
                });
              // Increment sessions_completed
              const mentee = menteeList.find(m => m.email === adminCall.menteeEmail);
              const newCount = (mentee?.sessionsCompleted || 0) + 1;
              await supabase.functions.invoke('assign-task', { body: { action: 'upsert_profile', profile: {
                email: adminCall.menteeEmail,
                sessions_completed: newCount,
                next_session_date: null,
                next_session_time: null,
                next_session_type: null,
              } } });
              // Update local state
              setMenteeList(p => p.map(m => m.email === adminCall.menteeEmail ? {
                ...m, sessionsCompleted: newCount, nextSession: null
              } : m));
              // Send completion message
              await supabase.functions.invoke('send-message', {
                body: { mentee_email: adminCall.menteeEmail, sender: "jess", text: `Great session today! "${adminCall.sessionType}" is now complete. Keep that momentum going! 🔥` }
              });
            }
          }
          setAdminCall(null);
        }}
        sessionName={adminCall.isSession ? adminCall.sessionType : `Quick Call with ${adminCall.name}`}
        participantName={adminCall.name}
        isHost={true}
        presetRoomUrl={adminCall.roomUrl}
      />}
      {WelcomeLetterModal}
      {SessionScheduleModal}
      {AssignTaskModal}
      {ResourceModal}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=DM+Sans:wght@300;400;500;600&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0} button{-webkit-tap-highlight-color:transparent;transition:opacity .15s;cursor:pointer} button:active{opacity:.78} input,textarea{font-size:16px!important;font-family:inherit} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:${B.cloud}}`}</style>

      {useSidebar && (
        <div style={{ width: 220, background: B.white, borderRight: `1px solid ${B.cloud}`, display: "flex", flexDirection: "column", height: "100%", flexShrink: 0 }}>
          <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${B.cloud}` }}><Logo height={isMobile ? 50 : 60} /></div>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${B.cloud}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: B.white, flexShrink: 0 }}>JR</div>
            <div><div style={{ color: B.ink, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>Jess</div><div style={{ fontSize: 8, color: B.blush, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Admin · Mentor</div></div>
          </div>
          <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
            {ADMIN_NAV.map(({ id, icon, label }) => {
              const on = view === id;
              const badge = id === "leads" ? pending.length : id === "messages" ? adminUnread : 0;
              return <button key={id} onClick={() => setView(id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "none", background: on ? B.blushPale : "transparent", color: on ? B.blush : B.steel, marginBottom: 2, fontFamily: FONTS.body, fontSize: 12, fontWeight: on ? 700 : 400, textAlign: "left", cursor: "pointer", borderLeft: `3px solid ${on ? B.blush : "transparent"}`, transition: "all .15s", letterSpacing: "0.03em", position: "relative", borderRadius: "0 6px 6px 0" }}><Ic n={icon} size={14} color={on ? B.blush : B.mid} />{label}{badge > 0 && <span style={{ marginLeft: "auto", background: B.blush, color: B.white, fontSize: 7, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>{badge}</span>}</button>;
            })}
          </nav>
          <div style={{ padding: "10px 10px", borderTop: `1px solid ${B.cloud}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", marginBottom: 4 }}>
              <Ic n="lock" size={10} color={B.success} /><span style={{ fontSize: 8, color: B.success, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>256-bit encrypted</span>
            </div>
            <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: "none", background: "transparent", color: B.mid, fontFamily: FONTS.body, fontSize: 11, cursor: "pointer", letterSpacing: "0.05em" }}><Ic n="logout" size={13} color={B.mid} />Sign out</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <div style={{ position: "sticky", top: 0, background: B.white, borderBottom: `1px solid ${B.cloud}`, padding: "11px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 50, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: B.mid, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{view}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {pending.length > 0 && <button onClick={() => setView("leads")} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 3 }}><Ic n="bell" size={16} color={B.mid} /><div style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, background: B.blush, fontSize: 6, color: B.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{pending.length}</div></button>}
            {adminUnread > 0 && <button onClick={() => setView("messages")} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 3 }}><Ic n="message" size={16} color={B.mid} /><div style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, background: B.blush, fontSize: 6, color: B.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{adminUnread}</div></button>}
            <div style={{ width: 26, height: 26, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: B.white }}>JR</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {view === "invoices" ? <InvoicesView /> :
           view === "applications" ? <ApplicationsView /> :
           view === "community" ? <AdminCommunity menteeList={menteeList} communityList={communityList} /> :
           view === "mentees" ? (
             <div>
               {menteeDrawer && (
                 <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:500, display:"flex", justifyContent:"flex-end" }} onClick={() => setMenteeDrawer(null)}>
                   <div onClick={e => e.stopPropagation()} style={{ width: isMobile ? "100%" : 400, background:B.white, height:"100%", overflowY:"auto", display:"flex", flexDirection:"column" }}>
                     <div style={{ background:B.black, padding:"20px 24px", borderLeft:`4px solid ${B.blush}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
                       <div>
                         <div style={{ fontSize:9, fontWeight:700, color:B.blushLight, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>{menteeDrawer.tab}</div>
                         <div style={{ fontSize:16, fontWeight:700, color:B.ivory }}>{menteeDrawer.mentee.name}</div>
                       </div>
                       <button onClick={() => setMenteeDrawer(null)} style={{ width:28, height:28, border:`1px solid #333`, background:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="close" size={13} color={B.mid} /></button>
                     </div>
                     <div style={{ padding:"20px 24px", flex:1 }}>
                       {menteeDrawer.tab === "Sessions" && (
                         <div>
                           <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                             <div style={{ fontSize:11, color:B.mid, fontWeight:300 }}>{menteeDrawer.mentee.sessionsCompleted} of {menteeDrawer.mentee.sessionsTotal} sessions completed</div>
                             <Btn size="sm" variant="blush" icon="calendar" onClick={() => { setMenteeDrawer(null); setScheduleSession(menteeDrawer.mentee); }}>Schedule Next</Btn>
                           </div>

                           {/* Completed sessions from history */}
                           {(sessionsHistory[menteeDrawer.mentee.email] || []).map((s, i) => (
                             <div key={s.id || i} style={{ padding:"14px 16px", marginBottom:2, background:B.successPale, borderLeft:`3px solid ${B.success}` }}>
                               <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                 <div>
                                   <div style={{ fontSize:12, fontWeight:700, color:B.black }}>{s.session_type}</div>
                                   <div style={{ fontSize:10, color:B.mid, fontWeight:300, marginTop:2 }}>
                                     {new Date(s.occurred_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })} · Completed
                                   </div>
                                 </div>
                                 <Ic n="check" size={16} color={B.success} />
                               </div>
                             </div>
                           ))}

                           {/* Upcoming sessions */}
                           {menteeDrawer.mentee.nextSession && (
                             <div style={{ padding:"14px 16px", marginBottom:2, background:B.blushPale, borderLeft:`3px solid ${B.blush}` }}>
                               <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                 <div>
                                   <div style={{ fontSize:12, fontWeight:700, color:B.black }}>{menteeDrawer.mentee.nextSession.type}</div>
                                   <div style={{ fontSize:10, color:B.mid, fontWeight:300, marginTop:2 }}>
                                     {menteeDrawer.mentee.nextSession.date} · {menteeDrawer.mentee.nextSession.time}
                                   </div>
                                 </div>
                                 <span style={{ fontSize:8, fontWeight:700, color:B.blush, letterSpacing:1.5, textTransform:"uppercase" }}>Scheduled</span>
                               </div>
                             </div>
                           )}

                           {/* Remaining slots */}
                           {Array.from({ length: Math.max(0, menteeDrawer.mentee.sessionsTotal - menteeDrawer.mentee.sessionsCompleted - (menteeDrawer.mentee.nextSession ? 1 : 0)) }, (_, i) => (
                             <div key={`upcoming-${i}`} style={{ padding:"14px 16px", marginBottom:2, background:B.off, borderLeft:`3px solid ${B.cloud}` }}>
                               <div style={{ fontSize:12, fontWeight:700, color:B.mid }}>Session {menteeDrawer.mentee.sessionsCompleted + (menteeDrawer.mentee.nextSession ? 1 : 0) + i + 1}</div>
                               <div style={{ fontSize:10, color:B.mid, fontWeight:300, marginTop:2 }}>Not yet scheduled</div>
                             </div>
                           ))}

                           {(sessionsHistory[menteeDrawer.mentee.email] || []).length === 0 && !menteeDrawer.mentee.nextSession && (
                             <div style={{ color:B.mid, fontSize:13, fontWeight:300, fontStyle:"italic", padding:"20px 0" }}>No sessions completed yet.</div>
                           )}
                         </div>
                       )}
                       {menteeDrawer.tab === "Days Left" && (
                         <div>
                           <div style={{ marginBottom:20 }}>
                             <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                               <span style={{ fontSize:11, color:B.mid, fontWeight:300 }}>Started {menteeDrawer.mentee.startDate}</span>
                               <span style={{ fontSize:11, fontWeight:700, color:B.blush }}>{menteeDrawer.mentee.daysRemaining} days left</span>
                             </div>
                             <PBar value={Math.round(((menteeDrawer.mentee.totalDays - menteeDrawer.mentee.daysRemaining) / menteeDrawer.mentee.totalDays) * 100)} h={8} />
                             <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                               <span style={{ fontSize:9, color:B.mid, fontWeight:300 }}>Day 1</span>
                               <span style={{ fontSize:9, color:B.mid, fontWeight:300 }}>Day {menteeDrawer.mentee.totalDays}</span>
                             </div>
                           </div>
                           {[
                             { label:"Program Duration", value:`${menteeDrawer.mentee.totalDays} days` },
                             { label:"Days Completed", value:`${menteeDrawer.mentee.totalDays - menteeDrawer.mentee.daysRemaining} days` },
                             { label:"Days Remaining", value:`${menteeDrawer.mentee.daysRemaining} days` },
                             { label:"Completion", value:`${Math.round(((menteeDrawer.mentee.totalDays - menteeDrawer.mentee.daysRemaining) / menteeDrawer.mentee.totalDays) * 100)}%` },
                           ].map(({ label, value }) => (
                             <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${B.cloud}` }}>
                               <span style={{ fontSize:11, color:B.mid, fontWeight:300 }}>{label}</span>
                               <span style={{ fontSize:12, fontWeight:700, color:B.black }}>{value}</span>
                             </div>
                           ))}
                         </div>
                       )}
                       {menteeDrawer.tab === "Wins" && (() => {
                         const email = menteeDrawer.mentee.email;
                         if (!winsCache[email]) {
                           supabase.functions.invoke('assign-task', { body: { action: 'get_wins', mentee_email: email } })
                             .then(({ data }) => {
                               setWinsCache(p => ({ ...p, [email]: data?.wins?.map(w => ({ text: w.text, date: w.date })) || [] }));
                             });
                         }
                         const drawerWins = winsCache[email] || [];
                         return (
                           <div>
                             <div style={{ fontSize:11, color:B.mid, fontWeight:300, marginBottom:16 }}>{drawerWins.length} win{drawerWins.length !== 1 ? "s" : ""} logged</div>
                             {drawerWins.map((w, i) => (
                               <div key={i} style={{ padding:"10px 0", borderBottom:`1px solid ${B.cloud}` }}>
                                 <div style={{ fontSize:12, fontWeight:600, color:B.black, marginBottom:2 }}>{w.text}</div>
                                 <div style={{ fontSize:10, color:B.mid, fontWeight:300 }}>{w.date}</div>
                               </div>
                             ))}
                             {drawerWins.length === 0 && winsCache[email] !== undefined && <div style={{ color:B.mid, fontSize:13, fontWeight:300, fontStyle:"italic" }}>No wins logged yet.</div>}
                             {winsCache[email] === undefined && <div style={{ color:B.mid, fontSize:13, fontWeight:300 }}>Loading wins…</div>}
                           </div>
                         );
                       })()}
                       {menteeDrawer.tab === "Progress" && (() => {
                         const m = menteeDrawer.mentee;
                         const sessionPct = m.sessionsTotal ? Math.round((m.sessionsCompleted / m.sessionsTotal) * 100) : 0;
                         const dayPct = m.totalDays ? Math.round(((m.totalDays - m.daysRemaining) / m.totalDays) * 100) : 0;
                         const overall = Math.round((sessionPct + dayPct) / 2);
                         return (
                           <div>
                             <div style={{ padding:"20px", background:B.blushPale, borderLeft:`3px solid ${B.blush}`, marginBottom:20, textAlign:"center" }}>
                               <div style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:56, color:B.blush, lineHeight:1 }}>{overall}%</div>
                               <div style={{ fontSize:10, color:B.blush, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginTop:4 }}>Overall Progress</div>
                             </div>
                             {[["Sessions", sessionPct], ["Timeline", dayPct]].map(([label, pct]) => (
                               <div key={label} style={{ marginBottom:18 }}>
                                 <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                                   <span style={{ fontSize:11, color:B.steel, fontWeight:300 }}>{label}</span>
                                   <span style={{ fontSize:11, color:B.blush, fontWeight:700 }}>{pct}%</span>
                                 </div>
                                 <PBar value={pct} h={6} />
                               </div>
                             ))}
                           </div>
                         );
                       })()}

                       {menteeDrawer.tab === "Tasks" && (() => {
                         const mTasks = adminTasks[menteeDrawer.mentee.email] || [];
                         return (
                           <div>
                             <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                               <div style={{ fontSize:11, color:B.mid, fontWeight:300 }}>{mTasks.filter(t=>t.completed).length} of {mTasks.length} completed</div>
                               <Btn size="sm" variant="blush" icon="check" onClick={() => { setMenteeDrawer(null); setAssignTask(menteeDrawer.mentee); }}>Assign New</Btn>
                             </div>
                             {mTasks.length === 0 && <div style={{ color:B.mid, fontSize:13, fontWeight:300, fontStyle:"italic" }}>No tasks assigned yet.</div>}
                             {mTasks.map(task => (
                               <div key={task.id} style={{ padding:"12px 14px", marginBottom:2, background: task.completed ? B.successPale : B.off, borderLeft:`3px solid ${task.completed ? B.success : B.cloud}` }}>
                                 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                                   <div style={{ flex:1 }}>
                                     <div style={{ fontSize:12, fontWeight:700, color: task.completed ? B.mid : B.black, textDecoration: task.completed ? "line-through" : "none" }}>{task.title}</div>
                                     {task.due_date && <div style={{ fontSize:9, color:B.blush, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginTop:3 }}>Due {task.due_date}</div>}
                                     {task.mentee_notes && (
                                       <div style={{ marginTop:6, background:B.white, borderLeft:`2px solid ${B.cloud}`, padding:"6px 8px" }}>
                                         <div style={{ fontSize:8, fontWeight:700, color:B.mid, letterSpacing:1.5, textTransform:"uppercase", marginBottom:3 }}>Mentee's Notes</div>
                                         <p style={{ fontSize:11, color:B.charcoal, margin:0, fontWeight:300 }}>{task.mentee_notes}</p>
                                       </div>
                                     )}
                                   </div>
                                   <button onClick={async () => {
                                     if (!window.confirm(`Remove task "${task.title}"?`)) return;
                                     await supabase.functions.invoke('assign-task', {
                                       body: { action: 'delete', task_id: task.id }
                                     });
                                     setAdminTasks(p => {
                                       const updated = { ...p };
                                       updated[menteeDrawer.mentee.email] = (updated[menteeDrawer.mentee.email] || []).filter(t => t.id !== task.id);
                                       return updated;
                                     });
                                   }} style={{ fontSize:9, color:B.mid, border:`1px solid ${B.cloud}`, background:"none", padding:"3px 8px", cursor:"pointer", fontFamily:FONTS.body, fontWeight:700, letterSpacing:1, textTransform:"uppercase", flexShrink:0 }}>Remove</button>
                                 </div>
                               </div>
                             ))}
                           </div>
                         );
                       })()}
                     </div>
                   </div>
                 </div>
               )}
               <div style={{ padding: isMobile ? "20px 18px 100px" : "28px 28px" }}>
                 <Section style={{ marginBottom: 4 }}>Mentees</Section>
                 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:10 }}>
                   <h1 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 32 : 44, textTransform: "uppercase", color: B.black, margin: 0, letterSpacing: "-0.5px" }}>
                     {menteesTab === "active" ? "All Enrolled" : "Graduates"}
                   </h1>
                   <div style={{ display:"flex", gap:2 }}>
                     {[["active", `Active (${menteeList.length})`], ["graduates", `Graduates (${graduates.length})`]].map(([id, label]) => (
                       <button key={id} onClick={() => setMenteesTab(id)} style={{ padding:"8px 16px", border:`1px solid ${menteesTab===id ? B.blush : B.cloud}`, background: menteesTab===id ? B.blush : B.white, color: menteesTab===id ? B.white : B.steel, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:1, textTransform:"uppercase" }}>{label}</button>
                     ))}
                   </div>
                 </div>

                 {menteesTab === "active" && <InviteForm isMobile={isMobile} />}

                 {/* GRADUATES VIEW */}
                 {menteesTab === "graduates" && (
                   <div>
                     <InviteGraduateForm />
                     {graduates.length === 0 && (
                       <div style={{ padding:"40px 0", textAlign:"center", color:B.mid, fontSize:13, fontWeight:300, fontStyle:"italic" }}>No graduates yet — completed mentees will appear here.</div>
                     )}
                     {graduates.map((g, i) => (
                       <div key={i} style={{ background:B.white, marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,0.05)", border:`1px solid ${B.cloud}` }}>
                         <div style={{ background:B.black, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, borderLeft:`4px solid #2D7D4E` }}>
                           <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                             <div style={{ width:42, height:42, background:"#2D7D4E", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:B.white, flexShrink:0 }}>{g.avatar}</div>
                             <div>
                               <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                 <div style={{ fontSize:16, fontWeight:700, color:B.ivory }}>{g.firstName}</div>
                                 <span style={{ fontSize:7, background:"#2D7D4E", color:B.white, padding:"2px 6px", fontWeight:700, letterSpacing:1 }}>🎓 GRAD</span>
                               </div>
                               <div style={{ fontSize:10, color:"#666", fontWeight:300, marginTop:2 }}>{g.email}</div>
                             </div>
                           </div>
                           <div style={{ textAlign:"right", flexShrink:0 }}>
                             <div style={{ fontSize:8, fontWeight:700, color:"#2D7D4E", border:`1px solid #2D7D4E`, padding:"3px 10px", letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 }}>{g.tier}</div>
                             <div style={{ fontSize:9, color:"#555", fontWeight:300 }}>Started {g.startDate}</div>
                           </div>
                         </div>
                         <div style={{ padding:"14px 20px", display:"flex", gap:24, alignItems:"center", background:B.off }}>
                           <div style={{ textAlign:"center" }}>
                             <div style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:22, color:"#2D7D4E" }}>{g.sessionsCompleted}/{g.sessionsTotal}</div>
                             <div style={{ fontSize:8, color:B.mid, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginTop:2 }}>Sessions</div>
                           </div>
                           <div style={{ width:1, height:32, background:B.cloud }} />
                           <div style={{ fontSize:11, color:B.mid, fontWeight:300, flex:1 }}>
                             Community access active — 1 year complimentary
                           </div>
                           <button onClick={() => { setSelChat(menteeList.findIndex(x => x.email === g.email)); setView("messages"); }} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", background:"transparent", border:`1px solid ${B.cloud}`, color:B.steel, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:0.5, textTransform:"uppercase" }}>
                             <Ic n="message" size={11} color={B.steel} />Message
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}

                 {menteesTab === "active" && menteeList.map((m, i) => {
                   const pct = Math.round((m.sessionsCompleted / m.sessionsTotal) * 100);
                   const done = m.milestones?.filter(x => x.done).length || 0;
                   const mTasks = adminTasks[m.email] || [];
                   const statTiles = [
                     { value:`${m.sessionsCompleted}/${m.sessionsTotal}`, label:"Live Sessions", tab:"Sessions" },
                     { value:m.daysRemaining, label:"Days Left", tab:"Days Left" },
                     { value:(winsCache[m.email] || []).length, label:"Wins", tab:"Wins" },
                     { value:`${mTasks.filter(t=>t.completed).length}/${mTasks.length}`, label:"Tasks", tab:"Tasks" },
                     { value:`${pct}%`, label:"Progress", tab:"Progress", accent:true },
                   ];
                   return (
                     <div key={i} style={{ background:B.white, marginBottom:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", border:`1px solid ${B.cloud}` }}>

                       {/* Card header — black bar with mentee identity */}
                       <div style={{ background:B.black, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                         <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                           <div style={{ width:46, height:46, background:B.blush, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:800, color:B.white, flexShrink:0, letterSpacing:"0.05em" }}>{m.avatar}</div>
                           <div>
                             <div style={{ fontSize:16, fontWeight:700, color:B.ivory, letterSpacing:"0.02em" }}>{m.name}</div>
                             <div style={{ fontSize:10, color:"#aaa", fontWeight:300, marginTop:2 }}>{m.email}</div>
                           </div>
                         </div>
                         <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0, maxWidth:isMobile?120:"none" }}>
                           <div style={{ fontSize:8, fontWeight:700, color:B.blush, border:`1px solid ${B.blush}`, padding:"3px 10px", letterSpacing:1.5, textTransform:"uppercase", textAlign:"right", lineHeight:1.3 }}>{m.tier}</div>
                           {!isMobile && <div style={{ fontSize:8, color:"#aaa", fontWeight:300 }}>Since {m.startDate}</div>}
                         </div>
                       </div>

                       {/* Progress bar — full width */}
                       <div style={{ height:3, background:"#f0f0f0" }}>
                         <div style={{ height:"100%", width:`${pct}%`, background: pct >= 75 ? B.success : pct >= 40 ? B.amber : B.blush, transition:"width .5s ease" }} />
                       </div>

                       {/* Stat tiles — 2x2 on mobile, 5-col on desktop */}
                       {isMobile ? (
                         <div style={{ borderBottom:`1px solid ${B.cloud}` }}>
                           <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:0 }}>
                             {statTiles.slice(0,4).map(({ value, label, tab, accent }, idx) => (
                               <button key={label} onClick={() => setMenteeDrawer({ mentee: m, tab })}
                                 style={{ padding:"14px 12px", background:"transparent", border:"none", borderRight: idx%2===0 ? `1px solid ${B.cloud}` : "none", borderBottom:`1px solid ${B.cloud}`, cursor:"pointer", textAlign:"center", fontFamily:FONTS.body }}>
                                 <div style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:22, color: accent ? B.blush : B.black, lineHeight:1 }}>{value}</div>
                                 <div style={{ fontSize:8, color:B.mid, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginTop:4 }}>{label}</div>
                                 <div style={{ fontSize:7, color:B.blush, fontWeight:700, marginTop:2, textTransform:"uppercase" }}>tap →</div>
                               </button>
                             ))}
                           </div>
                           {/* Progress full width */}
                           <button onClick={() => setMenteeDrawer({ mentee: m, tab:"Progress" })}
                             style={{ width:"100%", padding:"12px", background:"transparent", border:"none", cursor:"pointer", textAlign:"center", fontFamily:FONTS.body, display:"flex", alignItems:"center", justifyContent:"center", gap:16 }}>
                             <div>
                               <div style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:26, color:B.blush, lineHeight:1 }}>{pct}%</div>
                               <div style={{ fontSize:8, color:B.mid, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginTop:3 }}>Progress</div>
                             </div>
                             <div style={{ flex:1, height:6, background:B.off, borderRadius:3 }}>
                               <div style={{ height:"100%", width:`${pct}%`, background: pct>=75?B.success:pct>=40?B.amber:B.blush, borderRadius:3 }} />
                             </div>
                             <div style={{ fontSize:7, color:B.blush, fontWeight:700, textTransform:"uppercase" }}>tap →</div>
                           </button>
                         </div>
                       ) : (
                         <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:0, borderBottom:`1px solid ${B.cloud}` }}>
                           {statTiles.map(({ value, label, tab, accent }, idx) => (
                             <button key={label} onClick={() => setMenteeDrawer({ mentee: m, tab })}
                               style={{ padding:"14px 16px", background:"transparent", border:"none", borderRight: idx < statTiles.length-1 ? `1px solid ${B.cloud}` : "none", cursor:"pointer", textAlign:"center", fontFamily:FONTS.body, transition:"background .15s" }}
                               onMouseEnter={e => e.currentTarget.style.background = B.off}
                               onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                               <div style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:22, color: accent ? B.blush : B.black, lineHeight:1 }}>{value}</div>
                               <div style={{ fontSize:8, color:B.mid, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginTop:4 }}>{label}</div>
                               <div style={{ fontSize:7, color:B.blush, fontWeight:700, letterSpacing:0.5, marginTop:2, textTransform:"uppercase" }}>tap →</div>
                             </button>
                           ))}
                         </div>
                       )}

                       {/* Action area — organized groups */}
                       <div style={{ padding:"12px 16px", background:B.white, borderTop:`1px solid ${B.cloud}` }}>

                         {/* Primary actions row */}
                         <div style={{ display:"grid", gridTemplateColumns: m.nextSession ? "1fr 1fr 1fr" : "1fr 1fr", gap:6, marginBottom:6 }}>
                           <button onClick={async () => {
                             const { data, error } = await supabase.functions.invoke('create-video-room', {
                               body: { sessionName: "Impromptu Call", participantName: m.name }
                             });
                             if (error || data?.error) { alert("Could not create video room."); return; }
                             await supabase.functions.invoke('assign-task', { body: { action: 'upsert_profile', profile: { email: m.email, room_url: data.url } } });
                             await supabase.functions.invoke('send-message', {
                               body: { mentee_email: m.email, sender: "jess", text: `Hi ${m.firstName || m.name.split(" ")[0]}! I'm jumping on a quick call — join when you're ready! 📹` }
                             });
                             setAdminCall({ name: m.name, roomUrl: data.url, menteeEmail: m.email, isSession: false });
                           }} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 8px", background:B.black, border:"none", color:B.white, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:0.5, textTransform:"uppercase" }}>
                             <Ic n="video" size={12} color={B.white} />Quick Call
                           </button>

                           {m.nextSession && (
                             <button onClick={async () => {
                               const { data, error } = await supabase.functions.invoke('create-video-room', {
                                 body: { sessionName: m.nextSession.type, participantName: m.name }
                               });
                               if (error || data?.error) { alert("Could not create video room."); return; }
                               await supabase.functions.invoke('assign-task', { body: { action: 'upsert_profile', profile: { email: m.email, room_url: data.url } } });
                               await supabase.functions.invoke('send-message', {
                                 body: { mentee_email: m.email, sender: "jess", text: `Hi ${m.firstName || m.name.split(" ")[0]}! Your session is live — "${m.nextSession.type}". Join whenever you're ready! 🎯` }
                               });
                               setAdminCall({ name: m.name, roomUrl: data.url, menteeEmail: m.email, isSession: true, sessionType: m.nextSession.type });
                             }} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 8px", background:B.blush, border:"none", color:B.white, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:0.5, textTransform:"uppercase" }}>
                               <div style={{ width:6, height:6, borderRadius:"50%", background:B.white }} />
                               Start Session
                             </button>
                           )}

                           <button onClick={() => { setSelChat(i); setView("messages"); }} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 8px", background:B.white, border:`1px solid ${B.steel}`, color:B.black, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:0.5, textTransform:"uppercase" }}>
                             <Ic n="message" size={12} color={B.black} />Message
                           </button>
                         </div>

                         {/* Secondary actions row */}
                         <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:6 }}>
                           <button onClick={() => setScheduleSession(m)} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 8px", background:B.white, border:`1px solid ${B.steel}`, color:B.black, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:0.5, textTransform:"uppercase" }}>
                             <Ic n="calendar" size={12} color={B.black} />
                             {m.nextSession ? "Reschedule" : "Schedule"}
                           </button>
                           <button onClick={() => setAssignTask(m)} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 8px", background:B.white, border:`1px solid ${B.steel}`, color:B.black, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:0.5, textTransform:"uppercase" }}>
                             <Ic n="check" size={12} color={B.black} />Task
                           </button>
                           <button onClick={() => { setAddResource({ mentee: m }); setResourceForm({ title:"", description:"", category:"", file:null }); }} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 8px", background:B.white, border:`1px solid ${B.steel}`, color:B.black, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:0.5, textTransform:"uppercase" }}>
                             <Ic n="file" size={12} color={B.black} />Resource
                           </button>
                         </div>

                         {/* Tertiary actions row */}
                         <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                           <button onClick={() => setWelcomeLetter({ name: m.firstName || m.name, email: m.email, tier: m.tier, startDate: m.startDate })} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 8px", background:B.blush, border:"none", color:B.white, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:0.5, textTransform:"uppercase" }}>
                             <Ic n="send" size={12} color={B.white} />Welcome Letter
                           </button>
                           <button onClick={async () => {
                             if (!window.confirm(`Mark ${m.firstName || m.name}'s program as complete?`)) return;
                             const firstName = m.firstName || m.name.split(" ")[0];
                           // Change auth role to community
                           const { error } = await supabase.functions.invoke('invite-mentee', {
                             body: { email: m.email, action: 'graduate' }
                           });
                           if (error) { alert(`Error: ${error.message}`); return; }
                           // Send graduation portal message trigger
                           await supabase.functions.invoke('send-message', {
                             body: { mentee_email: m.email, sender: "jess", text: `__GRADUATION__${firstName}` }
                           });
                           // Send branded graduation email
                           await supabase.functions.invoke('send-message', {
                             body: {
                               send_email: true,
                               graduation_email: true,
                               email_data: {
                                 email: m.email,
                                 firstName,
                                 tier: m.tier,
                                 sessionsCompleted: m.sessionsCompleted,
                                 sessionsTotal: m.sessionsTotal,
                                 startDate: m.startDate,
                                 completionDate: new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })
                               }
                             }
                           });
                           setMenteeList(p => p.filter(x => x.email !== m.email));
                           fetchGraduates();
                           alert(`${firstName}'s program is complete. They now have 1 year of community access.`);
                         }} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 8px", background:B.success, border:"none", color:B.white, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FONTS.body, letterSpacing:0.5, textTransform:"uppercase" }}>
                           <Ic n="check" size={12} color={B.white} />Complete Program
                         </button>
                       </div>
                       </div>

                       {/* Next session indicator if scheduled */}
                       {m.nextSession && (
                         <div style={{ padding:"10px 16px", background:`${B.blush}08`, borderTop:`1px solid ${B.blush}20`, display:"flex", alignItems:"center", gap:10 }}>
                           <Ic n="calendar" size={12} color={B.blush} />
                           <span style={{ fontSize:11, color:B.blush, fontWeight:600 }}>Next Session:</span>
                           <span style={{ fontSize:11, color:B.charcoal, fontWeight:300 }}>{m.nextSession.type} · {m.nextSession.date} at {m.nextSession.time}</span>
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
             </div>
           ) :
           (viewMap[view] || Overview)}
        </div>
      </div>

      {!useSidebar && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: B.white, borderTop: `1px solid ${B.cloud}`, display: "flex", paddingBottom: "env(safe-area-inset-bottom)", zIndex: 100 }}>
          {ADMIN_TABS.map(({ id, icon, label }) => {
            const on = view === id;
            const badge = id === "leads" ? pending.length : id === "messages" ? adminUnread : 0;
            return <button key={id} onClick={() => setView(id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px 8px", border: "none", background: "transparent", color: on ? B.blush : B.mid, fontFamily: FONTS.body, fontSize: 7, fontWeight: on ? 700 : 300, position: "relative", letterSpacing: 1.5, textTransform: "uppercase" }}><Ic n={icon} size={20} color={on ? B.blush : B.mid} />{label}{badge > 0 && <div style={{ position: "absolute", top: 8, right: "calc(50% - 13px)", width: 12, height: 12, background: B.blush, fontSize: 6, color: B.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{badge}</div>}</button>;
          })}
        </nav>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   SET PASSWORD SCREEN
════════════════════════════════════════════════════════════════════════ */
const SetPassword = ({ onDone }) => {
  const { isMobile } = useLayout();
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (pass.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pass !== confirm) { setErr("Passwords don't match."); return; }
    setBusy(true); setErr("");
    const { error } = await supabase.auth.updateUser({ password: pass });
    if (error) { setErr(error.message); setBusy(false); return; }
    setDone(true);
    setTimeout(() => onDone(), 2000);
  };

  const inp = { width:"100%", padding:"14px 18px", background:"transparent", border:`1px solid #333`, fontSize:15, color:B.ivory, fontFamily:FONTS.body, outline:"none", boxSizing:"border-box", borderRadius:0 };

  return (
    <div style={{ minHeight:"100dvh", background:B.black, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px", fontFamily:FONTS.body }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0} input{font-size:16px!important;font-family:inherit} button{-webkit-tap-highlight-color:transparent}`}</style>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:36 }}>
          <Logo height={isMobile?48:64} white />
        </div>
        <div style={{ background:"#0d0d0d", border:`1px solid #1e1e1e`, padding:isMobile?"32px 24px":"48px 44px" }}>
          <div style={{ height:3, background:B.blush, margin:isMobile?"-32px -24px 28px":"-48px -44px 36px" }} />
          {done ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ width:56, height:56, background:`${B.blush}20`, border:`2px solid ${B.blush}`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
                <Ic n="check" size={24} color={B.blush} sw={2.5} />
              </div>
              <h2 style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:36, textTransform:"uppercase", color:B.ivory, margin:"0 0 12px" }}>You're in!</h2>
              <p style={{ color:"#9a8880", fontSize:13, fontWeight:300 }}>Password set. Taking you to your portal…</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily:FONTS.display, fontWeight:900, fontSize:isMobile?40:52, textTransform:"uppercase", color:B.ivory, margin:"0 0 8px", letterSpacing:"-1px", lineHeight:0.95 }}>Set Your<br/><span style={{ color:B.blush, fontStyle:"italic", fontWeight:300 }}>Password.</span></h2>
              <p style={{ color:"#9a8880", fontSize:13, margin:"0 0 32px", fontWeight:300, lineHeight:1.6 }}>Choose a password to access your portal. At least 8 characters.</p>

              <label style={{ display:"block", fontSize:9, color:B.blushLight, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>New Password</label>
              <input value={pass} onChange={e => { setPass(e.target.value); setErr(""); }} type="password" placeholder="At least 8 characters" style={{ ...inp, marginBottom:16 }} />

              <label style={{ display:"block", fontSize:9, color:B.blushLight, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Confirm Password</label>
              <input value={confirm} onChange={e => { setConfirm(e.target.value); setErr(""); }} type="password" placeholder="Repeat your password" style={{ ...inp, marginBottom: err ? 12 : 24 }} />

              {err && <div style={{ color:B.blushLight, fontSize:12, marginBottom:16, padding:"10px 14px", background:`${B.blush}15`, borderLeft:`3px solid ${B.blush}`, fontWeight:300 }}>{err}</div>}

              <Btn full variant="blush" onClick={submit} disabled={busy} style={{ padding:"15px", fontSize:13 }}>
                {busy ? "Setting password…" : "Set Password & Enter Portal"}
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [activeUser, setActiveUser] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [bookedForm, setBookedForm] = useState(null);

  useEffect(() => {
    // Check for Calendly redirect with booked=true
    const params = new URLSearchParams(window.location.search);
    if (params.get("booked") === "true") {
      const name = params.get("invitee_full_name") || "";
      const email = params.get("invitee_email") || "";
      setBookedForm({ name, email, slot: { day: "", date: "", time: "" } });
      setScreen("confirmation");
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    // Check for invite/recovery token in URL hash
    const hash = window.location.hash;
    if (hash && hash.includes("type=invite") || hash.includes("type=recovery")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || "" })
          .then(() => {
            setScreen("setpassword");
            window.history.replaceState(null, "", window.location.pathname);
          });
        return;
      }
    }

    try {
      const stored = sessionStorage.getItem("sjtn_session");
      if (stored) {
        const s = JSON.parse(stored);
        if (Sec.valid(s)) {
          const u = DB.users[s.userId];
          if (u) {
            setActiveUser(u); setActiveSession(s);
            const dest = s.role === "admin" ? "admin" : s.role === "community" ? "community" : "portal";
            setScreen(dest);
          } else if ((s.role === "mentee" || s.role === "community") && s.userId) {
            // Real Supabase user — restore from stored session data
            const storedUser = sessionStorage.getItem("sjtn_user");
            if (storedUser) {
              const userData = JSON.parse(storedUser);
              setActiveUser(userData); setActiveSession(s);
              const dest = s.role === "admin" ? "admin" : s.role === "community" ? "community" : "portal";
              setScreen(dest);
            } else {
              sessionStorage.removeItem("sjtn_session");
            }
          } else {
            sessionStorage.removeItem("sjtn_session");
          }
        } else { sessionStorage.removeItem("sjtn_session"); }
      }
    } catch { sessionStorage.removeItem("sjtn_session"); }
  }, []);

  const handleLogin = useCallback((email, userData, session) => {
    const userWithEmail = { ...userData, email };
    setActiveUser(userWithEmail); setActiveSession(session);
    sessionStorage.setItem("sjtn_session", JSON.stringify(session));
    sessionStorage.setItem("sjtn_user", JSON.stringify(userWithEmail));
    const dest = userData.role === "admin" ? "admin" : userData.role === "community" ? "community" : "portal";
    setScreen(dest);
  }, []);

  const handleLogout = useCallback(() => {
    setActiveUser(null); setActiveSession(null);
    sessionStorage.removeItem("sjtn_session");
    sessionStorage.removeItem("sjtn_user");
    setScreen("landing");
  }, []);

  const sessionValid = Sec.valid(activeSession);

  return (
    <>
      {screen === "setpassword"  && <SetPassword onDone={() => setScreen("auth")} />}
      {screen === "landing"      && <Landing onSignIn={() => setScreen("auth")} onBook={() => window.open("https://calendly.com/sayjesstonails-info/free-discovery-call", "_blank")} onApply={() => setScreen("apply")} />}
      {screen === "auth"         && <AuthPortal onLogin={handleLogin} onBack={() => setScreen("landing")} onBook={() => window.open("https://calendly.com/sayjesstonails-info/free-discovery-call", "_blank")} />}
      {screen === "apply"        && <CommunityApply onBack={() => setScreen("landing")} onSubmit={() => {}} />}
      {screen === "booking"      && <Booking onConfirm={f => { setBookedForm(f); setScreen("confirmation"); }} onBack={() => setScreen("landing")} />}
      {screen === "confirmation" && <Confirmation form={bookedForm} onHome={() => setScreen("landing")} onSignIn={() => setScreen("auth")} />}
      {screen === "portal"    && activeUser && sessionValid && <MenteePortal user={activeUser} onLogout={handleLogout} />}
      {screen === "community" && activeUser && sessionValid && <CommunityPortal user={activeUser} onLogout={handleLogout} onUpgrade={() => {
        const base = "https://calendly.com/sayjesstonails-info/free-discovery-call";
        const name = encodeURIComponent(activeUser.firstName || "");
        const email = encodeURIComponent(activeUser.email || "");
        window.open(`${base}?name=${name}&email=${email}`, "_blank");
      }} />}
      {screen === "admin"     && activeUser && <AdminDashboard onLogout={handleLogout} />}
      {(screen === "portal" || screen === "admin" || screen === "community") && !sessionValid && <AuthPortal onLogin={handleLogin} onBack={() => setScreen("landing")} onBook={() => window.open("https://calendly.com/sayjesstonails-info/free-discovery-call", "_blank")} />}
    </>
  );
}

