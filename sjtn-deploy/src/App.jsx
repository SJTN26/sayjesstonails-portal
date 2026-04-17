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
    "maya@example.com": { role:"community", password:"Demo@1234!", name:"Maya J.", firstName:"Maya", avatar:"MJ", tier:"Community Member", tierKey:"community", joinDate:"April 10, 2025" },
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
  home:"M3 9.5L12 3l9 6.5V21h-6v-5H9v5H3V9.5z", calendar:"M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z", video:"M15 10l4.553-2.277A1 1 0 0121 8.72v6.56a1 1 0 01-1.447.898L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z", file:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6", message:"M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z", check:"M5 13l4 4L19 7", logout:"M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1", bell:"M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75", dollar:"M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", send:"M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z", play:"M5 3l14 9-14 9V3z", download:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3", award:"M12 15a7 7 0 100-14 7 7 0 000 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12", card:"M1 4h22v16H1zM1 10h22", arrow:"M5 12h14M12 5l7 7-7 7", back:"M19 12H5M12 5l-7 7 7 7", close:"M18 6L6 18M6 6l12 12", menu:"M3 12h18M3 6h18M3 18h18", star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", instagram:"M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM17.5 6.5h.01M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z", eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z", eyeOff:"M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22", lock:"M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4", shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z", settings:"M12 15a3 3 0 100-6 3 3 0 000 6z", grid:"M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z", book:"M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z", graduationCap:"M22 10v6M2 10l10-5 10 5-10 5-10-5zM6 12v5c3.333 1.333 6.667 1.333 10 0v-5", sparkle:"M12 3l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 12l-3.75 2.7 1.5-4.5L6 7.5h4.5L12 3z", trophy:"M6 9H4a1 1 0 01-1-1V5a1 1 0 011-1h2M18 9h2a1 1 0 001-1V5a1 1 0 00-1-1h-2M8 21h8M12 17v4M5 3h14l-1 7a6 6 0 01-12 0L5 3z", mic:"M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8", share:"M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13", heart:"M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z", gift:"M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z", clipBoard:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", link:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71", edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
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
    { name: "Community", price: "$27", sub: "/month · cancel anytime", value: "", saving: "", features: ["Private community feed — all nail techs welcome", "Jess's weekly audio check-in", "Free resources & templates", "Peer wins, encouragement & accountability", "Visibility into what full mentorship looks like", "Direct path to upgrade when you're ready"], accent: false, community: true },
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
            // fix label/icon swap for academy
            const tabLabel = id === "academy" ? "Academy" : id === "about" ? "About Jess" : "Mentorship";
            const tabIcon  = id === "academy" ? "graduationCap" : id === "about" ? "user" : "star";
            const on = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id)} className={on ? "tab-btn-active" : "tab-btn-inactive"} style={{ flex: isMobile ? 1 : undefined, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: isMobile ? "10px 8px" : "12px 24px", border: `2px solid ${on ? B.blush : B.cloud}`, borderRadius: 40, background: on ? B.blush : B.white, color: on ? B.white : B.steel, fontSize: isMobile ? 11 : 13, fontWeight: 700, cursor: on ? "default" : "pointer", fontFamily: FONTS.body, letterSpacing: "0.05em", transition: "all .2s", whiteSpace: "nowrap", boxShadow: on ? `0 4px 14px ${B.blush}40` : "none" }}>
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
        <section className="section-reveal" style={{ padding: isMobile ? "60px 24px" : "80px 40px", background: B.white }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ marginBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
              <div>
                <Section style={{ marginBottom: 12 }}>Investment</Section>
                <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 44 : 64, textTransform: "uppercase", lineHeight: 0.95, letterSpacing: "-1px" }}>Four Ways<br/>To Say Yes.</h2>
              </div>
              <p style={{ color: B.steel, fontSize: 14, maxWidth: 320, lineHeight: 1.7, fontWeight: 300 }}>Start free in the community. Grow into 1:1 when you're ready. Every path leads to the same place — a career that finally pays what it should.</p>
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
                    {saving && <span style={{ fontSize: 10, fontWeight: 700, color: B.blush }}>{saving}</span>}
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
                    ? <Btn full variant="blush" onClick={onSignIn}>Join the Community</Btn>
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
                <p style={{ color: B.ivory, fontSize: 14, lineHeight: 1.75, fontWeight: 300, maxWidth: 580 }}>
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

            <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 44 : 56, textTransform: "uppercase", color: B.ivory, margin: "0 0 6px", letterSpacing: "-1px", lineHeight: 0.95 }}>Welcome<br/>Back.</h2>
            <p style={{ color: "#9a8880", fontSize: 13, margin: "0 0 32px", fontWeight: 300, lineHeight: 1.6 }}>Use the credentials Jess sent when you enrolled.</p>

            <label style={{ display: "block", fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Email Address</label>
            <input value={email} onChange={e => { setEmail(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && login()} type="email" placeholder="your@email.com" autoComplete="email" style={{ ...inp(!!err), marginBottom: 20 }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Password</label>
              <button onClick={() => setForgot(true)} style={{ fontSize: 11, color: "#9a8880", background: "none", border: "none", cursor: "pointer", fontFamily: FONTS.body, textDecoration: "underline", textUnderlineOffset: 3 }}>Forgot password?</button>
            </div>
            <div style={{ position: "relative", marginBottom: err ? 12 : 28 }}>
              <input value={pass} onChange={e => { setPass(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && login()} type={showPass ? "text" : "password"} placeholder="••••••••" autoComplete="current-password" style={{ ...inp(!!err), paddingRight: 48 }} />
              <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <Ic n={showPass ? "eyeOff" : "eye"} size={16} color="#555" />
              </button>
            </div>

            {err && <div style={{ color: B.blushLight, fontSize: 12, marginBottom: 16, padding: "10px 14px", background: `${B.blush}15`, borderLeft: `3px solid ${B.blush}`, fontWeight: 300, lineHeight: 1.5 }}>{err}</div>}

            <Btn full variant="blush" onClick={login} disabled={busy || locked} style={{ padding: "15px", fontSize: 13 }}>
              {busy ? "Signing in…" : locked ? "Account locked — try later" : "Sign In to Portal"}
            </Btn>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0 20px" }}>
              <div style={{ flex: 1, height: 1, background: "#1e1e1e" }} />
              <span style={{ fontSize: 9, color: "#444", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Demo Accounts</span>
              <div style={{ flex: 1, height: 1, background: "#1e1e1e" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[
                ["jessica@example.com", "Demo@1234!", "3-Month Elite", "JM", B.blush],
                ["taylor@example.com", "Demo@1234!", "30-Day Intensive", "TR", "#9B6EA0"],
                ["maya@example.com", "Demo@1234!", "Community Member", "MJ", B.success],
                ["jess@sayjesstonails.com", "Admin@Jess2025!", "Admin · Jess's Dashboard", "JR", B.amber],
              ].map(([em, pw, lbl, av, ac]) => (
                <button key={em} onClick={() => { setEmail(em); setPass(pw); setErr(""); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: email === em ? "#1a1a1a" : "#111", border: `1px solid ${email === em ? "#333" : "#161616"}`, cursor: "pointer", fontFamily: FONTS.body, textAlign: "left", transition: "all .15s" }}>
                  <div style={{ width: 30, height: 30, background: `${ac}18`, border: `1px solid ${ac}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: ac, flexShrink: 0 }}>{av}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lbl}</div>
                    <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.05em", marginTop: 1 }}>{em}</div>
                  </div>
                  {email === em && <div style={{ width: 5, height: 5, borderRadius: "50%", background: ac, flexShrink: 0 }} />}
                </button>
              ))}
            </div>
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
          <div><p style={{ fontSize: 12, color: "#9a8880", fontStyle: "italic", margin: "0 0 5px", lineHeight: 1.5, fontWeight: 300 }}>"I personally review every request and I'm already looking forward to hearing your story."</p><span style={{ fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>— Jess</span></div>
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

  // ── Feature state ──────────────────────────────────────────────────
  const [wins, setWins] = useState([
    { id:1, date:"Apr 14", cat:"pricing", text:"Raised gel full set from $65 to $85. Two clients didn't even blink.", celebrated:true },
    { id:2, date:"Apr 10", cat:"clients", text:"Booked my first client from Instagram after Jess's strategy session.", celebrated:true },
  ]);
  const [winInput, setWinInput] = useState("");
  const [winCat, setWinCat] = useState("pricing");
  const [celebratingWin, setCelebratingWin] = useState(null);

  const [milestones, setMilestones] = useState(user.milestones || []);
  const [celebratingMilestone, setCelebratingMilestone] = useState(null);

  const [communityPosts] = useState([
    { author:"Jess", avatar:"J", time:"Today 8:00 AM", text:"Good morning crew 💅 This week's focus: your rebooking language. What do YOU say at checkout? Drop it below.", likes:12, comments:["Sarah T.", "Maya R.", "Bria M."], isJess:true },
    { author:"Kayla T.", avatar:"KT", time:"Yesterday", text:"Just raised my prices for the 2nd time this quarter. Jess was RIGHT — the right clients don't leave. They congratulate you.", likes:24, comments:[], isJess:false },
    { author:"Bria M.", avatar:"BM", time:"2 days ago", text:"5 new regulars this month. I literally cried. Thank you Jess and this whole community 🙏", likes:31, comments:[], isJess:false },
  ]);
  const [likedPosts, setLikedPosts] = useState([]);

  const [sessionPrep, setSessionPrep] = useState({ win:"", challenge:"", need:"", submitted:false });
  const [referralCopied, setReferralCopied] = useState(false);

  const [audioPlaying, setAudioPlaying] = useState(false);

  // ── Computed ────────────────────────────────────────────────────────
  const unread = msgs.filter(m => m.unread && m.from !== "You").length;
  const done = milestones.filter(m => m.done).length;
  const pct = user.sessionsTotal ? Math.round((user.sessionsCompleted / user.sessionsTotal) * 100) : 0;
  const dayPct = user.totalDays ? Math.round(((user.totalDays - user.daysRemaining) / user.totalDays) * 100) : 0;

  const sendMsg = () => { if (!msgInput.trim()) return; setMsgs(p => [...p, { from: "You", time: "Just now", text: msgInput }]); setMsgInput(""); setTimeout(() => setMsgs(p => [...p, { from: "Jess", time: "Just now", text: "Thanks — I'll respond within 48 hours. You're doing amazing, keep pushing." }]), 1000); };
  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const addWin = () => {
    if (!winInput.trim()) return;
    const w = { id: Date.now(), date: "Today", cat: winCat, text: winInput, celebrated: false };
    setWins(p => [w, ...p]);
    setWinInput("");
    setCelebratingWin(w);
    setTimeout(() => setCelebratingWin(null), 3500);
  };

  const completeMilestone = (idx) => {
    const updated = milestones.map((m, i) => i === idx ? { ...m, done: true } : m);
    setMilestones(updated);
    setCelebratingMilestone(milestones[idx]);
    setTimeout(() => setCelebratingMilestone(null), 3500);
  };

  const catColors = { pricing: B.blush, clients: B.success, mindset: "#9B6EA0", income: B.amber };
  const catLabels = { pricing: "Pricing", clients: "Clients", mindset: "Mindset", income: "Income" };

  const NAV = [
    { id:"dashboard", icon:"home",   label:"Dashboard" },
    { id:"wins",      icon:"trophy",  label:"My Wins" },
    { id:"community", icon:"users",   label:"Community" },
    { id:"sessions",  icon:"video",   label:"Sessions" },
    { id:"schedule",  icon:"calendar",label:"Schedule" },
    { id:"messages",  icon:"message", label:"Messages" },
    { id:"resources", icon:"book",    label:"Resources" },
    { id:"progress",  icon:"award",   label:"Progress" },
    { id:"referral",  icon:"gift",    label:"Refer a Friend" },
    { id:"payments",  icon:"card",    label:"Payments" },
  ];
  const TABS = [
    { id:"dashboard", icon:"home",    label:"Home" },
    { id:"wins",      icon:"trophy",  label:"Wins" },
    { id:"community", icon:"users",   label:"Community" },
    { id:"messages",  icon:"message", label:"Messages" },
    { id:"more",      icon:"menu",    label:"More" },
  ];

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

        {/* ── Jess's Voice — weekly audio message ── */}
        <div style={{ background: B.black, borderLeft: `3px solid ${B.blush}`, padding: "18px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }} onClick={() => setAudioPlaying(p => !p)}>
          <div style={{ width: 44, height: 44, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, borderRadius: "50%" }}>
            <Ic n={audioPlaying ? "zap" : "mic"} size={20} color={B.white} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Section style={{ color: B.blushLight, marginBottom: 4 }}>Jess's Voice — This Week</Section>
            <div style={{ color: B.ivory, fontSize: 13, fontWeight: 500 }}>"Your pricing confidence starts with your language."</div>
            <div style={{ marginTop: 8, height: 3, background: "#2a2a2a", borderRadius: 2 }}>
              <div style={{ height: "100%", width: audioPlaying ? "45%" : "0%", background: B.blush, borderRadius: 2, transition: audioPlaying ? "width 60s linear" : "none" }} />
            </div>
          </div>
          <div style={{ fontSize: 9, color: "#9a8880", fontWeight: 300, flexShrink: 0 }}>{audioPlaying ? "Playing…" : "Tap to play"}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 2, marginBottom: 16 }}>
          <StatTile value={`${user.sessionsCompleted}/${user.sessionsTotal}`} label="Sessions" />
          <StatTile value={user.daysRemaining} label="Days Left" />
          <StatTile value={`${done}/${milestones.length}`} label="Milestones" />
          <StatTile value={`${pct}%`} label="Progress" accent />
        </div>

        {/* ── Next session + prep card ── */}
        <div style={{ background: B.black, padding: isMobile ? "20px" : "24px 28px", marginBottom: 16, borderLeft: `3px solid ${B.blush}`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -20, top: -20, width: 100, height: 100, borderRadius: "50%", background: `${B.blush}0A` }} />
          <Section style={{ color: B.blushLight, marginBottom: 10 }}>Next Session</Section>
          <div style={{ color: B.ivory, fontFamily: FONTS.display, fontSize: 22, fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.03em" }}>{user.nextSession?.type}</div>
          <div style={{ color: "#9a8880", fontSize: 12, marginBottom: 16, fontWeight: 300 }}>{user.nextSession?.date} · {user.nextSession?.time}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn variant="blush" icon="video">Join Session</Btn>
            {!sessionPrep.submitted && <Btn variant="ghostDark" icon="clipBoard" onClick={() => setView("sessionprep")}>Prepare for Session</Btn>}
            {sessionPrep.submitted && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: B.success }}><Ic n="check" size={12} color={B.success} />Prep submitted</div>}
          </div>
        </div>

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
          {[["Sessions", pct], ["Timeline", dayPct], ["Milestones", milestones.length ? Math.round((done / milestones.length) * 100) : 0]].map(([l, v]) => (
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
            {milestones.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < milestones.length - 1 ? `1px solid ${B.cloud}` : "none" }}>
                <button onClick={() => !m.done && completeMilestone(i)} style={{ width: 20, height: 20, background: m.done ? B.blush : "transparent", border: `2px solid ${m.done ? B.blush : B.cloud}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: m.done ? "default" : "pointer", transition: "all .2s", padding: 0 }}>
                  {m.done && <Ic n="check" size={10} color={B.white} />}
                </button>
                <span style={{ fontSize: 11, color: m.done ? B.mid : B.charcoal, textDecoration: m.done ? "line-through" : "none", fontWeight: 300, flex: 1 }}>{m.label}</span>
                {!m.done && <button onClick={() => completeMilestone(i)} style={{ fontSize: 8, color: B.blush, border: `1px solid ${B.blush}`, background: "none", padding: "2px 7px", cursor: "pointer", fontFamily: FONTS.body, fontWeight: 700, letterSpacing: 1, whiteSpace: "nowrap" }}>Done</button>}
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
          <div style={{ color: B.ivory, fontFamily: FONTS.display, fontSize: 20, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>{user.nextSession?.type}</div>
          <div style={{ color: "#9a8880", fontSize: 12, marginBottom: 16, fontWeight: 300 }}>{user.nextSession?.date} · {user.nextSession?.time}</div>
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
                    <p style={{ margin: 0, fontSize: 12, color: isJ ? B.charcoal : B.ivory, lineHeight: 1.55, fontWeight: 300 }}>{m.text}</p>
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
          <p style={{ fontFamily: FONTS.script, fontStyle: "italic", fontSize: isMobile ? 16 : 19, color: B.ivory, margin: 0, lineHeight: 1.45, fontWeight: 400 }}>"{user.goal}"</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 2, marginBottom: 12 }}>
          <Card style={{ padding: "18px 20px" }}>
            <Section style={{ marginBottom: 12 }}>Milestones</Section>
            {milestones.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < milestones.length - 1 ? `1px solid ${B.cloud}` : "none" }}>
                <button onClick={() => !m.done && completeMilestone(i)} style={{ width: 20, height: 20, background: m.done ? B.blush : "transparent", border: `2px solid ${m.done ? B.blush : B.cloud}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: m.done ? "default" : "pointer", transition: "all .2s", padding: 0 }}>
                  {m.done && <Ic n="check" size={10} color={B.white} />}
                </button>
                <span style={{ fontSize: 11, color: m.done ? B.mid : B.charcoal, textDecoration: m.done ? "line-through" : "none", fontWeight: 300, flex: 1 }}>{m.label}</span>
                {!m.done && <button onClick={() => completeMilestone(i)} style={{ fontSize: 8, color: B.blush, border: `1px solid ${B.blush}`, background: "none", padding: "2px 7px", cursor: "pointer", fontFamily: FONTS.body, fontWeight: 700, letterSpacing: 1 }}>Done ✓</button>}
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

    // ── 1. WIN TRACKER ─────────────────────────────────────────────────
    wins: (
      <Pg title="My Wins" sub="Win Tracker">
        <p style={{ color: B.mid, fontSize: 13, margin: "-14px 0 20px", fontWeight: 300 }}>Every win counts. Log it, own it, celebrate it.</p>

        {/* Add a win */}
        <Card style={{ padding: "20px 22px", marginBottom: 16, borderTop: `3px solid ${B.blush}` }}>
          <Section style={{ marginBottom: 14 }}>Log a New Win</Section>
          <div style={{ display: "flex", gap: 2, marginBottom: 12, flexWrap: "wrap" }}>
            {Object.entries(catLabels).map(([k, v]) => (
              <button key={k} onClick={() => setWinCat(k)} style={{ padding: "7px 14px", border: `1px solid ${winCat === k ? catColors[k] : B.cloud}`, background: winCat === k ? `${catColors[k]}15` : "transparent", color: winCat === k ? catColors[k] : B.mid, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: 1.5, textTransform: "uppercase", transition: "all .15s" }}>{v}</button>
            ))}
          </div>
          <textarea value={winInput} onChange={e => setWinInput(e.target.value)} placeholder="What happened? Be specific — numbers make wins feel real. e.g. 'Raised my prices $20 and kept all 8 clients.'" rows={3} style={{ width: "100%", padding: "12px 16px", border: `1px solid ${B.cloud}`, fontSize: 14, color: B.black, fontFamily: FONTS.body, outline: "none", resize: "none", boxSizing: "border-box", fontWeight: 300 }} />
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
      <Pg title="Community" sub="The Inner Circle">
        <p style={{ color: B.mid, fontSize: 13, margin: "-14px 0 20px", fontWeight: 300 }}>Your people. Real nail techs doing the work alongside you.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {communityPosts.map((post, i) => (
            <Card key={i} style={{ padding: "20px 22px", borderTop: post.isJess ? `3px solid ${B.blush}` : `1px solid ${B.cloud}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, background: post.isJess ? B.blush : B.off, border: post.isJess ? "none" : `1px solid ${B.cloud}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: post.isJess ? B.white : B.steel, flexShrink: 0, borderRadius: "50%" }}>{post.avatar}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: B.black, letterSpacing: "0.02em" }}>{post.author}{post.isJess && <span style={{ marginLeft: 6, fontSize: 8, background: B.blush, color: B.white, padding: "1px 6px", fontWeight: 700, letterSpacing: 1 }}>JESS</span>}</div>
                  <div style={{ fontSize: 9, color: B.mid, fontWeight: 300, marginTop: 1 }}>{post.time}</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: B.charcoal, lineHeight: 1.7, margin: "0 0 14px", fontWeight: 300 }}>{post.text}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button onClick={() => setLikedPosts(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: likedPosts.includes(i) ? B.blush : B.mid, fontFamily: FONTS.body, fontSize: 11, fontWeight: likedPosts.includes(i) ? 700 : 300 }}>
                  <Ic n="heart" size={14} color={likedPosts.includes(i) ? B.blush : B.mid} sw={likedPosts.includes(i) ? 0 : 1.8} />
                  {post.likes + (likedPosts.includes(i) ? 1 : 0)}
                </button>
                {post.comments.length > 0 && <span style={{ fontSize: 10, color: B.mid, fontWeight: 300 }}>{post.comments.length} comments</span>}
              </div>
            </Card>
          ))}
        </div>
        <Card style={{ padding: "16px 20px", marginTop: 12, background: B.off, border: `1px solid ${B.cloud}` }}>
          <p style={{ fontSize: 12, color: B.steel, margin: 0, fontWeight: 300, textAlign: "center", lineHeight: 1.6 }}>👋 The full community is right here — <strong style={{ color: B.black }}>you're already in it.</strong><br/>Share your wins. Ask questions. Lift each other up.</p>
        </Card>
      </Pg>
    ),

    // ── 3. SESSION PREP ────────────────────────────────────────────────
    sessionprep: (
      <Pg title="Session Prep" sub={`For ${user.nextSession?.type}`}>
        <div style={{ background: B.black, padding: "16px 20px", marginBottom: 20, borderLeft: `3px solid ${B.blush}` }}>
          <div style={{ color: B.ivory, fontSize: 13, fontWeight: 500 }}>{user.nextSession?.date} · {user.nextSession?.time}</div>
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
                <textarea value={sessionPrep[key]} onChange={e => setSessionPrep(p => ({ ...p, [key]: e.target.value }))} placeholder={hint} rows={3} style={{ width: "100%", padding: "12px 16px", border: `1px solid ${B.cloud}`, fontSize: 14, color: B.black, fontFamily: FONTS.body, outline: "none", resize: "none", boxSizing: "border-box", fontWeight: 300 }} />
              </div>
            ))}
            <Btn full variant="blush" icon="send" onClick={() => setSessionPrep(p => ({ ...p, submitted: true }))} disabled={!sessionPrep.win.trim() || !sessionPrep.challenge.trim() || !sessionPrep.need.trim()}>Send to Jess</Btn>
          </div>
        )}
      </Pg>
    ),

    // ── 4. RESOURCES ───────────────────────────────────────────────────
    resources: (
      <Pg title="Resources" sub="Resource Library">
        <p style={{ color: B.mid, fontSize: 13, margin: "-14px 0 20px", fontWeight: 300 }}>Tools, guides, and templates curated by Jess for your growth.</p>
        {[
          { topic: "Pricing", color: B.blush, items: [{ name: "Pricing Calculator Workbook", type: "PDF", desc: "Set your prices with confidence using Jess's formula.", unlocked: true }, { name: "How to Raise Prices Without Losing Clients", type: "Guide", desc: "The exact language and timing strategy Jess uses.", unlocked: true }, { name: "Price Increase Announcement Templates", type: "Templates", desc: "3 caption templates ready to copy and customize.", unlocked: user.tierKey !== "hourly" }] },
          { topic: "Client Attraction", color: B.success, items: [{ name: "Instagram Bio Formula", type: "Template", desc: "A bio that converts visitors to bookings.", unlocked: true }, { name: "5-Day Content Plan for Nail Techs", type: "PDF", desc: "Post ideas for every day of your first week.", unlocked: true }, { name: "Rebooking Script", type: "Guide", desc: "What to say at checkout to guarantee the next appointment.", unlocked: user.tierKey !== "hourly" }] },
          { topic: "Business Setup", color: "#9B6EA0", items: [{ name: "Nail Tech Business Checklist", type: "PDF", desc: "Everything you need to operate legally and professionally.", unlocked: true }, { name: "Service Menu Template", type: "Template", desc: "A clean, professional service menu design.", unlocked: user.tierKey === "elite" }] },
        ].map(({ topic, color, items }) => (
          <div key={topic} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 3, height: 20, background: color, flexShrink: 0 }} />
              <Section style={{ color }}>{topic}</Section>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {items.map((item, i) => (
                <Card key={i} style={{ padding: "14px 18px", opacity: item.unlocked ? 1 : 0.6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: B.black, letterSpacing: "0.02em" }}>{item.name}</span>
                        <span style={{ fontSize: 8, fontWeight: 700, color, background: `${color}15`, padding: "2px 7px", letterSpacing: 1, textTransform: "uppercase" }}>{item.type}</span>
                      </div>
                      <div style={{ fontSize: 11, color: B.mid, fontWeight: 300 }}>{item.desc}</div>
                    </div>
                    {item.unlocked ? (
                      <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", border: `1px solid ${B.cloud}`, background: "none", color: B.steel, fontSize: 9, cursor: "pointer", fontFamily: FONTS.body, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", flexShrink: 0 }}>
                        <Ic n="download" size={11} color={color} />Access
                      </button>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: B.mid, flexShrink: 0 }}>
                        <Ic n="lock" size={11} color={B.mid} />Elite only
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
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
            <button onClick={() => { setReferralCopied(true); setTimeout(() => setReferralCopied(false), 2000); }} style={{ padding: "12px 18px", background: referralCopied ? B.success : B.black, border: "none", color: B.white, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0, transition: "background .3s", display: "flex", alignItems: "center", gap: 7 }}>
              <Ic n={referralCopied ? "check" : "link"} size={13} color={B.white} />
              {referralCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 2, marginBottom: 20 }}>
          {[["Share on Instagram", "instagram", B.blush], ["Share via Text", "send", B.success], ["Copy Link", "link", "#9B6EA0"]].map(([label, icon, color]) => (
            <button key={label} style={{ padding: "14px", border: `1px solid ${B.cloud}`, background: B.white, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontFamily: FONTS.body, fontSize: 12, fontWeight: 600, color: B.charcoal, letterSpacing: "0.02em" }}>
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=DM+Sans:wght@300;400;500;600&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0} button{-webkit-tap-highlight-color:transparent;transition:all .18s} button:active{opacity:.78} input,textarea{font-size:16px!important;font-family:inherit} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:${B.cloud}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}} @keyframes celebPop{0%{transform:scale(0) rotate(-10deg);opacity:0}60%{transform:scale(1.08) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}} @keyframes celebFade{0%{opacity:1}70%{opacity:1}100%{opacity:0}} @keyframes confettiDrop{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(80px) rotate(360deg);opacity:0}}`}</style>

      {/* ── Celebration overlays ── */}
      {(celebratingWin || celebratingMilestone) && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", animation: "celebFade 3.5s ease forwards" }} onClick={() => { setCelebratingWin(null); setCelebratingMilestone(null); }}>
          {/* Confetti dots */}
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: [B.blush, B.white, B.blushLight, B.success, "#9B6EA0"][i % 5], left: `${10 + i * 7}%`, top: "20%", animation: `confettiDrop ${0.8 + (i % 4) * 0.3}s ease ${i * 0.1}s both` }} />
          ))}
          <div style={{ textAlign: "center", animation: "celebPop .5s cubic-bezier(.16,1,.3,1) both", padding: "0 32px", maxWidth: 400 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
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
            <div><div style={{ color: B.ink, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{user.firstName}</div><div style={{ fontSize: 8, color: B.blush, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>{user.tier}</div></div>
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
const CommunityPortal = ({ user, onLogout, onUpgrade }) => {
  const { isMobile, useSidebar } = useLayout();
  const [view, setView] = useState("feed");
  const [postInput, setPostInput] = useState("");
  const [postCat, setPostCat] = useState("win");
  const [posts, setPosts] = useState([
    { id:1, author:"Jess", avatar:"J", time:"Today 8:00 AM", text:"Good morning crew 💅 This week's focus: your rebooking language. What do YOU say at checkout? Share below — let's build a script together.", likes:14, isJess:true, cat:"tip" },
    { id:2, author:"Kayla T.", avatar:"KT", time:"Yesterday", text:"Just raised my prices for the 2nd time this quarter. Jess was RIGHT — the right clients don't leave. They congratulate you. Don't be afraid.", likes:31, isJess:false, cat:"win" },
    { id:3, author:"Bria M.", avatar:"BM", time:"2 days ago", text:"5 new regulars this month. I literally cried. If you're on the fence about mentorship — just do it. Best investment I've made in myself.", likes:44, isJess:false, cat:"win" },
    { id:4, author:"Savannah R.", avatar:"SR", time:"3 days ago", text:"Question: how do you handle clients who push back on price increases? Struggling with this right now 😬", likes:8, isJess:false, cat:"question" },
    { id:5, author:"Jess", avatar:"J", time:"4 days ago", text:"Resource drop 🎁 The exact script I use to introduce a price increase without losing the relationship. Grab it in the Resources section. You're welcome 💅", likes:52, isJess:true, cat:"resource" },
    { id:6, author:"Maya J.", avatar:"MJ", time:"5 days ago", text:"Just joined the community! So excited to be here with other nail techs who are serious about growth. Already feeling inspired 🙏", likes:19, isJess:false, cat:"intro" },
  ]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const catColors = { win: B.blush, tip: B.success, question: "#9B6EA0", resource: B.amber, intro: B.steel };
  const catLabels = { win: "🏆 Win", tip: "💡 Tip", question: "❓ Question", resource: "📎 Resource", intro: "👋 Intro" };

  const submitPost = () => {
    if (!postInput.trim()) return;
    setPosts(p => [{ id: Date.now(), author: user.firstName, avatar: user.avatar, time: "Just now", text: postInput, likes: 0, isJess: false, cat: postCat }, ...p]);
    setPostInput("");
  };

  const resources = [
    { name: "Pricing Confidence Starter Guide", type: "PDF", desc: "Set your prices without apology.", cat: "Pricing" },
    { name: "Instagram Bio Formula", type: "Template", desc: "A bio that books clients while you sleep.", cat: "Marketing" },
    { name: "Rebooking Script", type: "Guide", desc: "What to say at checkout every time.", cat: "Clients" },
  ];

  const NAV_C = [
    { id:"feed",      icon:"users",    label:"Community Feed" },
    { id:"resources", icon:"book",     label:"Resources" },
    { id:"audio",     icon:"mic",      label:"Jess's Voice" },
    { id:"upgrade",   icon:"zap",      label:"Level Up" },
  ];
  const TABS_C = [
    { id:"feed",    icon:"users",  label:"Feed" },
    { id:"resources",icon:"book", label:"Resources" },
    { id:"audio",   icon:"mic",   label:"Jess" },
    { id:"upgrade", icon:"zap",   label:"Level Up" },
  ];

  const Pg = ({ title, sub, children }) => (
    <div style={{ padding: isMobile ? "20px 18px 96px" : "28px 32px", maxWidth: 860, width: "100%" }}>
      {title && <div style={{ marginBottom: 20 }}>
        {sub && <p style={{ fontSize: 9, fontWeight: 700, color: B.blush, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 8px" }}>{sub}</p>}
        <h1 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: isMobile ? 32 : 44, textTransform: "uppercase", color: B.black, margin: 0, lineHeight: 0.95, letterSpacing: "-0.5px" }}>{title}</h1>
      </div>}
      {children}
    </div>
  );

  const views = {
    feed: (
      <Pg title="Community Feed" sub="The Inner Circle">
        <p style={{ color: B.mid, fontSize: 13, margin: "-12px 0 20px", fontWeight: 300 }}>Real nail techs. Real growth. All in one place.</p>

        {/* Audio check-in teaser */}
        <div style={{ background: B.black, borderLeft: `3px solid ${B.blush}`, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => setView("audio")}>
          <div style={{ width: 40, height: 40, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, borderRadius: "50%" }}>
            <Ic n="mic" size={18} color={B.white} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: B.blushLight, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 3px" }}>Jess's Voice — This Week</p>
            <div style={{ color: B.ivory, fontSize: 13, fontWeight: 500 }}>"Your pricing confidence starts with your language."</div>
          </div>
          <div style={{ fontSize: 9, color: "#9a8880", flexShrink: 0 }}>Tap to listen →</div>
        </div>

        {/* Post composer */}
        <div style={{ background: B.white, border: `1px solid ${B.cloud}`, padding: "18px 20px", marginBottom: 16, borderTop: `3px solid ${B.blush}` }}>
          <div style={{ display: "flex", gap: 2, marginBottom: 12, flexWrap: "wrap" }}>
            {Object.entries(catLabels).map(([k, v]) => (
              <button key={k} onClick={() => setPostCat(k)} style={{ padding: "5px 12px", border: `1px solid ${postCat === k ? catColors[k] : B.cloud}`, background: postCat === k ? `${catColors[k]}12` : "transparent", color: postCat === k ? catColors[k] : B.mid, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.body, letterSpacing: 1, transition: "all .15s" }}>{v}</button>
            ))}
          </div>
          <textarea value={postInput} onChange={e => setPostInput(e.target.value)} placeholder="Share a win, ask a question, drop a tip — this community grows because you show up." rows={3} style={{ width: "100%", padding: "12px 14px", border: `1px solid ${B.cloud}`, fontSize: 14, color: B.black, fontFamily: FONTS.body, outline: "none", resize: "none", boxSizing: "border-box", fontWeight: 300 }} />
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
          {posts.map((post, i) => (
            <div key={post.id} style={{ background: B.white, border: `1px solid ${B.cloud}`, padding: "20px 22px", borderTop: post.isJess ? `3px solid ${B.blush}` : `1px solid ${B.cloud}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, background: post.isJess ? B.blush : B.off, border: post.isJess ? "none" : `1px solid ${B.cloud}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: post.isJess ? B.white : B.steel, flexShrink: 0, borderRadius: "50%" }}>{post.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: B.black, letterSpacing: "0.02em", display: "flex", alignItems: "center", gap: 7 }}>
                    {post.author}
                    {post.isJess && <span style={{ fontSize: 8, background: B.blush, color: B.white, padding: "1px 6px", fontWeight: 700, letterSpacing: 1 }}>JESS</span>}
                    <span style={{ fontSize: 8, background: `${catColors[post.cat]}15`, color: catColors[post.cat], padding: "1px 7px", fontWeight: 700, letterSpacing: 1 }}>{catLabels[post.cat]}</span>
                  </div>
                  <div style={{ fontSize: 9, color: B.mid, fontWeight: 300, marginTop: 1 }}>{post.time}</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: B.charcoal, lineHeight: 1.75, margin: "0 0 14px", fontWeight: 300 }}>{post.text}</p>
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

    resources: (
      <Pg title="Resources" sub="Free for Members">
        <p style={{ color: B.mid, fontSize: 13, margin: "-12px 0 20px", fontWeight: 300 }}>Starter tools from Jess — yours as a community member.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 24 }}>
          {resources.map((r, i) => (
            <div key={i} style={{ background: B.white, border: `1px solid ${B.cloud}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: B.black }}>{r.name}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: B.blush, background: B.blushPale, padding: "2px 7px", letterSpacing: 1 }}>{r.type}</span>
                </div>
                <div style={{ fontSize: 11, color: B.mid, fontWeight: 300 }}>{r.desc}</div>
              </div>
              <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", border: `1px solid ${B.cloud}`, background: "none", color: B.steel, fontSize: 9, cursor: "pointer", fontFamily: FONTS.body, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", flexShrink: 0 }}>
                <Ic n="download" size={11} color={B.blush} />Access
              </button>
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

    audio: (
      <Pg title="Jess's Voice" sub="Weekly Check-In">
        <p style={{ color: B.mid, fontSize: 13, margin: "-12px 0 24px", fontWeight: 300 }}>A personal message from Jess every week — just for this community.</p>
        <div style={{ background: B.black, borderLeft: `3px solid ${B.blush}`, padding: "28px 28px", marginBottom: 16 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: B.blushLight, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 6px" }}>This Week · Apr 16, 2025</p>
          <h3 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 26, textTransform: "uppercase", color: B.ivory, margin: "0 0 12px", letterSpacing: "-0.5px" }}>Pricing Confidence.</h3>
          <p style={{ color: "#9a8880", fontSize: 13, lineHeight: 1.8, fontWeight: 300, margin: "0 0 20px" }}>"Your pricing confidence starts with your language. This week I want you to say your prices out loud — to yourself, to a friend, to your reflection. Confidence is a practice, not a personality trait. You already have what it takes."</p>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => setAudioPlaying(p => !p)} style={{ width: 48, height: 48, borderRadius: "50%", background: B.blush, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <Ic n={audioPlaying ? "zap" : "play"} size={20} color={B.white} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ height: 3, background: "#2a2a2a", borderRadius: 2, marginBottom: 6 }}>
                <div style={{ height: "100%", width: audioPlaying ? "45%" : "0%", background: B.blush, borderRadius: 2, transition: audioPlaying ? "width 60s linear" : "none" }} />
              </div>
              <div style={{ fontSize: 10, color: "#9a8880", fontWeight: 300 }}>{audioPlaying ? "Playing… 1:12 / 2:40" : "Tap to play · 2:40"}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {[["Apr 9, 2025", "Your First 5 Clients"], ["Apr 2, 2025", "Why You Need to Raise Your Prices Now"], ["Mar 26, 2025", "The Mindset Shift That Changes Everything"]].map(([date, title]) => (
            <div key={date} style={{ background: B.white, border: `1px solid ${B.cloud}`, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 12, fontWeight: 600, color: B.black }}>{title}</div><div style={{ fontSize: 9, color: B.mid, fontWeight: 300, marginTop: 2 }}>{date}</div></div>
              <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", border: `1px solid ${B.cloud}`, background: "none", color: B.steel, fontSize: 9, cursor: "pointer", fontFamily: FONTS.body, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
                <Ic n="play" size={10} color={B.blush} />Play
              </button>
            </div>
          ))}
        </div>
      </Pg>
    ),

    upgrade: (
      <Pg title="Level Up" sub="Ready for More?">
        <p style={{ color: B.mid, fontSize: 13, margin: "-12px 0 24px", fontWeight: 300 }}>You're in the community. Now take the next step.</p>
        <div style={{ background: B.black, padding: "28px 28px", marginBottom: 16, borderLeft: `3px solid ${B.blush}` }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: B.blushLight, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 8px" }}>A message from Jess</p>
          <p style={{ color: B.ivory, fontSize: 15, lineHeight: 1.8, fontWeight: 300, fontStyle: "italic", margin: "0 0 6px" }}>"Being in the community is step one. But if you're ready to raise your prices, fill your books, and build something real — that's exactly what 1:1 mentorship is designed for."</p>
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
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", fontFamily: FONTS.body, background: B.off }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700;900&family=DM+Sans:wght@300;400;500;600&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0} button{-webkit-tap-highlight-color:transparent;transition:all .18s} button:active{opacity:.78} input,textarea{font-size:16px!important;font-family:inherit} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:${B.cloud}}`}</style>

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
            return <button key={id} onClick={() => setView(id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px 8px", border: "none", background: "transparent", color: on || isUpgrade ? B.blush : B.mid, fontFamily: FONTS.body, fontSize: 8, fontWeight: on ? 700 : isUpgrade ? 600 : 300, position: "relative", letterSpacing: 1.5, textTransform: "uppercase" }}><Ic n={icon} size={20} color={on || isUpgrade ? B.blush : B.mid} />{label}</button>;
          })}
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
  const communityList = Object.entries(DB.users).filter(([, u]) => u.role === "community").map(([email, u]) => ({ email, ...u }));
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
        {[[menteeList.length, "Active Mentees", true], [communityList.length, "Community Members", false], [pending.length, "Pending Leads", pending.length > 0], [`$${totalRev.toLocaleString()}`, "Total Revenue", false]].map(([v, l, accent], i) => (
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
                  <Btn size="sm" variant="blush" icon="message">Invite to Mentor</Btn>
                  <Btn size="sm" variant="ghost" icon="eye">View Activity</Btn>
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
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 2 }}>
        {[{ name: "Jessica M.", time: "2:00 PM", session: "Session 4" }, { name: "Casey L.", time: "4:30 PM", session: "Check-in" }].map((s, i) => (
          <div key={i} style={{ background: B.black, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `3px solid ${B.blush}` }}>
            <div>
              <div style={{ fontSize: 9, color: B.blushLight, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>{s.time} EST</div>
              <div style={{ color: B.ivory, fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>{s.name}</div>
              <div style={{ color: "#9a8880", fontSize: 11, fontWeight: 300 }}>{s.session}</div>
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
                      <p style={{ margin: 0, fontSize: 12, color: isJ ? B.ivory : B.charcoal, lineHeight: 1.55, fontWeight: 300 }}>{m.text}</p>
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
        <div style={{ width: 220, background: B.white, borderRight: `1px solid ${B.cloud}`, display: "flex", flexDirection: "column", height: "100%", flexShrink: 0 }}>
          <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${B.cloud}` }}><Logo height={isMobile ? 50 : 60} /></div>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${B.cloud}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: B.blush, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: B.white, flexShrink: 0 }}>JR</div>
            <div><div style={{ color: B.ink, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>Jess</div><div style={{ fontSize: 8, color: B.blush, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Admin · Mentor</div></div>
          </div>
          <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
            {ADMIN_NAV.map(({ id, icon, label }) => {
              const on = view === id; const badge = id === "leads" && pending.length > 0;
              return <button key={id} onClick={() => setView(id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "none", background: on ? B.blushPale : "transparent", color: on ? B.blush : B.steel, marginBottom: 2, fontFamily: FONTS.body, fontSize: 12, fontWeight: on ? 700 : 400, textAlign: "left", cursor: "pointer", borderLeft: `3px solid ${on ? B.blush : "transparent"}`, transition: "all .15s", letterSpacing: "0.03em", position: "relative", borderRadius: "0 6px 6px 0" }}><Ic n={icon} size={14} color={on ? B.blush : B.mid} />{label}{badge && <span style={{ marginLeft: "auto", background: B.blush, color: B.white, fontSize: 7, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>{pending.length}</span>}</button>;
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
          if (u) { setActiveUser(u); setActiveSession(s);
            const dest = s.role === "admin" ? "admin" : s.role === "community" ? "community" : "portal";
            setScreen(dest);
          }
        } else { sessionStorage.removeItem("sjtn_session"); }
      }
    } catch { sessionStorage.removeItem("sjtn_session"); }
  }, []);

  const handleLogin = useCallback((email, userData, session) => {
    setActiveUser(userData); setActiveSession(session);
    sessionStorage.setItem("sjtn_session", JSON.stringify(session));
    const dest = userData.role === "admin" ? "admin" : userData.role === "community" ? "community" : "portal";
    setScreen(dest);
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
      {screen === "portal"    && activeUser && sessionValid && <MenteePortal user={activeUser} onLogout={handleLogout} />}
      {screen === "community" && activeUser && sessionValid && <CommunityPortal user={activeUser} onLogout={handleLogout} onUpgrade={() => setScreen("booking")} />}
      {screen === "admin"     && activeUser && <AdminDashboard onLogout={handleLogout} />}
      {(screen === "portal" || screen === "admin" || screen === "community") && !sessionValid && <AuthPortal onLogin={handleLogin} onBack={() => setScreen("landing")} onBook={() => setScreen("booking")} />}
    </>
  );
}
