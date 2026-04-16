import { useState, useEffect, useRef, useCallback } from "react";

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
    "jessica@example.com": { role:"mentee", password:"Demo@1234!", name:"Jessica M.", firstName:"Jessica", avatar:"JM", tier:"3-Month Elite", tierKey:"elite", startDate:"March 15, 2025", daysRemaining:48, totalDays:90, sessionsCompleted:3, sessionsTotal:6, goal:"Fill my books and raise my prices", nextSession:{ date:"Friday Apr 18", time:"2:00 PM EST", type:"Session 4 — Client Retention" }, milestones:[{label:"Complete intake form",done:true},{label:"Book Session 1",done:true},{label:"Join Skool community",done:true},{label:"Raise prices 15%",done:true},{label:"Gain 3 new clients",done:false},{label:"Launch Instagram strategy",done:false}], messages:[{from:"Jess",time:"Today 9:14 AM",text:"Hey! Thinking about your rebooking strategy for Friday — have some ideas I can't wait to share.",unread:true},{from:"You",time:"Yesterday",text:"Two clients accepted my new rate without hesitation. Still shocked!"},{from:"Jess",time:"Yesterday",text:"NOT surprised — your work is worth every penny. Keep going!"}], documents:[{name:"Welcome Packet — 3-Month Elite",type:"PDF",date:"Mar 15",category:"Welcome",size:"2.4 MB"},{name:"90-Day Business Plan",type:"PDF",date:"Mar 17",category:"Plans",size:"1.8 MB"},{name:"Session 1 Recording",type:"Video",date:"Mar 20",category:"Sessions",size:"—"},{name:"Session 1 Action Plan",type:"PDF",date:"Mar 20",category:"Sessions",size:"0.9 MB"},{name:"Pricing Worksheet",type:"PDF",date:"Mar 27",category:"Resources",size:"0.7 MB"},{name:"Session 2 Recording",type:"Video",date:"Apr 2",category:"Sessions",size:"—"},{name:"Session 3 Recording",type:"Video",date:"Apr 10",category:"Sessions",size:"—"}], schedule:[{date:"Apr 18",label:"Session 4",type:"session",time:"2:00 PM"},{date:"Apr 22",label:"Check-in",type:"checkin",time:"Flexible"},{date:"Apr 25",label:"Check-in",type:"checkin",time:"Flexible"},{date:"May 2",label:"Session 5",type:"session",time:"TBD"}], payments:[{date:"Mar 15, 2025",desc:"3-Month Elite Mentorship",amount:"$3,360.00",status:"Paid"}],
    },
    "taylor@example.com": { role:"mentee", password:"Demo@1234!", name:"Taylor R.", firstName:"Taylor", avatar:"TR", tier:"30-Day Intensive", tierKey:"intensive", startDate:"April 1, 2025", daysRemaining:18, totalDays:30, sessionsCompleted:1, sessionsTotal:2, goal:"Attract my first 5 consistent clients", nextSession:{ date:"Sunday Apr 20", time:"11:00 AM EST", type:"Session 2 — Momentum Review" }, milestones:[{label:"Complete intake form",done:true},{label:"Book Session 1",done:true},{label:"Update Instagram bio",done:true},{label:"Book 3 new clients",done:false},{label:"Implement pricing structure",done:false}], messages:[{from:"Jess",time:"Today 8:00 AM",text:"Check-in is due today — how are the pricing cards working?",unread:true},{from:"You",time:"Apr 15",text:"Posted my first reel and got 3 DMs asking about booking!"},{from:"Jess",time:"Apr 15",text:"THAT IS HUGE. This is exactly what we planned. Let's convert them."}], documents:[{name:"Welcome Packet — 30-Day",type:"PDF",date:"Apr 1",category:"Welcome",size:"2.1 MB"},{name:"30-Day Business Plan",type:"PDF",date:"Apr 3",category:"Plans",size:"1.4 MB"},{name:"Session 1 Recording",type:"Video",date:"Apr 5",category:"Sessions",size:"—"},{name:"Social Media Quick-Start",type:"PDF",date:"Apr 8",category:"Resources",size:"0.6 MB"}], schedule:[{date:"Apr 20",label:"Session 2",type:"session",time:"11:00 AM"},{date:"Apr 22",label:"Check-in",type:"checkin",time:"Flexible"},{date:"Apr 28",label:"End-of-Month Review",type:"review",time:"TBD"}], payments:[{date:"Apr 1, 2025",desc:"30-Day Intensive",amount:"$1,120.00",status:"Paid"}],
    },
    "jess@sayjesstonails.com": { role:"admin", password:"Admin@Jess2025!", name:"Jess Ramos", firstName:"Jess", avatar:"JR" },
  },
  leads: [
    { id:1, name:"Aaliyah Johnson", email:"aaliyah@example.com", phone:"(305) 555-0182", ig:"@aaliyahnails_miami", licensed:"Yes", experience:"1–3 years", challenge:"I'm undercharging and terrified to raise my prices without losing everyone.", goal:"Double my income in 90 days and stop feeling embarrassed about my rates.", tier:"3-Month Elite ($3,360)", how:"Instagram", slot:{day:"Monday",date:"Apr 21",time:"2:00 PM"}, status:"pending", submitted:"2 hours ago" },
    { id:2, name:"Destiny Reyes", email:"destiny@example.com", phone:"(786) 555-0291", ig:"@destinyreyes_nails", licensed:"Yes", experience:"3+ years", challenge:"I can't keep clients past 2–3 visits despite consistent work.", goal:"Build a real rebooking system and reach 5 new regulars per month.", tier:"30-Day Intensive ($1,120)", how:"Word of mouth", slot:{day:"Tuesday",date:"Apr 22",time:"11:00 AM"}, status:"pending", submitted:"5 hours ago" },
    { id:3, name:"Monique Davis", email:"monique@example.com", phone:"(954) 555-0374", ig:"@moniquedavis.nails", licensed:"No", experience:"Just starting", challenge:"Just got my license — no idea how to get my first clients or price myself.", goal:"Land my first 3 paying clients and feel confident about my pricing.", tier:"Hourly Session ($250)", how:"TikTok", slot:{day:"Wednesday",date:"Apr 23",time:"9:00 AM"}, status:"accepted", submitted:"Yesterday", acceptedAt:"1 hour ago" },
    { id:4, name:"Priya Nair", email:"priya@example.com", phone:"(561) 555-0413", ig:"@priyasnailstudio", licensed:"Yes", experience:"3+ years", challenge:"I want to expand — teach, build a brand, create a second income stream.", goal:"Launch my first class in 90 days and build an income beyond the chair.", tier:"3-Month Elite ($3,360)", how:"Google", slot:{day:"Friday",date:"Apr 25",time:"2:00 PM"}, status:"declined", submitted:"2 days ago" },
  ],
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
const LogoMark = ({ size = 36, white = false }) => {
  const mainFill   = white ? "#FFFFFF" : "#231f20";
  const whiteFill  = white ? "#231f20" : "#ffffff";
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
  home:"M3 9.5L12 3l9 6.5V21h-6v-5H9v5H3V9.5z", calendar:"M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z", video:"M15 10l4.553-2.277A1 1 0 0121 8.72v6.56a1 1 0 01-1.447.898L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z", file:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6", message:"M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z", check:"M5 13l4 4L19 7", logout:"M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1", bell:"M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75", dollar:"M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", send:"M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z", play:"M5 3l14 9-14 9V3z", download:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3", award:"M12 15a7 7 0 100-14 7 7 0 000 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12", card:"M1 4h22v16H1zM1 10h22", arrow:"M5 12h14M12 5l7 7-7 7", back:"M19 12H5M12 5l-7 7 7 7", close:"M18 6L6 18M6 6l12 12", menu:"M3 12h18M3 6h18M3 18h18", star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", instagram:"M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM17.5 6.5h.01M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z", eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z", eyeOff:"M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22", lock:"M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4", shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z", settings:"M12 15a3 3 0 100-6 3 3 0 000 6z", grid:"M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z", book:"M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z", graduationCap:"M22 10v6M2 10l10-5 10 5-10 5-10-5zM6 12v5c3.333 1.333 6.667 1.333 10 0v-5", sparkle:"M12 3l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 12l-3.75 2.7 1.5-4.5L6 7.5h4.5L12 3z",
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
const Landing = ({ onSignIn, onBook }) => {
  const { isMobile } = useLayout();
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("mentorship");

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const tiers = [
    { name: "Hourly Session", price: "$250", value: "$750", saving: "Save $500", sub: "One session, total clarity", features: ["60-min live 1:1 with Jess", "Personalized agenda", "Written action plan", "No commitment required"], accent: false },
    { name: "30-Day Intensive", price: "$1,120", value: "$3,600", saving: "Save $2,480", sub: "Real momentum, one month", features: ["2 live virtual sessions", "8 check-ins (2×/week)", "Personalized 30-day plan", "Pricing + client coaching", "DM support all month"], accent: false },
    { name: "3-Month Elite", price: "$3,360", value: "$8,550", saving: "Save $5,190", sub: "Complete transformation", features: ["6 live virtual sessions", "Personalized 90-day plan", "Skool community access", "Multiple check-ins/week", "Monthly progress reviews", "End-of-quarter audit"], accent: true },
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
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pop { 0%{transform:scale(.5);opacity:0} 80%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: scrolled ? "rgba(255,255,255,0.97)" : B.black, borderBottom: scrolled ? `1px solid ${B.cloud}` : "none", backdropFilter: scrolled ? "blur(12px)" : "none", padding: isMobile ? "14px 20px" : "14px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all .35s" }}>
        <Logo height={isMobile ? 30 : 36} white={!scrolled} />
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
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, padding: "6px 14px", border: `1px solid ${B.blush}40`, borderRadius: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: B.blush, animation: "pulse 2s infinite", flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>Now Accepting New Mentees</span>
            </div>

            <h1 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 68 : 118, lineHeight: 0.88, color: B.white, marginBottom: 0, textTransform: "uppercase", letterSpacing: "-3px" }}>
              Turn Your<br/>
              <span style={{ color: B.blush, fontStyle: "italic", fontWeight: 300, letterSpacing: "-2px" }}>Passion</span><br/>
              Into Profit.
            </h1>

            <div style={{ width: 56, height: 3, background: B.blush, margin: "28px 0" }} />

            <p style={{ fontSize: isMobile ? 15 : 17, color: "#888", lineHeight: 1.85, maxWidth: 480, marginBottom: 40, fontWeight: 300 }}>
              1:1 mentorship for nail techs ready to raise their prices, fill their books, and build a career that lasts. From Jess Ramos — licensed nail tech & Light Elegance educator, Miramar, FL.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn size="lg" variant="blush" onClick={onBook} icon="calendar">Book Free Discovery Call</Btn>
              <Btn size="lg" variant="ghostDark" onClick={onSignIn} icon="lock">Mentee Portal</Btn>
            </div>
          </div>

          {/* RIGHT — stats panel */}
          <div style={{ marginTop: isMobile ? 52 : 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {[
                { n: "50+",  l: "Nail techs mentored",          sub: "and growing" },
                { n: "95%",  l: "Raise prices within 30 days",  sub: "of mentees" },
                { n: "100%", l: "Personalized to you",          sub: "no templates, ever" },
                { n: "24hr", l: "Response guarantee",           sub: "during your program" },
              ].map(({ n, l, sub }) => (
                <div key={l} style={{ padding: isMobile ? "24px 20px" : "32px 28px", border: `1px solid #1e1e1e`, background: "#0a0a0a", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: B.blush }} />
                  <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 40 : 52, color: B.white, lineHeight: 1, letterSpacing: "-1px" }}>{n}</div>
                  <div style={{ fontSize: isMobile ? 11 : 12, color: "#888", fontWeight: 400, marginTop: 8, lineHeight: 1.4 }}>{l}</div>
                  <div style={{ fontSize: 9, color: B.blush, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── SECTION TABS ── */}
      <div style={{ background: B.white, borderBottom: `1px solid ${B.cloud}`, position: "sticky", top: isMobile ? 58 : 64, zIndex: 50, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "12px 16px" : "16px 40px", display: "flex", gap: isMobile ? 8 : 12, alignItems: "center", justifyContent: isMobile ? "stretch" : "flex-start" }}>
          {[["mentorship", "Mentorship", "star"], ["academy", "graduationCap", "Academy"], ["about", "user", "About Jess"]].map(([id, label, icon]) => {
            // fix label/icon swap for academy
            const tabLabel = id === "academy" ? "Academy" : id === "about" ? "About Jess" : "Mentorship";
            const tabIcon  = id === "academy" ? "graduationCap" : id === "about" ? "user" : "star";
            const on = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id)} style={{ flex: isMobile ? 1 : undefined, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: isMobile ? "10px 8px" : "12px 24px", border: `2px solid ${on ? B.blush : B.cloud}`, borderRadius: 40, background: on ? B.blush : B.white, color: on ? B.white : B.steel, fontSize: isMobile ? 11 : 13, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: "0.05em", transition: "all .2s", whiteSpace: "nowrap", boxShadow: on ? `0 4px 14px ${B.blush}40` : "none" }}>
                <Ic n={tabIcon} size={isMobile ? 13 : 15} color={on ? B.white : B.steel} />
                {tabLabel}
              </button>
            );
          })}
          {!isMobile && <div style={{ marginLeft: "auto", fontSize: 10, color: B.mid, fontWeight: 300, letterSpacing: 1 }}>SELECT A SECTION TO EXPLORE ↑</div>}
        </div>
        {isMobile && <div style={{ textAlign: "center", paddingBottom: 10, fontSize: 9, color: B.mid, fontWeight: 300, letterSpacing: 1 }}>TAP A TAB TO EXPLORE</div>}
      </div>

      {/* ── MENTORSHIP ── */}
      {activeTab === "mentorship" && <>
        {/* Pricing */}
        <section style={{ padding: isMobile ? "60px 24px" : "80px 40px", background: B.white }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ marginBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
              <div>
                <Section style={{ marginBottom: 12 }}>Investment</Section>
                <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 44 : 64, textTransform: "uppercase", lineHeight: 0.95, letterSpacing: "-1px" }}>Three Ways<br/>To Say Yes.</h2>
              </div>
              <p style={{ color: B.steel, fontSize: 14, maxWidth: 320, lineHeight: 1.7, fontWeight: 300 }}>Every option includes direct access to Jess — not templates, not pre-recorded courses. Real guidance.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 2 }}>
              {tiers.map(({ name, price, value, saving, sub, features, accent }) => (
                <div key={name} style={{ background: accent ? B.black : B.white, border: `1px solid ${B.cloud}`, padding: "36px 28px", position: "relative" }}>
                  {accent && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: B.blush }} />}
                  {accent && <div style={{ position: "absolute", top: 16, right: 16 }}><BlushTag>Most Popular</BlushTag></div>}
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: accent ? B.mid : B.steel, marginBottom: 16, fontFamily: FONTS.display }}>{name}</div>
                  <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 54, color: accent ? B.white : B.black, lineHeight: 1 }}>{price}</div>
                  <div style={{ fontSize: 11, color: accent ? "#666" : B.steel, marginTop: 4, marginBottom: 6, fontWeight: 300 }}>{sub}</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: accent ? B.blushLight : B.steel, fontWeight: 300, textDecoration: "line-through" }}>{value} value</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: B.blush }}>{saving}</span>
                  </div>
                  <Divider />
                  <div style={{ margin: "20px 0 24px" }}>
                    {features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                          <Ic n="check" size={9} color={B.white} sw={2.5} />
                        </div>
                        <span style={{ fontSize: 12, color: accent ? "#ccc" : B.charcoal, lineHeight: 1.4, fontWeight: 300 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Btn full variant={accent ? "blush" : "primary"} onClick={onBook}>Book Discovery Call</Btn>
                </div>
              ))}
            </div>
            <p style={{ textAlign: "center", color: B.mid, fontSize: 12, marginTop: 20, fontWeight: 300 }}>Not sure which option fits? The discovery call is free — Jess will help you decide.</p>
          </div>
        </section>

        {/* Testimonials */}
        <section style={{ background: B.off, padding: isMobile ? "60px 24px" : "80px 40px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <Section style={{ marginBottom: 12 }}>Results</Section>
            <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 44 : 60, textTransform: "uppercase", lineHeight: 0.95, letterSpacing: "-1px", marginBottom: 48 }}>What Mentees Say.</h2>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 2 }}>
              {testimonials.map(({ name, tier, q }) => (
                <div key={name} style={{ background: B.white, border: `1px solid ${B.cloud}`, padding: "32px 28px" }}>
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
            <Section style={{ marginBottom: 12 }}>Coming 2025</Section>
            <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 48 : 72, textTransform: "uppercase", lineHeight: 0.92, letterSpacing: "-1px", marginBottom: 8 }}>
              The SayJessToNails<br/>
              <span style={{ color: B.blush, fontStyle: "italic", fontWeight: 300 }}>Academy.</span>
            </h2>
            <div style={{ width: 48, height: 2, background: B.blush, margin: "20px 0 28px" }} />
            <p style={{ fontSize: 16, color: B.steel, lineHeight: 1.8, maxWidth: 620, marginBottom: 48, fontWeight: 300 }}>
              This isn't just a school. It's the foundation of a career. We teach nail techs everything they need to get licensed, get clients, and get paid — with the same personalized attention and real-world business training that sets our mentorship apart.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 2, marginBottom: 48 }}>
              {[
                { icon: "sparkle", title: "Technique Grounded in Science", desc: "Natural nail care, gel systems, acrylics, structured manicures, and nail health — taught with the precision and depth your clients will feel." },
                { icon: "book", title: "Florida State License Preparation", desc: "Our full curriculum prepares you for the Florida Board of Cosmetology exam so you can practice legally, confidently, and professionally from day one." },
                { icon: "dollar", title: "Business Built Into the Curriculum", desc: "Pricing, client attraction, rebooking, social media, and financial basics. You graduate as a nail tech and a business owner — not just one or the other." },
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

            {/* License requirement callout */}
            <div style={{ background: B.black, padding: "32px 32px", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 40 }}>
              <div style={{ width: 3, background: B.blush, alignSelf: "stretch", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: B.blushLight, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Florida State Licensing</div>
                <p style={{ color: "#ccc", fontSize: 14, lineHeight: 1.75, fontWeight: 300, maxWidth: 580 }}>
                  Florida requires a state-issued cosmetology or nail specialty license to perform nail services professionally. Our academy is built around that requirement — and then goes far beyond it. Every student leaves prepared for the Board exam, equipped with real business skills, and connected to a community that keeps showing up for them.
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
          <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 60, alignItems: "start" }}>
            <div>
              <Section style={{ marginBottom: 12 }}>About</Section>
              <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 48 : 64, textTransform: "uppercase", lineHeight: 0.92, letterSpacing: "-1px", marginBottom: 20 }}>
                Hi, I'm<br/>
                <span style={{ color: B.blush, fontStyle: "italic", fontWeight: 300 }}>Jess.</span>
              </h2>
              <p style={{ fontSize: 15, color: B.steel, lineHeight: 1.85, marginBottom: 16, fontWeight: 300 }}>
                Licensed nail tech, Light Elegance educator, and the heart behind Say Jess to Nails and Creations Beauty Lounge in Miramar, Florida.
              </p>
              <p style={{ fontSize: 14, color: B.mid, lineHeight: 1.85, marginBottom: 28, fontWeight: 300 }}>
                I help nail techs grow beyond the salon chair — building confidence, raising prices, filling books, and turning a talent into a career that actually pays. My mentees don't just learn technique. They learn how to run a business.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Btn onClick={onBook}>Book a Discovery Call</Btn>
                <Btn variant="ghost" icon="instagram">@sayjesstonails</Btn>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {["Licensed nail tech & educator", "Light Elegance certified educator", "Mentor to 50+ nail techs", "Creations Beauty Lounge — Miramar, FL", "Florida state licensed & compliant", "2025 Academy founder"].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", border: `1px solid ${B.cloud}`, background: B.white }}>
                  <div style={{ width: 2, height: 20, background: i === 4 ? B.blush : B.cloud, flexShrink: 0 }} />
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
          <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 48 : 72, textTransform: "uppercase", lineHeight: 0.92, color: B.white, marginBottom: 20, letterSpacing: "-1px" }}>
            The First Step Is<br/>
            <span style={{ color: B.blushLight, fontStyle: "italic", fontWeight: 300 }}>Just Saying Yes.</span>
          </h2>
          <p style={{ color: "#666", fontSize: 15, lineHeight: 1.75, marginBottom: 32, fontWeight: 300 }}>Free 20-minute discovery call. No pitch, no pressure. Just Jess, you, and the conversation that starts everything.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn size="lg" variant="blush" onClick={onBook} icon="calendar">Book Your Free Call</Btn>
            <Btn size="lg" variant="ghostDark" onClick={onSignIn} icon="lock">Already a mentee?</Btn>
          </div>
        </div>
      </section>

      <footer style={{ background: "#070707", padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <Logo height={24} white />
        <div style={{ fontSize: 10, color: "#333", fontWeight: 300 }}>sayjesstonails.com · info@sayjesstonails.com · 954-544-2888</div>
        <div style={{ fontSize: 9, color: "#222", letterSpacing: 1 }}>© 2025 SAYJESSTONAILS · ALL DATA ENCRYPTED</div>
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

  const login = useCallback(() => {
    if (!Sec.rateOk(email)) { setLocked(true); setErr("Too many attempts. Please wait 15 minutes."); return; }
    if (!email.trim() || !pass.trim()) { setErr("Please enter your email and password."); return; }
    setBusy(true); setErr("");
    setTimeout(() => {
      Sec.record(email);
      const u = DB.users[email.toLowerCase()];
      if (u && u.password === pass) {
        onLogin(email.toLowerCase(), u, Sec.createSession({ email: email.toLowerCase(), role: u.role }));
      } else { setErr("Email or password is incorrect."); }
      setBusy(false);
    }, 800);
  }, [email, pass, onLogin]);

  const inp = (err) => ({ width: "100%", padding: "13px 16px", background: B.off, border: `1px solid ${err ? B.blush : B.cloud}`, borderRadius: 2, fontSize: 15, color: B.black, fontFamily: FONTS.body, outline: "none", boxSizing: "border-box", WebkitAppearance: "none" });

  if (forgot) return (
    <div style={{ minHeight: "100dvh", background: B.black, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: FONTS.body }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=DM+Sans:wght@300;400;500;600&display=swap'); *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; } input { font-size:16px !important; }`}</style>
      <div style={{ background: B.ink, border: `1px solid ${B.charcoal}`, padding: "40px", width: "100%", maxWidth: 420 }}>
        {forgotSent ? (
          <>
            <div style={{ width: 52, height: 52, background: B.successPale, border: `2px solid ${B.success}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 0 20px" }}><Ic n="check" size={24} color={B.success} sw={2.5} /></div>
            <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 32, textTransform: "uppercase", color: B.white, margin: "0 0 8px" }}>Check Your Inbox.</h2>
            <p style={{ color: B.steel, fontSize: 13, lineHeight: 1.6, margin: "0 0 24px", fontWeight: 300 }}>Reset link sent to <strong style={{ color: B.blushLight }}>{forgotEmail}</strong>.</p>
            <Btn full variant="white" onClick={() => { setForgot(false); setForgotSent(false); }}>Back to Sign In</Btn>
          </>
        ) : (
          <>
            <button onClick={() => setForgot(false)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: B.steel, cursor: "pointer", marginBottom: 24, fontFamily: FONTS.body, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}><Ic n="back" size={13} color={B.steel} />Back</button>
            <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 36, textTransform: "uppercase", color: B.white, margin: "0 0 8px" }}>Reset Password.</h2>
            <p style={{ color: B.steel, fontSize: 13, lineHeight: 1.6, margin: "0 0 24px", fontWeight: 300 }}>Enter the email tied to your account.</p>
            <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} type="email" placeholder="your@email.com" style={{ ...inp(false), background: "#1a1a1a", border: `1px solid ${B.charcoal}`, color: B.white, marginBottom: 16 }} />
            <Btn full variant="blush" onClick={() => { setBusy(true); setTimeout(() => { setForgotSent(true); setBusy(false); }, 900); }} disabled={busy || !forgotEmail.includes("@")}>{busy ? "Sending…" : "Send Reset Link"}</Btn>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: B.black, display: "flex", fontFamily: FONTS.body, flexDirection: isMobile ? "column" : "row" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=DM+Sans:wght@300;400;500;600&display=swap'); *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; } button { -webkit-tap-highlight-color:transparent; } input,textarea { font-size:16px!important; } ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:${B.charcoal}}`}</style>

      {/* Left — brand panel */}
      <div style={{ flex: isMobile ? undefined : "0 0 46%", background: B.ink, borderRight: isMobile ? "none" : `1px solid ${B.charcoal}`, borderBottom: isMobile ? `1px solid ${B.charcoal}` : "none", padding: isMobile ? "40px 28px 32px" : "56px 48px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden", minHeight: isMobile ? undefined : "100dvh" }}>
        {/* Blush accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: `linear-gradient(to bottom, ${B.blush}, transparent)` }} />

        <div>
          <div style={{ marginBottom: isMobile ? 28 : 48 }}><Logo height={isMobile ? 28 : 34} white /></div>
          <h1 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 40 : 52, textTransform: "uppercase", lineHeight: 0.95, color: B.white, marginBottom: 20, letterSpacing: "-0.5px" }}>
            Your career,<br />
            <span style={{ color: B.blushLight, fontStyle: "italic", fontWeight: 300 }}>elevated.</span>
          </h1>
          <div style={{ width: 40, height: 2, background: B.blush, marginBottom: 20 }} />
          <p style={{ color: "#555", fontSize: 13, lineHeight: 1.8, marginBottom: 28, fontWeight: 300, maxWidth: 340 }}>Access your personalized plan, session recordings, check-ins, and everything Jess built for you.</p>

          {!isMobile && (
            <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 36 }}>
              {[{ icon: "video", t: "Live sessions & recordings" }, { icon: "file", t: "Documents & action plans" }, { icon: "bell", t: "Check-ins & accountability" }, { icon: "shield", t: "256-bit end-to-end encryption" }].map(({ icon, t }) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderLeft: icon === "shield" ? `2px solid ${B.blush}` : `2px solid ${B.charcoal}` }}>
                  <Ic n={icon} size={14} color={icon === "shield" ? B.blush : B.steel} />
                  <span style={{ color: icon === "shield" ? B.blushLight : "#555", fontSize: 12, fontWeight: 300 }}>{t}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: "20px", background: "#0d0d0d", border: `1px solid ${B.charcoal}`, borderLeft: `3px solid ${B.blush}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: B.blushLight, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Not enrolled yet?</div>
          <div style={{ fontSize: 12, color: "#444", marginBottom: 12, fontWeight: 300 }}>Book a free 20-min discovery call — no pitch, no pressure.</div>
          <button onClick={onBook} style={{ display: "flex", alignItems: "center", gap: 7, background: B.blush, border: "none", padding: "8px 16px", color: B.white, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            <Ic n="calendar" size={12} color={B.white} />Book a Discovery Call
          </button>
        </div>
      </div>

      {/* Right — login form */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isMobile ? "32px 28px 48px" : "56px 48px", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <button onClick={onBack} style={{ width: 32, height: 32, border: `1px solid ${B.charcoal}`, background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <Ic n="back" size={14} color={B.steel} />
            </button>
            <span style={{ fontSize: 10, color: B.steel, letterSpacing: "0.1em", textTransform: "uppercase" }}>Back to homepage</span>
          </div>

          <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 36 : 44, textTransform: "uppercase", color: B.white, margin: "0 0 4px", letterSpacing: "-0.5px" }}>Sign In.</h2>
          <p style={{ color: "#444", fontSize: 13, margin: "0 0 28px", fontWeight: 300 }}>Use the credentials Jess sent when you enrolled.</p>

          <label style={{ display: "block", fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Email</label>
          <input value={email} onChange={e => { setEmail(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && login()} type="email" placeholder="your@email.com" autoComplete="email" style={{ ...inp(!!err), background: "#141414", border: `1px solid ${err ? B.blush : B.charcoal}`, color: B.white, marginBottom: 16 }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Password</label>
            <button onClick={() => setForgot(true)} style={{ fontSize: 10, color: B.steel, background: "none", border: "none", cursor: "pointer", fontFamily: FONTS.body, textDecoration: "underline", textUnderlineOffset: 2 }}>Forgot?</button>
          </div>
          <div style={{ position: "relative", marginBottom: err ? 10 : 24 }}>
            <input value={pass} onChange={e => { setPass(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && login()} type={showPass ? "text" : "password"} placeholder="••••••••" autoComplete="current-password" style={{ ...inp(!!err), background: "#141414", border: `1px solid ${err ? B.blush : B.charcoal}`, color: B.white, paddingRight: 46 }} />
            <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <Ic n={showPass ? "eyeOff" : "eye"} size={16} color={B.steel} />
            </button>
          </div>

          {err && <div style={{ color: B.blushLight, fontSize: 12, marginBottom: 16, padding: "10px 14px", background: `${B.blush}12`, borderLeft: `3px solid ${B.blush}`, fontWeight: 300 }}>{err}</div>}

          <Btn full variant="blush" onClick={login} disabled={busy || locked}>{busy ? "Signing in…" : locked ? "Account locked — try later" : "Sign In to Portal"}</Btn>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: B.charcoal }} />
            <span style={{ fontSize: 9, color: B.charcoal, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Demo Accounts</span>
            <div style={{ flex: 1, height: 1, background: B.charcoal }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[
              ["jessica@example.com", "Demo@1234!", "3-Month Elite", "JM", B.blush],
              ["taylor@example.com", "Demo@1234!", "30-Day Intensive", "TR", "#9B6EA0"],
              ["jess@sayjesstonails.com", "Admin@Jess2025!", "Admin · Jess's Dashboard", "JR", B.success],
            ].map(([em, pw, lbl, av, ac]) => (
              <button key={em} onClick={() => { setEmail(em); setPass(pw); setErr(""); }} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", background: email === em ? "#1a1a1a" : "#0d0d0d", border: `1px solid ${email === em ? B.charcoal : "#141414"}`, cursor: "pointer", fontFamily: FONTS.body, textAlign: "left", transition: "all .15s" }}>
                <div style={{ width: 28, height: 28, background: `${ac}20`, border: `1px solid ${ac}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: ac, flexShrink: 0 }}>{av}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#aaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lbl}</div>
                  <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.05em" }}>{em}</div>
                </div>
                {email === em && <div style={{ width: 5, height: 5, background: ac, flexShrink: 0 }} />}
              </button>
            ))}
          </div>
          <p style={{ color: "#222", fontSize: 9, textAlign: "center", marginTop: 20, letterSpacing: "0.05em", lineHeight: 1.6 }}>CREDENTIALS EMAILED AFTER ENROLLMENT · SESSIONS EXPIRE AFTER 8 HOURS</p>
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
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}><Logo height={32} /></div>
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
          <div style={{ flexShrink: 0 }}><LogoMark size={34} white /></div>
          <div><p style={{ fontSize: 12, color: "#888", fontStyle: "italic", margin: "0 0 5px", lineHeight: 1.5, fontWeight: 300 }}>"I personally review every request and I'm already looking forward to hearing your story."</p><span style={{ fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>— Jess</span></div>
        </div>

        <div style={{ display: "flex", gap: 2, flexDirection: isMobile ? "column" : "row" }}>
          <Btn full variant="ghost" onClick={onHome}>Back to Homepage</Btn>
          <Btn full variant="blush" onClick={onSignIn} icon="lock">Have an account? Sign in</Btn>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   MENTEE PORTAL
════════════════════════════════════════════════════════════════════════ */
const MenteePortal = ({ user, onLogout }) => {
  const { isMobile, useSidebar } = useLayout();
  const [view, setView] = useState("dashboard");
  const [msgs, setMsgs] = useState(user.messages);
  const [msgInput, setMsgInput] = useState("");
  const [docFilter, setDocFilter] = useState("All");
  const msgEnd = useRef(null);
  const unread = msgs.filter(m => m.unread && m.from !== "You").length;
  const done = user.milestones?.filter(m => m.done).length || 0;
  const pct = user.sessionsTotal ? Math.round((user.sessionsCompleted / user.sessionsTotal) * 100) : 0;
  const dayPct = user.totalDays ? Math.round(((user.totalDays - user.daysRemaining) / user.totalDays) * 100) : 0;

  const sendMsg = () => { if (!msgInput.trim()) return; setMsgs(p => [...p, { from: "You", time: "Just now", text: msgInput }]); setMsgInput(""); setTimeout(() => setMsgs(p => [...p, { from: "Jess", time: "Just now", text: "Thanks — I'll respond within 24 hours. You're doing amazing, keep pushing." }]), 1000); };
  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const NAV = [{ id:"dashboard",icon:"home",label:"Dashboard" }, { id:"sessions",icon:"video",label:"Sessions" }, { id:"schedule",icon:"calendar",label:"Schedule" }, { id:"messages",icon:"message",label:"Messages" }, { id:"documents",icon:"file",label:"Files" }, { id:"progress",icon:"award",label:"Progress" }, { id:"payments",icon:"card",label:"Payments" }];
  const TABS = [{ id:"dashboard",icon:"home",label:"Home" }, { id:"sessions",icon:"video",label:"Sessions" }, { id:"messages",icon:"message",label:"Messages" }, { id:"documents",icon:"file",label:"Files" }, { id:"more",icon:"menu",label:"More" }];

  const Pg = ({ title, sub, children }) => (
    <div style={{ padding: isMobile ? "20px 18px 96px" : "28px 32px", maxWidth: 900, width: "100%" }}>
      {title && <div style={{ marginBottom: 22 }}>
        {sub && <Section style={{ marginBottom: 8 }}>{sub}</Section>}
        <h1 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 32 : 44, textTransform: "uppercase", color: B.black, margin: 0, lineHeight: 0.95, letterSpacing: "-0.5px" }}>{title}</h1>
      </div>}
      {children}
    </div>
  );

  const StatTile = ({ value, label, accent }) => (
    <div style={{ padding: "18px 20px", border: `1px solid ${B.cloud}`, background: B.white, borderTop: accent ? `3px solid ${B.blush}` : `3px solid ${B.cloud}` }}>
      <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 28 : 36, color: accent ? B.blush : B.black, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 700, color: B.mid, marginTop: 6, letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</div>
    </div>
  );

  const views = {
    dashboard: (
      <Pg title={`Hi, ${user.firstName}.`} sub="Welcome Back">
        <p style={{ color: B.mid, fontSize: 13, margin: "-14px 0 18px", fontWeight: 300 }}>{user.daysRemaining} days remaining in your {user.tier}.</p>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 2, marginBottom: 20 }}>
          <StatTile value={`${user.sessionsCompleted}/${user.sessionsTotal}`} label="Sessions" />
          <StatTile value={user.daysRemaining} label="Days Left" />
          <StatTile value={`${done}/${user.milestones?.length || 0}`} label="Milestones" />
          <StatTile value={`${pct}%`} label="Progress" accent />
        </div>

        {/* Next session — dark card */}
        <div style={{ background: B.black, padding: isMobile ? "22px 22px" : "28px 28px", marginBottom: 16, borderLeft: `3px solid ${B.blush}`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -20, top: -20, width: 100, height: 100, borderRadius: "50%", background: `${B.blush}0A` }} />
          <Section style={{ color: B.blushLight, marginBottom: 10 }}>Next Session</Section>
          <div style={{ color: B.white, fontFamily: FONTS.display, fontSize: 22, fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.03em" }}>{user.nextSession?.type}</div>
          <div style={{ color: "#555", fontSize: 12, marginBottom: 18, fontWeight: 300 }}>{user.nextSession?.date} · {user.nextSession?.time}</div>
          <Btn variant="blush" icon="video" size={isMobile ? "md" : "md"}>Join Session</Btn>
        </div>

        {/* Progress bars */}
        <Card style={{ padding: "20px 22px", marginBottom: 16 }}>
          <Section style={{ marginBottom: 14 }}>Progress Overview</Section>
          {[["Sessions", pct], ["Timeline", dayPct], ["Milestones", user.milestones?.length ? Math.round((done / user.milestones.length) * 100) : 0]].map(([l, v]) => (
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
            <Section style={{ marginBottom: 12 }}>Milestones</Section>
            {user.milestones?.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < user.milestones.length - 1 ? `1px solid ${B.cloud}` : "none" }}>
                <div style={{ width: 18, height: 18, background: m.done ? B.blush : B.cloud, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{m.done && <Ic n="check" size={9} color={B.white} />}</div>
                <span style={{ fontSize: 11, color: m.done ? B.mid : B.charcoal, textDecoration: m.done ? "line-through" : "none", fontWeight: 300 }}>{m.label}</span>
              </div>
            ))}
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
      </Pg>
    ),

    sessions: (
      <Pg title="Sessions" sub="Live Sessions">
        <div style={{ background: B.black, padding: "22px 24px", marginBottom: 14, borderLeft: `3px solid ${B.blush}` }}>
          <Section style={{ color: B.blushLight, marginBottom: 8 }}>Up Next</Section>
          <div style={{ color: B.white, fontFamily: FONTS.display, fontSize: 20, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>{user.nextSession?.type}</div>
          <div style={{ color: "#555", fontSize: 12, marginBottom: 16, fontWeight: 300 }}>{user.nextSession?.date} · {user.nextSession?.time}</div>
          <Btn variant="blush" icon="video">Join Session</Btn>
        </div>
        {Array.from({ length: user.sessionsCompleted || 0 }, (_, i) => (
          <Card key={i} style={{ padding: "14px 18px", marginBottom: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: B.black, marginBottom: 3, letterSpacing: "0.03em" }}>Session {i + 1} — {["Foundation & Plan", "Pricing & Technique", "Marketing Deep Dive"][i] || "Strategy"}</div>
                <div style={{ fontSize: 10, color: B.mid, fontWeight: 300 }}>Completed · Recording available</div>
              </div>
              <div style={{ display: "flex", gap: 2, flexShrink: 0 }}><Btn variant="ghost" size="sm" icon="play">Watch</Btn></div>
            </div>
          </Card>
        ))}
      </Pg>
    ),

    schedule: (
      <Pg title="Schedule" sub="Upcoming">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 2, marginBottom: 20 }}>
          {user.schedule?.map((s, i) => {
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
            <div><div style={{ fontWeight: 700, fontSize: 13, color: B.black, letterSpacing: "0.03em" }}>Jess</div><div style={{ fontSize: 9, color: B.success, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>● Responds within 24hrs</div></div>
          </div>
        </div>
        <Divider />
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", background: B.off }}>
          {msgs.map((m, i) => {
            const isJ = m.from === "Jess";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isJ ? "flex-start" : "flex-end", marginBottom: 14 }}>
                {isJ && <div style={{ width: 24, height: 24, background: B.black, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0, alignSelf: "flex-end" }}><LogoMark size={16} white /></div>}
                <div style={{ maxWidth: "72%" }}>
                  <div style={{ background: isJ ? B.white : B.black, border: isJ ? `1px solid ${B.cloud}` : "none", padding: "10px 14px" }}>
                    <p style={{ margin: 0, fontSize: 12, color: isJ ? B.charcoal : B.white, lineHeight: 1.55, fontWeight: 300 }}>{m.text}</p>
                  </div>
                  <div style={{ fontSize: 9, color: B.mid, marginTop: 3, textAlign: isJ ? "left" : "right", fontWeight: 300, letterSpacing: "0.05em" }}>{m.time}</div>
                </div>
              </div>
            );
          })}
          <div ref={msgEnd} />
        </div>
        <Divider />
        <div style={{ padding: "10px 18px", background: B.white, display: "flex", gap: 2, flexShrink: 0, paddingBottom: isMobile ? "calc(10px + env(safe-area-inset-bottom))" : "10px" }}>
          <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} placeholder="Message Jess…" style={{ flex: 1, border: `1px solid ${B.cloud}`, padding: "12px 14px", fontSize: 14, color: B.black, outline: "none", fontFamily: FONTS.body, background: B.white, fontWeight: 300 }} />
          <button onClick={sendMsg} style={{ width: 44, height: 44, background: B.blush, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><Ic n="send" size={14} color={B.white} /></button>
        </div>
      </div>
    ),

    documents: (
      <Pg title="Files" sub="Documents">
        <div style={{ display: "flex", gap: 2, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
          {["All", ...new Set(user.documents?.map(d => d.category) || [])].map(c => (
            <button key={c} onClick={() => setDocFilter(c)} style={{ padding: "7px 14px", border: `1px solid ${docFilter === c ? B.blush : B.cloud}`, background: docFilter === c ? B.blushPale : "transparent", color: docFilter === c ? B.blush : B.mid, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, whiteSpace: "nowrap", flexShrink: 0, letterSpacing: 1.5, textTransform: "uppercase" }}>{c}</button>
          ))}
        </div>
        <Card style={{ overflow: "hidden" }}>
          {(docFilter === "All" ? user.documents || [] : user.documents?.filter(d => d.category === docFilter) || []).map((doc, i, arr) => (
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
          <p style={{ fontFamily: FONTS.script, fontStyle: "italic", fontSize: isMobile ? 16 : 19, color: B.white, margin: 0, lineHeight: 1.45, fontWeight: 400 }}>"{user.goal}"</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 2, marginBottom: 12 }}>
          <Card style={{ padding: "18px 20px" }}>
            <Section style={{ marginBottom: 12 }}>Milestones</Section>
            {user.milestones?.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < user.milestones.length - 1 ? `1px solid ${B.cloud}` : "none" }}>
                <div style={{ width: 18, height: 18, background: m.done ? B.blush : B.cloud, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{m.done && <Ic n="check" size={9} color={B.white} />}</div>
                <span style={{ fontSize: 11, color: m.done ? B.mid : B.charcoal, textDecoration: m.done ? "line-through" : "none", fontWeight: 300 }}>{m.label}</span>
              </div>
            ))}
          </Card>
          <Card style={{ padding: "18px 20px" }}>
            <Section style={{ marginBottom: 12 }}>Sessions</Section>
            {Array.from({ length: user.sessionsTotal || 0 }, (_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < (user.sessionsTotal - 1) ? `1px solid ${B.cloud}` : "none" }}>
                <div style={{ width: 20, height: 20, background: i < user.sessionsCompleted ? B.blush : B.cloud, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {i < user.sessionsCompleted ? <Ic n="check" size={10} color={B.white} /> : <span style={{ fontSize: 8, color: B.mid, fontWeight: 700 }}>{i + 1}</span>}
                </div>
                <span style={{ fontSize: 11, color: i < user.sessionsCompleted ? B.mid : B.charcoal, fontWeight: 300 }}>Session {i + 1}</span>
                {i === user.sessionsCompleted && <BlushTag>Next</BlushTag>}
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

    payments: (
      <Pg title="Payments" sub="Billing">
        <Card style={{ marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${B.cloud}`, background: B.off, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Section>Transaction History</Section>
            <span style={{ fontSize: 9, fontWeight: 700, color: B.success, letterSpacing: 1.5, textTransform: "uppercase" }}>All Paid</span>
          </div>
          {user.payments?.map((p, i) => (
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
        <div style={{ marginBottom: 20 }}><Logo height={28} /></div>
        <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 32, textTransform: "uppercase", color: B.black, margin: "0 0 18px", letterSpacing: "-0.5px" }}>More</h2>
        {[{ id:"schedule",icon:"calendar",label:"Schedule" }, { id:"progress",icon:"award",label:"My Progress" }, { id:"payments",icon:"card",label:"Payments" }].map(({ id, icon, label }) => (
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
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", fontFamily: FONTS.body, background: B.off }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=DM+Sans:wght@300;400;500;600&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0} button{-webkit-tap-highlight-color:transparent;transition:opacity .15s} button:active{opacity:.75} input,textarea{font-size:16px!important;font-family:inherit} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:${B.cloud}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>

      {useSidebar && (
        <div style={{ width: 196, background: B.black, borderRight: `1px solid #1a1a1a`, display: "flex", flexDirection: "column", height: "100%", flexShrink: 0 }}>
          <div style={{ padding: "16px 18px 14px", borderBottom: "1px solid #1a1a1a" }}><Logo height={26} white /></div>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: B.white, flexShrink: 0 }}>{user.avatar}</div>
            <div><div style={{ color: B.white, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{user.firstName}</div><div style={{ fontSize: 8, color: B.blushLight, fontWeight: 300, letterSpacing: 1, textTransform: "uppercase" }}>{user.tier}</div></div>
          </div>
          <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
            {NAV.map(({ id, icon, label }) => {
              const on = view === id; const badge = id === "messages" && unread > 0;
              return <button key={id} onClick={() => setView(id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", border: "none", background: on ? `${B.blush}18` : "transparent", color: on ? B.blushLight : "#555", marginBottom: 1, fontFamily: FONTS.body, fontSize: 11, fontWeight: on ? 600 : 300, textAlign: "left", cursor: "pointer", borderLeft: `2px solid ${on ? B.blush : "transparent"}`, transition: "all .15s", letterSpacing: "0.05em", position: "relative" }}><Ic n={icon} size={13} color={on ? B.blushLight : "#444"} />{label}{badge && <span style={{ marginLeft: "auto", background: B.blush, color: B.white, fontSize: 7, fontWeight: 700, padding: "1px 5px", letterSpacing: 0 }}>{unread}</span>}</button>;
            })}
          </nav>
          <div style={{ padding: "10px 8px", borderTop: "1px solid #1a1a1a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", marginBottom: 4 }}>
              <Ic n="lock" size={10} color={B.success} /><span style={{ fontSize: 8, color: B.success, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>256-bit encrypted</span>
            </div>
            <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", border: "none", background: "transparent", color: "#444", fontFamily: FONTS.body, fontSize: 11, cursor: "pointer", letterSpacing: "0.05em" }}><Ic n="logout" size={13} color="#333" />Sign out</button>
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
   ADMIN DASHBOARD
════════════════════════════════════════════════════════════════════════ */
const AdminDashboard = ({ onLogout }) => {
  const { isMobile, useSidebar } = useLayout();
  const [view, setView] = useState("overview");
  const [leads, setLeads] = useState(DB.leads);
  const [selLead, setSelLead] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [leadFilter, setLeadFilter] = useState("all");
  const [selChat, setSelChat] = useState(0);
  const [showChatList, setShowChatList] = useState(true);
  const [chatMsgs, setChatMsgs] = useState({ 0: [{ from: "Jessica M.", text: "Two clients accepted my new rate!", t: "Yesterday" }, { from: "Jess", text: "NOT surprised — your work is worth it. Keep going!", t: "Yesterday" }], 1: [{ from: "Taylor R.", text: "Posted my first reel — 3 DMs asking about booking!", t: "Apr 15" }, { from: "Jess", text: "THAT IS HUGE. Let's convert them.", t: "Apr 15" }] });
  const [chatInput, setChatInput] = useState("");
  const chatEnd = useRef(null);

  const pending = leads.filter(l => l.status === "pending");
  const filtered = leadFilter === "all" ? leads : leads.filter(l => l.status === leadFilter);
  const accept = id => setLeads(p => p.map(l => l.id === id ? { ...l, status: "accepted", acceptedAt: "Just now" } : l));
  const decline = id => setLeads(p => p.map(l => l.id === id ? { ...l, status: "declined" } : l));
  const menteeList = Object.entries(DB.users).filter(([, u]) => u.role === "mentee").map(([email, u]) => ({ email, ...u }));
  const totalRev = menteeList.reduce((s, m) => s + (m.tierKey === "elite" ? 3360 : m.tierKey === "intensive" ? 1120 : 250), 0);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs, selChat]);
  const sendChat = () => { if (!chatInput.trim()) return; setChatMsgs(p => ({ ...p, [selChat]: [...(p[selChat] || []), { from: "Jess", text: chatInput, t: "now" }] })); setChatInput(""); };

  const scMap = { pending: [B.amber, B.amberPale], accepted: [B.success, B.successPale], declined: [B.mid, B.off] };
  const contacts = [{ name: "Jessica M.", tier: "elite", preview: "Two clients accepted my new rate!", unread: 0 }, { name: "Taylor R.", tier: "intensive", preview: "Posted my first reel — 3 DMs!", unread: 1 }];

  const ADMIN_NAV = [{ id:"overview",icon:"grid",label:"Overview" }, { id:"leads",icon:"zap",label:"Leads" }, { id:"mentees",icon:"users",label:"Mentees" }, { id:"messages",icon:"message",label:"Messages" }, { id:"settings",icon:"settings",label:"Settings" }];
  const ADMIN_TABS = [{ id:"overview",icon:"grid",label:"Overview" }, { id:"leads",icon:"zap",label:"Leads" }, { id:"mentees",icon:"users",label:"Mentees" }, { id:"messages",icon:"message",label:"Messages" }, { id:"settings",icon:"settings",label:"Settings" }];

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
    <Pg title="Good morning, Jess." sub="Admin Overview">
      <p style={{ color: B.mid, fontSize: 13, margin: "-14px 0 20px", fontWeight: 300 }}>Here's everything happening across your mentorship program.</p>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 2, marginBottom: 20 }}>
        {[[menteeList.length, "Active Mentees", true], [pending.length, "Pending Leads", pending.length > 0], [`$${totalRev.toLocaleString()}`, "Total Revenue", false], ["3", "Sessions Today", false]].map(([v, l, accent], i) => (
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
                <Btn size="sm" variant="primary" icon="video">Start Call</Btn>
                <Btn size="sm" variant="ghost" icon="message" onClick={() => { setSelChat(i); setView("messages"); }}>Message</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      <Section style={{ marginBottom: 10 }}>Today's Sessions</Section>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 2 }}>
        {[{ name: "Jessica M.", time: "2:00 PM", session: "Session 4" }, { name: "Casey L.", time: "4:30 PM", session: "Check-in" }].map((s, i) => (
          <div key={i} style={{ background: B.black, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `3px solid ${B.blush}` }}>
            <div>
              <div style={{ fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>{s.time} EST</div>
              <div style={{ color: B.white, fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>{s.name}</div>
              <div style={{ color: "#555", fontSize: 11, fontWeight: 300 }}>{s.session}</div>
            </div>
            <Btn size="sm" variant="blush" icon="video">Start</Btn>
          </div>
        ))}
      </div>
    </Pg>
  );

  const LeadsView = (
    <div style={{ display: "flex", height: useSidebar ? "calc(100vh - 56px)" : "auto", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "20px 18px 40px" : "28px 28px", minWidth: 0 }}>
        <Section style={{ marginBottom: 8 }}>Discovery Calls</Section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 32 : 44, textTransform: "uppercase", color: B.black, margin: 0, letterSpacing: "-0.5px" }}>Leads</h1>
          {pending.length > 0 && <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 32, color: B.blush }}>{pending.length}</div>}
        </div>
        <div style={{ display: "flex", gap: 2, marginBottom: 16, overflowX: "auto" }}>
          {["all", "pending", "accepted", "declined"].map(f => (
            <button key={f} onClick={() => setLeadFilter(f)} style={{ padding: "7px 14px", border: `1px solid ${leadFilter === f ? B.blush : B.cloud}`, background: leadFilter === f ? B.blushPale : "transparent", color: leadFilter === f ? B.blush : B.mid, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, whiteSpace: "nowrap", flexShrink: 0, letterSpacing: 1.5, textTransform: "uppercase" }}>{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        {filtered.map(lead => {
          const [sc] = scMap[lead.status] || [B.mid];
          return (
            <Card key={lead.id} onClick={() => { setSelLead(lead); setShowDetail(true); }} style={{ padding: "14px 18px", marginBottom: 2, borderLeft: `3px solid ${sc}`, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{ width: 30, height: 30, background: B.black, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: B.white, flexShrink: 0 }}>{lead.name.split(" ").map(w => w[0]).join("")}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: B.black, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>{lead.name}</div>
                    <div style={{ fontSize: 9, color: B.mid, fontWeight: 300 }}>{lead.email}</div>
                  </div>
                </div>
                <span style={{ fontSize: 8, fontWeight: 700, color: sc, letterSpacing: 1.5, textTransform: "uppercase", flexShrink: 0 }}>{lead.status}</span>
              </div>
              <p style={{ fontSize: 11, color: B.mid, margin: "0 0 10px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", fontWeight: 300 }}><strong style={{ color: B.charcoal, fontWeight: 600 }}>Goal:</strong> {lead.goal}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: B.black, letterSpacing: 1, textTransform: "uppercase", background: B.off, padding: "3px 8px" }}>{lead.slot.date} · {lead.slot.time}</span>
                  <span style={{ fontSize: 9, color: B.mid, fontWeight: 300 }}>{lead.submitted}</span>
                </div>
                {lead.status === "pending" && (
                  <div style={{ display: "flex", gap: 2 }}>
                    <Btn size="sm" variant="blush" onClick={ev => { ev.stopPropagation(); accept(lead.id); }}>Accept</Btn>
                    <Btn size="sm" variant="ghost" onClick={ev => { ev.stopPropagation(); decline(lead.id); }}>Decline</Btn>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {(!isMobile || showDetail) && selLead && (
        <div style={{ width: isMobile ? "100%" : 320, position: isMobile ? "fixed" : "relative", inset: isMobile ? 0 : undefined, background: B.white, borderLeft: isMobile ? "none" : `1px solid ${B.cloud}`, zIndex: isMobile ? 200 : undefined, display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ padding: "13px 18px", borderBottom: `1px solid ${B.cloud}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: B.white, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><LogoMark size={22} /><span style={{ fontSize: 11, fontWeight: 700, color: B.black, letterSpacing: "0.05em", textTransform: "uppercase" }}>Lead Detail</span></div>
            <button onClick={() => setShowDetail(false)} style={{ width: 26, height: 26, border: `1px solid ${B.cloud}`, background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Ic n="close" size={12} color={B.mid} /></button>
          </div>
          {(() => {
            const [sc] = scMap[selLead.status] || [B.mid];
            return (
              <div style={{ padding: "18px 18px", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, background: B.black, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: B.white, flexShrink: 0 }}>{selLead.name.split(" ").map(w => w[0]).join("")}</div>
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
                  <div style={{ color: B.white, fontSize: 13, fontWeight: 700, letterSpacing: "0.03em" }}>{selLead.slot.day}, {selLead.slot.date}</div>
                  <div style={{ color: "#555", fontSize: 11, fontWeight: 300 }}>{selLead.slot.time} EST · 20 min · Google Meet</div>
                  {selLead.status === "accepted" && <div style={{ marginTop: 6, fontSize: 9, color: B.success, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>✓ Confirmed · email sent</div>}
                </div>
                {selLead.status === "pending" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Btn full variant="blush" icon="check" onClick={() => { accept(selLead.id); setSelLead(p => ({ ...p, status: "accepted", acceptedAt: "Just now" })); }}>Accept & Confirm</Btn>
                    <Btn full variant="ghost" onClick={() => { decline(selLead.id); setSelLead(p => ({ ...p, status: "declined" })); }}>Decline</Btn>
                  </div>
                )}
                {selLead.status === "accepted" && <div style={{ background: B.successPale, borderLeft: `3px solid ${B.success}`, padding: "14px 16px", textAlign: "center" }}><div style={{ fontSize: 11, fontWeight: 700, color: B.success, letterSpacing: "0.05em" }}>✓ Call Accepted</div><div style={{ fontSize: 10, color: B.mid, fontWeight: 300, marginTop: 3 }}>{selLead.acceptedAt || "Confirmed"}</div></div>}
                {selLead.status === "declined" && <Btn full variant="ghost" onClick={() => { accept(selLead.id); setSelLead(p => ({ ...p, status: "accepted", acceptedAt: "Just now" })); }}>Reconsider & Accept</Btn>}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );

  const MenteesView = (
    <Pg title="Mentees" sub="All Enrolled">
      {menteeList.map((m, i) => {
        const pct = Math.round((m.sessionsCompleted / m.sessionsTotal) * 100);
        const done = m.milestones?.filter(x => x.done).length || 0;
        return (
          <Card key={i} style={{ padding: "18px 20px", marginBottom: 2 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
              <div style={{ width: 42, height: 42, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: B.white, flexShrink: 0 }}>{m.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                  <div><div style={{ fontSize: 16, fontWeight: 700, color: B.black, letterSpacing: "0.02em" }}>{m.name}</div><div style={{ fontSize: 10, color: B.mid, fontWeight: 300, marginTop: 2 }}>{m.email} · Started {m.startDate}</div></div>
                  <Tag>{m.tier}</Tag>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 2, marginBottom: 12 }}>
              {[[`${m.sessionsCompleted}/${m.sessionsTotal}`, "Sessions"], [m.daysRemaining, "Days Left"], [`${done}/${m.milestones?.length || 0}`, "Milestones"], [`${pct}%`, "Progress"]].map(([v, l], idx) => (
                <div key={l} style={{ padding: "10px 14px", background: B.off, borderTop: idx === 3 ? `2px solid ${B.blush}` : `2px solid ${B.cloud}` }}>
                  <div style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 20, color: idx === 3 ? B.blush : B.black }}>{v}</div>
                  <div style={{ fontSize: 8, color: B.mid, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>
            <PBar value={pct} />
            <div style={{ display: "flex", gap: 2, marginTop: 12, flexWrap: "wrap" }}>
              <Btn size="sm" icon="video">Start Call</Btn>
              <Btn size="sm" variant="ghost" icon="message" onClick={() => { setSelChat(i); setView("messages"); }}>Message</Btn>
              <Btn size="sm" variant="ghost" icon="file">View Files</Btn>
            </div>
          </Card>
        );
      })}
    </Pg>
  );

  const MessagesView = (
    <div style={{ display: "flex", height: isMobile ? "calc(100dvh - 116px)" : "calc(100vh - 56px)", overflow: "hidden" }}>
      {(!isMobile || showChatList) && (
        <div style={{ width: isMobile ? "100%" : 210, borderRight: `1px solid ${B.cloud}`, background: B.white, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${B.cloud}` }}>
            <Section style={{ marginBottom: 6 }}>Messages</Section>
            <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 26, textTransform: "uppercase", color: B.black, margin: 0, letterSpacing: "-0.5px" }}>Inbox</h2>
          </div>
          {contacts.map((c, i) => (
            <div key={i} onClick={() => { setSelChat(i); if (isMobile) setShowChatList(false); }} style={{ padding: "14px 18px", borderBottom: `1px solid ${B.cloud}`, cursor: "pointer", background: selChat === i && !isMobile ? B.blushPale : "transparent", borderLeft: selChat === i && !isMobile ? `3px solid ${B.blush}` : "3px solid transparent" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: B.black, letterSpacing: "0.02em" }}>{c.name}</span>
                {c.unread > 0 && <span style={{ background: B.blush, color: B.white, fontSize: 8, fontWeight: 700, padding: "1px 5px" }}>{c.unread}</span>}
              </div>
              <p style={{ fontSize: 11, color: B.mid, margin: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontWeight: 300 }}>{c.preview}</p>
            </div>
          ))}
        </div>
      )}
      {(!isMobile || !showChatList) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${B.cloud}`, display: "flex", alignItems: "center", gap: 10, background: B.white, flexShrink: 0 }}>
            {isMobile && <button onClick={() => setShowChatList(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Ic n="back" size={18} color={B.blush} /></button>}
            <div style={{ width: 30, height: 30, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: B.white }}>{contacts[selChat]?.name.split(" ").map(w => w[0]).join("")}</div>
            <div><div style={{ fontWeight: 700, fontSize: 13, color: B.black, letterSpacing: "0.02em" }}>{contacts[selChat]?.name}</div><Tag>{contacts[selChat]?.tier === "elite" ? "3-Month Elite" : "30-Day Intensive"}</Tag></div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", background: B.off }}>
            {(chatMsgs[selChat] || []).map((m, i) => {
              const isJ = m.from === "Jess";
              return (
                <div key={i} style={{ display: "flex", justifyContent: isJ ? "flex-end" : "flex-start", marginBottom: 12 }}>
                  <div style={{ maxWidth: "70%" }}>
                    <div style={{ background: isJ ? B.black : B.white, border: isJ ? "none" : `1px solid ${B.cloud}`, padding: "10px 14px" }}>
                      <p style={{ margin: 0, fontSize: 12, color: isJ ? B.white : B.charcoal, lineHeight: 1.55, fontWeight: 300 }}>{m.text}</p>
                    </div>
                    <div style={{ fontSize: 9, color: B.mid, marginTop: 3, textAlign: isJ ? "right" : "left", fontWeight: 300, letterSpacing: "0.05em" }}>{m.t}</div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEnd} />
          </div>
          <Divider />
          <div style={{ padding: "10px 18px", background: B.white, display: "flex", gap: 2, flexShrink: 0 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder={`Reply to ${contacts[selChat]?.name}…`} style={{ flex: 1, border: `1px solid ${B.cloud}`, padding: "12px 14px", fontSize: 14, color: B.black, outline: "none", fontFamily: FONTS.body, fontWeight: 300 }} />
            <button onClick={sendChat} style={{ width: 44, height: 44, background: B.black, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><Ic n="send" size={15} color={B.white} /></button>
          </div>
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

  const viewMap = { overview: Overview, leads: LeadsView, mentees: MenteesView, messages: MessagesView, settings: SettingsView };

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", fontFamily: FONTS.body, background: B.off }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=DM+Sans:wght@300;400;500;600&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0} button{-webkit-tap-highlight-color:transparent;transition:opacity .15s;cursor:pointer} button:active{opacity:.78} input,textarea{font-size:16px!important;font-family:inherit} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:${B.cloud}}`}</style>

      {useSidebar && (
        <div style={{ width: 196, background: B.black, borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", height: "100%", flexShrink: 0 }}>
          <div style={{ padding: "16px 18px 14px", borderBottom: "1px solid #1a1a1a" }}><Logo height={26} white /></div>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: B.white, flexShrink: 0 }}>JR</div>
            <div><div style={{ color: B.white, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>Jess</div><div style={{ fontSize: 8, color: B.blushLight, fontWeight: 300, letterSpacing: 1, textTransform: "uppercase" }}>Admin · Mentor</div></div>
          </div>
          <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
            {ADMIN_NAV.map(({ id, icon, label }) => {
              const on = view === id; const badge = id === "leads" && pending.length > 0;
              return <button key={id} onClick={() => setView(id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", border: "none", background: on ? `${B.blush}18` : "transparent", color: on ? B.blushLight : "#555", marginBottom: 1, fontFamily: FONTS.body, fontSize: 11, fontWeight: on ? 600 : 300, textAlign: "left", borderLeft: `2px solid ${on ? B.blush : "transparent"}`, transition: "all .15s", letterSpacing: "0.05em", position: "relative" }}><Ic n={icon} size={13} color={on ? B.blushLight : "#444"} />{label}{badge && <span style={{ marginLeft: "auto", background: B.blush, color: B.white, fontSize: 7, fontWeight: 700, padding: "1px 5px" }}>{pending.length}</span>}</button>;
            })}
          </nav>
          <div style={{ padding: "10px 8px", borderTop: "1px solid #1a1a1a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", marginBottom: 4 }}>
              <Ic n="lock" size={10} color={B.success} /><span style={{ fontSize: 8, color: B.success, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>256-bit encrypted</span>
            </div>
            <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", border: "none", background: "transparent", color: "#444", fontFamily: FONTS.body, fontSize: 11, letterSpacing: "0.05em" }}><Ic n="logout" size={13} color="#333" />Sign out</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <div style={{ position: "sticky", top: 0, background: B.white, borderBottom: `1px solid ${B.cloud}`, padding: "11px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 50, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: B.mid, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{view}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {pending.length > 0 && <button onClick={() => setView("leads")} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 3 }}><Ic n="bell" size={16} color={B.mid} /><div style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, background: B.blush, fontSize: 6, color: B.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{pending.length}</div></button>}
            <div style={{ width: 26, height: 26, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: B.white }}>JR</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>{viewMap[view] || Overview}</div>
      </div>

      {!useSidebar && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: B.white, borderTop: `1px solid ${B.cloud}`, display: "flex", paddingBottom: "env(safe-area-inset-bottom)", zIndex: 100 }}>
          {ADMIN_TABS.map(({ id, icon, label }) => {
            const on = view === id; const badge = id === "leads" && pending.length > 0;
            return <button key={id} onClick={() => setView(id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px 8px", border: "none", background: "transparent", color: on ? B.blush : B.mid, fontFamily: FONTS.body, fontSize: 7, fontWeight: on ? 700 : 300, position: "relative", letterSpacing: 1.5, textTransform: "uppercase" }}><Ic n={icon} size={20} color={on ? B.blush : B.mid} />{label}{badge && <div style={{ position: "absolute", top: 8, right: "calc(50% - 13px)", width: 12, height: 12, background: B.blush, fontSize: 6, color: B.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{pending.length}</div>}</button>;
          })}
        </nav>
      )}
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
    try {
      const stored = sessionStorage.getItem("sjtn_session");
      if (stored) {
        const s = JSON.parse(stored);
        if (Sec.valid(s)) {
          const u = DB.users[s.userId];
          if (u) { setActiveUser(u); setActiveSession(s); setScreen(s.role === "admin" ? "admin" : "portal"); }
        } else { sessionStorage.removeItem("sjtn_session"); }
      }
    } catch { sessionStorage.removeItem("sjtn_session"); }
  }, []);

  const handleLogin = useCallback((email, userData, session) => {
    setActiveUser(userData); setActiveSession(session);
    sessionStorage.setItem("sjtn_session", JSON.stringify(session));
    setScreen(userData.role === "admin" ? "admin" : "portal");
  }, []);

  const handleLogout = useCallback(() => {
    setActiveUser(null); setActiveSession(null);
    sessionStorage.removeItem("sjtn_session");
    setScreen("landing");
  }, []);

  const sessionValid = Sec.valid(activeSession);

  return (
    <>
      {screen === "landing"      && <Landing onSignIn={() => setScreen("auth")} onBook={() => setScreen("booking")} />}
      {screen === "auth"         && <AuthPortal onLogin={handleLogin} onBack={() => setScreen("landing")} onBook={() => setScreen("booking")} />}
      {screen === "booking"      && <Booking onConfirm={f => { setBookedForm(f); setScreen("confirmation"); }} onBack={() => setScreen("landing")} />}
      {screen === "confirmation" && <Confirmation form={bookedForm} onHome={() => setScreen("landing")} onSignIn={() => setScreen("auth")} />}
      {screen === "portal"  && activeUser && sessionValid && <MenteePortal user={activeUser} onLogout={handleLogout} />}
      {screen === "admin"   && activeUser && <AdminDashboard onLogout={handleLogout} />}
      {(screen === "portal" || screen === "admin") && !sessionValid && <AuthPortal onLogin={handleLogin} onBack={() => setScreen("landing")} onBook={() => setScreen("booking")} />}
    </>
  );
}
