"use client";
import HeroField from './HeroField';
import ClubMenu from './ClubMenu';

// Fonts: Anton (display) + Instrument Serif (tags) — Google Fonts, with system
// fallbacks. Self-contained: every style lives in the `css` string below; no
// external libraries (the elastic tweens and the tag physics are hand-rolled
// inline). Images are cover background-image divs, so a missing file just shows
// an empty box.

import { useEffect, useRef, useState, type CSSProperties } from "react";

/* ───────────────────────────────────────────────────────────────────────────
   ROSTER — a vertical list of giant discipline names. Hovering a row SPRINGS it
   open (elastic), slides three photos up into a fanned stack, recolours the
   title from terracotta to cream, and a beat later DROPS physics word-tags that
   fall, tumble and pile up inside the row. Leaving reverses it.

   PHYSICS: a small hand-written rigid-body engine. Each word-tag is a CAPSULE
   (a segment of half-length L with rounded radius r — literally the pill's
   geometry) with position, velocity, angle and angular velocity; contacts are
   resolved with restitution + Coulomb friction impulses and positional
   correction over a fixed-timestep accumulator. DOM divs are synced to body
   transforms every frame. The open/close springs use a GSAP-style elastic.out
   easing; the title colour is a straight rgb lerp.

   Inside the gallery card the route loads with ?card (which can't hover), so the
   rows AUTO-CYCLE open and closed on a loop. Honours prefers-reduced-motion by
   holding the rows collapsed and static.
   ─────────────────────────────────────────────────────────────────────────── */

// ── Photos — swap these paths for your own (3 per row) ────────────────────
const ICON_SETS = [
[{id:"figma",label:"Figma"},{id:"design",label:"Design"},{id:"prototype",label:"Prototype"},{id:"build",label:"Build"},{id:"ideas",label:"Ideas"}],
[{id:"java",label:"Java"},{id:"cpp",label:"C++"},{id:"python",label:"Python"},{id:"javascript",label:"JavaScript"},{id:"typescript",label:"TypeScript"}],
[{id:"trophy",label:"Win"},{id:"target",label:"Focus"},{id:"medal",label:"Achieve"},{id:"rocket",label:"Level up"},{id:"flag",label:"Lead"}],
];
const CATEGORIES = ["Web Development", "AI & ML", "App Development", "Cybersecurity", "Open Source", "Competitive Programming", "Cloud Computing", "UI / UX Design", "Data Science", "Robotics & IoT", "Game Development", "Hackathons", "DevOps", "Blockchain", "Problem Solving"];

const ROWS = [
{name:"Create", tags:["Ideas", "Design", "Build together", "Innovation"]},
{name:"Code", tags:["Web dev", "AI & ML", "Algorithms", "Open source"]},
{name:"Conquer", tags:["Hackathons", "Challenges", "Teamwork", "Keep growing"]},
];
// ── palette ──
const BG = "#080808"; // warm charcoal
const TERRA: [number, number, number] = [239, 51, 51]; // #EF3333 — title at rest
const CREAM: [number, number, number] = [245, 245, 245]; // #F5F5F5 — title on hover

// ── physics tuning ──
const GRAVITY = 2100; // px / s²
const REST = 0.2; // tag ↔ tag restitution
const REST_WALL = 0.25; // tag ↔ floor / wall restitution
const FRICTION = 0.5; // Coulomb friction
const AIR = 0.25; // linear damping / s
const ANG_AIR = 0.8; // angular damping / s
const FIXED_DT = 1 / 120;
const ITER = 6;

// ── card-mode autoplay cadence ──
const OPEN_MS = 2200; // a row stays open
const GAP_MS = 650; // closed pause before the next row

const css = `
@import url("https://fonts.googleapis.com/css2?family=Anton&family=Instrument+Serif:ital@0;1&display=swap");
.kxr-root{
  position:relative;width:100%;height:100svh;
  background:${BG};color:#F5F5F5;overflow:hidden;
  font-family:'Anton',system-ui,sans-serif;isolation:isolate;
}
.kxr-root::before{ /* faint warm vignette */
  content:"";position:absolute;inset:0;z-index:0;pointer-events:none;
  background:radial-gradient(120% 90% at 50% -10%,rgba(239,51,51,.09),transparent 58%);
}

/* ── chrome ── */
.kxr-head{
  position:absolute;left:0;right:0;top:0;z-index:30;
  display:flex;align-items:center;justify-content:space-between;
  padding:1.5rem clamp(1.2rem,4vw,2.6rem);
  pointer-events:none;mix-blend-mode:difference;
}
.kxr-mark{font-family:'Anton',sans-serif;letter-spacing:.04em;font-size:1.05rem;color:#fff;text-transform:uppercase;}
.kxr-tagline{font-family:'Instrument Serif',serif;font-size:1rem;color:#fff;letter-spacing:.02em;}

/* ── the stacked rows ── */
/* --row is the collapsed row size. It's capped so two collapsed rows + one
   fully-OPEN row (2.5×, plus the elastic overshoot) + padding always fit inside
   100svh — otherwise overflow:hidden would clip the open row's rising photos
   (top) and its piling tags (bottom). Also capped by width so wide names fit. */
.kxr-services{
  position:relative;z-index:1;width:100%;height:100svh;overflow:hidden;
  display:flex;flex-direction:column;justify-content:center;align-items:center;
  padding:2.5rem 2rem;
  --row:min(10rem, 22vw, calc((100svh - 5rem) / 5));
}
.kxr-service{
  position:relative;width:max-content;height:var(--row);
  display:flex;align-items:flex-end;overflow:hidden;cursor:pointer;
  will-change:height;
}
.kxr-name h2{
  position:relative;z-index:2;margin:0;
  text-transform:uppercase;font-family:'Anton',sans-serif;
  font-size:var(--row);font-weight:400;letter-spacing:-.01em;line-height:1;
  color:#EF3333;background:${BG};
}

/* ── the fanned photo stack (behind the name) ── */
.kxr-images{
  position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:calc(var(--row) * 2.5);height:calc(var(--row) * 2);overflow:hidden;z-index:1;
}
.kxr-img{
  position:absolute;top:50%;left:50%;
  width:calc(var(--row) * 1.5);height:var(--row);border-radius:.4rem;overflow:hidden;
  background-size:cover;background-position:center;
  transform:translate(-50%,50%) translateY(calc(var(--sh,50) * 1%)) rotate(var(--rot,0deg));
  box-shadow:0 12px 34px rgba(0,0,0,.45);
}
.kxr-img:nth-child(1){--rot:-5deg;transform-origin:bottom left;margin-top:calc(var(--row) * -0.15);}
.kxr-img:nth-child(2){--rot:2.5deg;transform-origin:bottom right;margin-top:calc(var(--row) * -0.15);}
.kxr-img:nth-child(3){--rot:0deg;}

/* ── the dropped word-tags ── */
.kxr-tags{position:absolute;inset:0;z-index:10;pointer-events:none;}
.kxr-tag{
  position:absolute;top:0;left:0;
  font-family:'Instrument Serif',serif;font-size:1.05rem;line-height:1;
  color:${"#F5F5F5"};background:${BG};border:1px solid #F5F5F5;
  border-radius:4rem;padding:.45rem 1.3rem;white-space:nowrap;
  will-change:transform,opacity;opacity:0;
}

/* Row sizing is handled by --row (above), which already scales down on small
   viewports — only the tag pills need a manual shrink on narrow screens. */
@media (max-width:999px){
  .kxr-tag{font-size:.8rem;padding:.25rem .8rem;}
}

@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
*{box-sizing:border-box}body{margin:0;background:#080808}button,a{-webkit-tap-highlight-color:transparent}button{font:inherit;cursor:pointer}button:focus-visible,a:focus-visible,.kxr-service:focus-visible{outline:2px solid #EF3333;outline-offset:6px}button{color:inherit}a{color:inherit}.kxr-root{min-height:100svh;height:auto;overflow:clip;font-family:Inter,Arial,sans-serif;padding:0 clamp(22px,5vw,80px)}.kxr-root:after{content:"";position:absolute;top:0;bottom:0;left:50%;width:1px;background:#ffffff03;pointer-events:none}.club-header{height:108px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #303030;position:relative;z-index:20}.brand{width:160px;display:block}.brand img{width:100%;display:block}.header-note,.small-label{font:500 10px Inter,Arial,sans-serif;letter-spacing:.18em;color:#A3A3A3}.menu-button{display:flex;gap:20px;align-items:center;background:none;border:0;font-size:10px;letter-spacing:.15em;padding:16px 0 16px 16px}.menu-button i{display:grid;gap:6px;width:30px}.menu-button b{display:block;height:2px;background:#F5F5F5}.menu-button b:last-child{width:20px;justify-self:end}.eyebrow{font-size:10px;letter-spacing:.18em;color:#A3A3A3;display:flex;align-items:center;gap:10px;padding-top:34px}.eyebrow>span{height:6px;width:6px;background:#EF3333;border-radius:50%}.kxr-services{height:auto;min-height:480px;overflow:visible;padding:30px 0 35px;align-items:stretch;--row:clamp(85px,10.7vw,154px)}.kxr-service{width:100%;align-items:flex-end;overflow:hidden;flex-shrink:0;border-bottom:1px solid #3030305c}.kxr-name{margin-left:8%;position:relative;z-index:2}.kxr-name h2{font-family:'Barlow Condensed','Anton',Impact,sans-serif;font-weight:800;line-height:.92;letter-spacing:-.025em;font-size:calc(var(--row)*1.08);background:transparent}.kxr-service:nth-of-type(2) .kxr-name{margin-left:30%}.kxr-service:nth-of-type(3) .kxr-name{margin-left:16%}.period{color:#EF3333}.row-index{position:absolute;left:0;bottom:15px;color:#A3A3A3;font-family:monospace;font-size:11px}.row-arrow{position:absolute;right:0;bottom:8px;font-size:40px;font-weight:400;color:#303030;transition:color .2s}.kxr-service:hover .row-arrow{color:#EF3333}.kxr-images{left:65%}.kxr-tag{font-family:Inter,Arial,sans-serif;font-size:12px;background:#181818;border-color:#EF3333;color:#F5F5F5}.hero-bottom{display:flex;justify-content:space-between;align-items:center;gap:28px;padding-bottom:38px}.intro{font-size:14px;line-height:1.8;color:#A3A3A3;margin:0;max-width:500px}.interaction-hint{font-size:8px;letter-spacing:.17em;color:#A3A3A3;margin-top:22px}.primary-cta{border:1px solid #EF3333;background:#C91D28;border-radius:100px;padding:20px 26px;font-size:13px;display:flex;gap:45px;align-items:center;color:#fff;transition:background .2s,transform .2s}.primary-cta:hover{background:#B01420;transform:translateY(-3px)}.primary-cta span{font-size:22px}.hero-footer{border-top:1px solid #303030;padding:20px 0;display:flex;justify-content:space-between;gap:15px;color:#A3A3A3;font-size:8px;letter-spacing:.14em}.footer-code{color:#EF3333}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}dialog{position:fixed;inset:0;width:100%;height:100svh;max-width:none;max-height:none;background:#101010;color:#F5F5F5;border:0;padding:36px clamp(22px,6vw,90px);margin:0;z-index:100}dialog::backdrop{background:#080808ee}.dialog-top{display:flex;justify-content:space-between;align-items:center;padding-bottom:25px;border-bottom:1px solid #303030}.close-button{border:1px solid #303030;border-radius:30px;padding:13px 20px;background:transparent;font-size:11px;letter-spacing:.1em}.menu-layout{display:grid;grid-template-columns:1.4fr 1fr;gap:12%;padding-top:38px}.nav-item{display:flex;align-items:center;gap:22px;width:100%;background:none;border:0;border-bottom:1px solid #303030;text-align:left;font-family:'Barlow Condensed',Impact,sans-serif;font-size:clamp(30px,5.5vw,65px);padding:7px 0}.nav-item small{font:10px monospace;color:#A3A3A3}.nav-item>span{margin-left:auto;font-size:28px}.nav-item.selected,.nav-item:hover{color:#FF6666}.menu-layout aside{padding-top:25px}.menu-layout aside h2{font-family:'Barlow Condensed',Impact,sans-serif;font-size:clamp(35px,4vw,60px);line-height:1.05;max-width:350px;font-weight:700;margin:25px 0}.menu-layout aside p{font-size:14px;line-height:1.8;color:#A3A3A3;max-width:320px}.menu-status{display:block;margin-top:40px;font-size:9px;letter-spacing:.15em;color:#EF3333}
@media(min-width:1600px){.kxr-root{padding-inline:max(80px,calc((100vw - 1400px)/2))}}@media(max-width:650px){.club-header{height:85px}.brand{width:125px}.header-note{display:none}.eyebrow{font-size:8px;padding-top:30px}.kxr-services{--row:clamp(70px,17vw,110px);min-height:360px;padding-top:40px;padding-bottom:35px}.kxr-name{margin-left:7%}.kxr-service:nth-of-type(2) .kxr-name{margin-left:28%}.kxr-service:nth-of-type(3) .kxr-name{margin-left:7%}.row-index{font-size:8px;bottom:8px}.row-arrow{font-size:24px;bottom:3px}.kxr-images{left:58%}.hero-bottom{flex-direction:column;align-items:flex-start;gap:18px}.intro{font-size:12px}.primary-cta{padding:15px 22px;font-size:12px}.hero-footer{font-size:7px}.footer-code{display:none}.menu-layout{grid-template-columns:1fr;gap:15px;padding-top:20px}.nav-item{font-size:35px;padding:6px 0}.menu-layout aside{padding-top:10px}.menu-layout aside h2{font-size:28px;margin:12px 0}.menu-layout aside p{font-size:12px;margin:0}.menu-status{margin-top:14px}.kxr-tag{font-size:10px;padding:7px 10px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}.interaction-hint{display:none}}


/* Centered stacked composition, following the supplied roster interaction. */
.kxr-root .hero-content{min-height:calc(100svh - 170px);display:flex;flex-direction:column}
.eyebrow{justify-content:center;text-align:center}
.kxr-services{flex:1;min-height:0;align-items:center;justify-content:center;padding:30px 0;--row:min(15rem,22vw,max(86px,calc((100svh - 230px)/3.05)))}
.kxr-service{width:max-content;max-width:100%;border:0;justify-content:center}
.kxr-name,.kxr-service:nth-of-type(2) .kxr-name,.kxr-service:nth-of-type(3) .kxr-name{margin-left:0;text-align:center}
.kxr-name h2{line-height:1;font-size:var(--row);background:#080808;letter-spacing:-.015em}
.kxr-images{left:50%}
.hero-bottom{flex-direction:column;align-items:center;text-align:center;gap:12px;padding-bottom:24px}
.intro{font-size:12px;line-height:1.7}.interaction-hint{margin:14px 0 0;font-size:8px}
.primary-cta{padding:12px 22px;gap:30px}.primary-cta span{font-size:18px}
@media(max-width:650px){.kxr-root .hero-content{min-height:calc(100svh - 140px)}.kxr-services{min-height:310px;--row:min(23.5vw,144px);padding:24px 0}.kxr-name,.kxr-service:nth-of-type(2) .kxr-name,.kxr-service:nth-of-type(3) .kxr-name{margin-left:0}.kxr-images{left:50%}.hero-bottom{align-items:center;gap:14px}.intro{font-size:11px}.eyebrow{padding-top:25px;font-size:7px}}


/* Reveals animate within each word row, without changing document flow. */
.kxr-service{height:var(--row);min-height:var(--row);max-height:var(--row)}
.kxr-images{height:var(--row);width:calc(var(--row)*2.5);top:0;left:50%}
.kxr-img{height:calc(var(--row)*.8);width:calc(var(--row)*1.25)}


/* Stable shared image stage: changing the active word never changes row height. */
.kxr-services{position:relative;--preview-height:110px;padding-top:calc(var(--preview-height) + 28px);padding-bottom:20px;--row:min(15rem,22vw,max(86px,calc((100svh - 345px)/2.75)))}
.preview-stage{position:absolute;left:50%;top:12px;transform:translateX(-50%);width:min(460px,100%);height:var(--preview-height);pointer-events:none;isolation:isolate}
.preview-fan{position:absolute;inset:0;opacity:0;transition:opacity .25s ease}
.preview-fan.is-active{opacity:1}
.preview-fan img{position:absolute;left:50%;top:50%;width:180px;height:108px;object-fit:cover;border:1px solid #3d2424;border-radius:8px;box-shadow:0 8px 30px #0007;transform:translate(-50%,calc(-50% + 24px)) rotate(0deg) scale(.85);opacity:0;transition:transform .55s cubic-bezier(.2,.85,.2,1.15),opacity .3s ease}
.preview-fan.is-active img{opacity:1;transform:translate(calc(-50% + var(--card)*100px),calc(-50% + var(--card)*var(--card)*8px)) rotate(calc(var(--card)*11deg)) scale(1)}
.preview-fan img:nth-child(2){z-index:2;transition-delay:.04s}.preview-fan img:nth-child(3){transition-delay:.08s}
@media(max-width:650px){.kxr-services{--preview-height:96px;--row:min(23.5vw,144px);min-height:calc(3 * var(--row) + 145px);padding-top:130px}.preview-stage{top:14px;width:100%}.preview-fan img{width:140px;height:84px}.preview-fan.is-active img{transform:translate(calc(-50% + var(--card)*72px),calc(-50% + var(--card)*var(--card)*6px)) rotate(calc(var(--card)*10deg)) scale(1)}}


/* Fuller editorial hero: oversized type, a technical canvas, and edge details. */
.kxr-root{background:#080808}.kxr-root::before{background:radial-gradient(ellipse at 50% 42%,#bc182522,transparent 64%)}
.kxr-root .hero-content{position:relative;isolation:isolate;min-height:calc(100svh - 170px)}
.hero-atmosphere{position:absolute;inset:0;z-index:-1;overflow:hidden;pointer-events:none;background-image:linear-gradient(#ef333308 1px,transparent 1px),linear-gradient(90deg,#ef333308 1px,transparent 1px);background-size:72px 72px;mask-image:linear-gradient(transparent,#000 16%,#000 84%,transparent)}
.ambient-orbit{position:absolute;left:50%;top:46%;border:1px solid #ef33331c;border-radius:50%;transform:translate(-50%,-50%) rotate(-24deg);width:85%;height:60%}.orbit-two{width:65%;height:85%;transform:translate(-50%,-50%) rotate(30deg)}
.code-corner{position:absolute;font:200 clamp(100px,19vw,260px)/1 monospace;color:#ef333312;top:28%}.corner-left{left:0}.corner-right{right:0}
.edge-caption{position:absolute;top:44%;font:9px monospace;letter-spacing:.23em;color:#777;writing-mode:vertical-rl}.edge-left{left:0;transform:rotate(180deg)}.edge-right{right:0}
.eyebrow{padding-top:26px;position:relative;z-index:2;color:#b4a3a3}
.kxr-services{--row:min(16rem,24vw,max(100px,calc((100svh - 245px)/3.12)));min-height:0;padding:18px 0 22px;gap:0;position:relative}
.kxr-service{overflow:visible;isolation:isolate}.kxr-name{z-index:2}.kxr-name h2{background:transparent;font-family:'Barlow Condensed',Impact,sans-serif;letter-spacing:-.035em;text-shadow:0 0 70px #ef333310}
.word-number{position:absolute;left:-30px;bottom:14%;font:9px monospace;color:#8a6666;letter-spacing:.1em}.kxr-service::after{content:"";position:absolute;left:50%;bottom:1px;width:clamp(240px,62vw,880px);height:1px;background:linear-gradient(90deg,transparent,#ef33332b,transparent);transform:translateX(-50%);z-index:-1}
.preview-stage{top:42%;left:74%;width:min(380px,35vw);height:120px;transform:translate(-50%,-50%);z-index:4}
.preview-fan img{border-color:#ef333355;box-shadow:0 18px 50px #000b}.preview-fan.is-active img{transform:translate(calc(-50% + var(--card)*65px),calc(-50% + var(--card)*var(--card)*8px)) rotate(calc(var(--card)*11deg)) scale(1)}
.discipline-strip{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:clamp(14px,2.5vw,38px);padding:19px 0 24px;border-top:1px solid #ef333328;font:9px Inter,Arial,sans-serif;letter-spacing:.13em;color:#a9a1a1}.discipline-strip b{font-size:14px;color:#EF3333;font-weight:400}
@media(min-width:1600px){.kxr-services{--row:min(18rem,22vw,calc((100svh - 250px)/3.1))}}
@media(max-width:650px){.kxr-root .hero-content{min-height:calc(100svh - 140px)}.hero-atmosphere{background-size:44px 44px}.edge-caption{font-size:7px;letter-spacing:.12em}.edge-left{left:-10px}.edge-right{right:-10px}.kxr-services{--row:min(23.5vw,144px);min-height:calc(3 * var(--row) + 52px);padding:26px 0;gap:5px}.word-number{left:-16px;font-size:7px}.preview-stage{left:62%;top:26%;height:95px;width:80%;z-index:4}.preview-fan img{width:130px;height:78px}.preview-fan.is-active img{transform:translate(calc(-50% + var(--card)*48px),calc(-50% + var(--card)*var(--card)*6px)) rotate(calc(var(--card)*10deg)) scale(1)}.discipline-strip{gap:12px 18px;font-size:7px;line-height:1.5;padding:18px 18px}.discipline-strip b{font-size:10px}.code-corner{top:35%;font-size:120px}.corner-left{left:-8px}.corner-right{right:-8px}.eyebrow{font-size:7px}}


/* Two identical tracks form a seamless, continuous category marquee. */
.discipline-strip{display:block;overflow:hidden;padding:20px 0 24px;mask-image:linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent)}
.marquee-track{display:flex;width:max-content;animation:category-scroll 48s linear infinite;will-change:transform}
.marquee-group{display:flex;align-items:center;flex-shrink:0}
.marquee-item{display:flex;align-items:center;gap:36px;padding-right:36px;white-space:nowrap;text-transform:uppercase;font-size:10px;letter-spacing:.15em;color:#beb5b5}
.marquee-item b{font-size:17px;color:#EF3333}
.discipline-strip:hover .marquee-track{animation-play-state:paused}
@keyframes category-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media(max-width:650px){.discipline-strip{padding:20px 0}.marquee-item{font-size:9px;gap:24px;padding-right:24px}.marquee-item b{font-size:15px}}
@media(prefers-reduced-motion:reduce){.discipline-strip{overflow-x:auto;mask-image:none}.marquee-track{animation:none;will-change:auto}.marquee-group[aria-hidden="true"]{display:none}}


/* Curated editorial cards: restrained angles, rich artwork, and dimensional light. */
.preview-stage{left:70%;width:460px;height:185px;perspective:1100px}
.preview-fan img{width:244px;height:175px;object-fit:cover;border-radius:13px;border:1px solid #ffffff24;box-shadow:0 22px 55px #000a,0 2px 5px #0006,inset 0 1px #ffffff20;transform:translate(-50%,calc(-50% + 16px)) rotate(0deg) scale(.92);transition:transform .48s cubic-bezier(.16,1,.3,1),opacity .22s ease,filter .35s ease;filter:brightness(.72)}
.preview-fan.is-active img{transform:translate(calc(-50% + var(--card)*91px),calc(-50% + var(--card)*var(--card)*14px)) rotate(calc(var(--card)*7deg)) scale(.94);filter:brightness(.75)}
.preview-fan.is-active img:nth-child(2){transform:translate(-50%,-56%) rotate(-2deg) scale(1.04);filter:brightness(1);z-index:3;box-shadow:0 30px 75px #000d,0 0 0 1px #ffffff18,0 1px 0 #ffffff30}
.preview-fan img:nth-child(1){transition-delay:0s}.preview-fan img:nth-child(2){transition-delay:.035s}.preview-fan img:nth-child(3){transition-delay:.065s}
@media(max-width:650px){.preview-stage{left:58%;width:300px;height:135px}.preview-fan img{width:177px;height:127px;border-radius:10px}.preview-fan.is-active img{transform:translate(calc(-50% + var(--card)*54px),calc(-50% + var(--card)*var(--card)*10px)) rotate(calc(var(--card)*6deg)) scale(.94)}.preview-fan.is-active img:nth-child(2){transform:translate(-50%,-54%) rotate(-2deg) scale(1.02)}}


/* Small, topic-specific icon tiles replace the artwork cards. */
.preview-stage.icon-preview{left:77%;top:calc(50% + (var(--active-row) - 1)*var(--row));width:280px;height:190px;transform:translate(-50%,-50%);transition:top .25s ease;z-index:4}
.icon-cloud{position:absolute;inset:0;opacity:0;transition:opacity .16s ease}
.icon-cloud.is-active{opacity:1}
.icon-tile{position:absolute;width:76px;height:88px;border:1px solid #ffffff22;border-radius:18px;background:linear-gradient(145deg,#29272af5,#101012fa);box-shadow:0 12px 30px #0009,inset 0 1px #ffffff12;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;left:var(--x);top:var(--y);transform:translateY(18px) rotate(0deg) scale(.8);opacity:0;transition:transform .42s cubic-bezier(.16,1,.3,1),opacity .22s ease;transition-delay:calc(var(--tile)*.025s)}
.icon-tile img{width:43px;height:43px;object-fit:contain;filter:drop-shadow(0 3px 7px #0005)}
.icon-tile span{font:500 9px Inter,Arial,sans-serif;letter-spacing:.01em;color:#e2dce0}
.icon-tile:nth-child(1){--x:5px;--y:14px;--angle:-10deg}.icon-tile:nth-child(2){--x:99px;--y:0px;--angle:5deg}.icon-tile:nth-child(3){--x:192px;--y:24px;--angle:12deg}.icon-tile:nth-child(4){--x:52px;--y:110px;--angle:-5deg}.icon-tile:nth-child(5){--x:152px;--y:117px;--angle:8deg}
.icon-cloud.is-active .icon-tile{opacity:1;transform:translateY(0) rotate(var(--angle)) scale(1)}
@media(max-width:650px){.preview-stage.icon-preview{left:71%;width:210px;height:150px}.icon-tile{width:59px;height:69px;border-radius:13px;gap:2px}.icon-tile img{width:34px;height:34px}.icon-tile span{font-size:7px}.icon-tile:nth-child(1){--x:0px;--y:8px}.icon-tile:nth-child(2){--x:71px;--y:0px}.icon-tile:nth-child(3){--x:140px;--y:16px}.icon-tile:nth-child(4){--x:35px;--y:83px}.icon-tile:nth-child(5){--x:111px;--y:89px}}


/* Tactile graphite cards with inset icon wells and machined edges. */
.preview-stage.icon-preview{left:79%;width:316px;height:232px;perspective:1400px}.icon-cloud{filter:drop-shadow(0 26px 28px #0008)}
.icon-tile{width:94px;height:112px;gap:0;overflow:hidden;border-radius:14px;border:1px solid #ffffff17;background:radial-gradient(ellipse at 0% 0%,#ffffff16,transparent 65%),linear-gradient(145deg,#323135,#212024 35%,#141416);box-shadow:0 1px 0 #ffffff38 inset,1px 0 0 #ffffff12 inset,0 -3px 0 #080809 inset,0 2px 0 #060607,0 3px 0 #242225,0 10px 17px #0008,0 22px 40px #0005;justify-content:flex-start;transform:translate3d(0,16px,-30px) rotateX(12deg) rotateY(-10deg) scale(.92);transition:transform .5s cubic-bezier(.16,1,.3,1),opacity .22s ease;transform-style:preserve-3d;backface-visibility:hidden}
.icon-tile::before{content:"";position:absolute;inset:1px;border-radius:12px;background:linear-gradient(125deg,#ffffff09,transparent 32%,transparent 65%,#ffffff03);pointer-events:none;border:1px solid #ffffff04}.icon-tile::after{content:"";position:absolute;inset:auto 14px 2px;height:1px;background:linear-gradient(90deg,transparent,#ef526344,transparent)}
.tile-serial{position:absolute;left:10px;right:10px;top:8px;display:flex;justify-content:space-between;align-items:center;color:#8c898f;font:7px monospace;letter-spacing:.1em;z-index:1}.tile-serial i{width:3px;height:3px;border-radius:50%;background:#9b9297;box-shadow:0 0 0 2px #ffffff04}
.icon-well{width:58px;height:58px;flex:none;margin-top:22px;display:flex;align-items:center;justify-content:center;border-radius:13px;background:linear-gradient(145deg,#101013,#252429);box-shadow:0 1px 4px #0007 inset,0 1px 0 #ffffff0e;border:1px solid #0005;position:relative}.icon-well::after{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(ellipse at 50% 110%,#f065750c,transparent 75%)}
.icon-tile .icon-well img{width:41px;height:41px;object-fit:contain;filter:drop-shadow(0 2px 1px #0008) drop-shadow(0 4px 5px #0004)}.icon-tile>span{font:500 9px Inter,Arial,sans-serif;color:#e2e0e3;letter-spacing:.01em;margin-top:10px;text-shadow:0 1px 1px #000}.tile-groove{width:12px;height:1px;background:#ffffff16;box-shadow:0 1px #000a;margin-top:6px}
.icon-tile:nth-child(1){--x:0px;--y:12px;--angle:-5deg}.icon-tile:nth-child(2){--x:108px;--y:0px;--angle:0deg}.icon-tile:nth-child(3){--x:216px;--y:12px;--angle:5deg}.icon-tile:nth-child(4){--x:54px;--y:129px;--angle:-3deg}.icon-tile:nth-child(5){--x:162px;--y:129px;--angle:3deg}.icon-cloud.is-active .icon-tile{opacity:1;transform:translate3d(0,0,0) rotateX(7deg) rotateY(-7deg) rotateZ(var(--angle)) scale(1)}
@media(max-width:650px){.preview-stage.icon-preview{left:66%;width:244px;height:190px}.icon-tile{width:72px;height:90px;border-radius:11px}.icon-tile::before{border-radius:9px}.tile-serial{left:8px;right:8px;top:6px;font-size:6px}.icon-well{width:45px;height:45px;border-radius:10px;margin-top:18px}.icon-tile .icon-well img{width:32px;height:32px}.icon-tile>span{font-size:7px;margin-top:8px}.tile-groove{margin-top:5px}.icon-tile:nth-child(1){--x:0px;--y:8px}.icon-tile:nth-child(2){--x:84px;--y:0px}.icon-tile:nth-child(3){--x:168px;--y:8px}.icon-tile:nth-child(4){--x:42px;--y:104px}.icon-tile:nth-child(5){--x:126px;--y:104px}}


/* Bare transparent logos only; no card, inset well, label or shadow. */
.icon-cloud{filter:none}
.icon-tile{background:none;border:0;border-radius:0;box-shadow:none;overflow:visible;justify-content:center;align-items:center;gap:0}
.icon-tile::before,.icon-tile::after{display:none}
.icon-tile>img{width:66px;height:66px;object-fit:contain;filter:none}
@media(max-width:650px){.icon-tile{background:none;border:0;border-radius:0;box-shadow:none}.icon-tile>img{width:50px;height:50px;filter:none}}


/* Live logo motion keeps the original brand artwork intact. */
.brand{position:relative;isolation:isolate;transform-origin:left center;transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.brand img{position:relative;z-index:1;animation:club-logo-float 5.5s ease-in-out infinite;filter:drop-shadow(0 2px 5px #0006);will-change:transform}
.brand::before{content:"";position:absolute;inset:-7px;background:url('/assets/club-logo.png') center/contain no-repeat;filter:blur(13px);opacity:.14;z-index:0;animation:club-logo-glow 5.5s ease-in-out infinite;pointer-events:none;transition:opacity .3s}
.brand::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(115deg,transparent 30%,#ffffff00 43%,#ffffff99 49%,#ffffff33 53%,transparent 62%);background-size:350% 100%;background-position:130% 0;-webkit-mask:url('/assets/club-logo.png') center/contain no-repeat;mask:url('/assets/club-logo.png') center/contain no-repeat;animation:club-logo-sheen 7s ease-in-out infinite,club-logo-float 5.5s ease-in-out infinite;mix-blend-mode:screen}
.brand:hover,.brand:focus-visible{transform:scale(1.045)}.brand:hover::before,.brand:focus-visible::before{opacity:.35}
@keyframes club-logo-float{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-3px) rotate(-.5deg)}}
@keyframes club-logo-glow{0%,100%{opacity:.12;transform:scale(.98)}50%{opacity:.24;transform:scale(1.035)}}
@keyframes club-logo-sheen{0%,48%{background-position:130% 0;opacity:0}51%{opacity:.7}72%{background-position:-35% 0;opacity:.7}76%,100%{background-position:-35% 0;opacity:0}}
@media(prefers-reduced-motion:reduce){.brand,.brand img,.brand::before,.brand::after{animation:none!important;transition:none!important;transform:none!important;will-change:auto}.brand::after{display:none}.brand::before{opacity:.12}}


/* The <c> mark moves independently from the club lettering. */
.brand{perspective:500px}.brand img{clip-path:inset(0 0 0 47%);animation:none;filter:none;will-change:auto}
.brand-mark-live{position:absolute;inset:0;background:url('/assets/club-logo.png') center/contain no-repeat;clip-path:inset(0 55% 0 0);transform-origin:22% 50%;animation:club-mark-live 4.8s ease-in-out infinite;will-change:transform;z-index:1;filter:drop-shadow(0 0 3px #359aff22)}
.brand:hover .brand-mark-live{animation-duration:2s}.brand::after{animation:club-logo-sheen 7s ease-in-out infinite}.brand::before{opacity:.1}
@keyframes club-mark-live{0%,100%{transform:translateY(0) rotateY(-9deg) rotateZ(-1deg) scale(1)}35%{transform:translateY(-2px) rotateY(14deg) rotateZ(1.5deg) scale(1.05)}65%{transform:translateY(1px) rotateY(-12deg) rotateZ(-1deg) scale(1.015)}}
.header-actions{display:flex;align-items:center;gap:25px}.sound-button{background:none;border:0;padding:13px 5px;color:#a3a3a3;font:500 8px Inter,Arial,sans-serif;letter-spacing:.1em;display:flex;align-items:center;gap:9px}.sound-button[aria-pressed="true"]{color:#f2d5da}.sound-bars{height:14px;display:flex;align-items:center;gap:2px}.sound-bars i{width:2px;height:3px;background:#777;transform-origin:center}.sound-bars.is-on i{background:#ef5263;animation:club-equalizer .9s ease-in-out infinite alternate}.sound-bars i:nth-child(2){animation-delay:-.4s}.sound-bars i:nth-child(3){animation-delay:-.7s}.sound-bars i:nth-child(4){animation-delay:-.2s}@keyframes club-equalizer{from{height:3px}to{height:13px}}
@media(max-width:650px){.header-actions{gap:12px}.sound-button{font-size:7px;gap:6px}.menu-button{gap:10px}}
@media(prefers-reduced-motion:reduce){.brand-mark-live,.sound-bars.is-on i{animation:none!important;transform:none!important;will-change:auto}.sound-bars.is-on i:nth-child(even){height:10px}}


/* Sequential assembly: C arrives first; brackets follow from opposite sides. */
.brand::before,.brand::after{display:none}
.brand.uploaded-brand{width:90px;height:66px}.uploaded-brand img{width:100%;height:100%;object-fit:contain;clip-path:none;animation:club-logo-float 5.5s ease-in-out infinite}.brand-sequence{position:absolute;inset:0;width:100%;height:100%;overflow:visible;z-index:1;pointer-events:none}
.brand-sequence image{transform-box:fill-box}.brand-sequence>g{transform-box:view-box}.logo-sequence-c{transform-origin:190px 123.5px;animation:logo-c-assemble 7s cubic-bezier(.2,.8,.2,1) infinite}
.logo-sequence-left{animation:logo-left-assemble 7s cubic-bezier(.2,.8,.2,1) infinite}
.logo-sequence-right{animation:logo-right-assemble 7s cubic-bezier(.2,.8,.2,1) infinite}
@keyframes logo-c-assemble{0%{opacity:0;transform:translateY(9px) scale(.68)}7%{opacity:1;transform:translateY(-2px) scale(1.07)}12%,83%{opacity:1;transform:translateY(0) scale(1)}94%,100%{opacity:0;transform:translateY(-5px) scale(.92)}}
@keyframes logo-left-assemble{0%,12%{opacity:0;transform:translateX(-22px)}24%,80%{opacity:1;transform:translateX(0)}90%,100%{opacity:0;transform:translateX(-16px)}}
@keyframes logo-right-assemble{0%,12%{opacity:0;transform:translateX(22px)}24%,80%{opacity:1;transform:translateX(0)}90%,100%{opacity:0;transform:translateX(16px)}}
@media(prefers-reduced-motion:reduce){.logo-sequence-c,.logo-sequence-left,.logo-sequence-right{animation:none!important;transform:none!important;opacity:1!important}}

`;

// ── easing ──
// GSAP-style elastic.out(amplitude 1, period). Overshoots then settles to 1.
function elasticOut(t: number, period: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const s = period / 4; // asin(1)/(2π)·period with amplitude 1
  return Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / period) + 1;
}
const power4Out = (t: number) => 1 - Math.pow(1 - t, 4);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

type Tween = { from: number; to: number; start: number; dur: number; ease: (t: number) => number };
function tval(tw: Tween, now: number) {
  return tw.from + (tw.to - tw.from) * tw.ease(clamp01((now - tw.start) / tw.dur));
}
function tdone(tw: Tween, now: number) {
  return now - tw.start >= tw.dur;
}

// ── tag physics body ──
type TBody = {
  el: HTMLDivElement;
  x: number; y: number; vx: number; vy: number;
  a: number; w: number;
  L: number; r: number; bw: number; bh: number;
  invM: number; invI: number;
  fadeStart: number;
};

type RowState = {
  service: HTMLDivElement;
  h1: HTMLHeadingElement;
  imgs: HTMLDivElement[];
  hovered: boolean;
  collapsedPx: number; // measured rest height (CSS --row); expanded = ×2.5
  curHeight: number;
  curColor: [number, number, number];
  curShift: number[]; // per-image --sh (%)
  hTween: Tween | null;
  cTween: { from: [number, number, number]; to: [number, number, number]; start: number; dur: number } | null;
  iTween: (Tween | null)[];
  tagsEl: HTMLDivElement | null;
  bodies: TBody[];
  fadeOutAt: number; // >0 → tags fading out, remove when done
  dropTimer: ReturnType<typeof setTimeout> | null;
  simW: number;
  floorY: number;
};

// Closest points between segments p1→q1 and p2→q2 (Ericson, RTCD).
function closestSegSeg(
  p1x: number, p1y: number, q1x: number, q1y: number,
  p2x: number, p2y: number, q2x: number, q2y: number
) {
  const d1x = q1x - p1x, d1y = q1y - p1y;
  const d2x = q2x - p2x, d2y = q2y - p2y;
  const rx = p1x - p2x, ry = p1y - p2y;
  const a = d1x * d1x + d1y * d1y;
  const e = d2x * d2x + d2y * d2y;
  const f = d2x * rx + d2y * ry;
  let s = 0, t = 0;
  const EPS = 1e-9;
  if (a <= EPS && e <= EPS) {
    s = 0; t = 0;
  } else if (a <= EPS) {
    t = Math.min(1, Math.max(0, f / e));
  } else {
    const c = d1x * rx + d1y * ry;
    if (e <= EPS) {
      s = Math.min(1, Math.max(0, -c / a));
    } else {
      const b = d1x * d2x + d1y * d2y;
      const denom = a * e - b * b;
      if (denom > EPS) s = Math.min(1, Math.max(0, (b * f - c * e) / denom));
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); }
      else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); }
    }
  }
  return {
    c1x: p1x + d1x * s, c1y: p1y + d1y * s,
    c2x: p2x + d2x * t, c2y: p2y + d2y * t,
  };
}

export default function RosterReveal({onNavigate}: {onNavigate?: (path:string)=>void}) {
  const [soundEnabled,setSoundEnabled] = useState(true);
  const soundOn = useRef(true);
  const audioRef = useRef<AudioContext | null>(null);
  const lastSound = useRef(-1);
  const playCue = (kind = 0) => {
    const ctx = audioRef.current;
    if (!soundOn.current || !ctx || ctx.state !== "running" || document.hidden) return;
    const now = ctx.currentTime;
    if (now - lastSound.current < .1) return;
    lastSound.current = now;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const tones = [440,554.37,659.25,880];
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(tones[kind % 4],now);
    oscillator.frequency.exponentialRampToValueAtTime(tones[kind % 4]*1.3,now+.07);
    gain.gain.setValueAtTime(0,now);
    gain.gain.linearRampToValueAtTime(.04,now+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.17);
    oscillator.connect(gain);gain.connect(ctx.destination);
    oscillator.start(now);oscillator.stop(now+.19);
    oscillator.onended = () => {oscillator.disconnect();gain.disconnect()};
  };
  const toggleSound = async () => {
    if(soundOn.current){soundOn.current=false;setSoundEnabled(false);await audioRef.current?.suspend();return;}
    try {
      const AudioEngine = window.AudioContext || (window as any).webkitAudioContext;
      if(!AudioEngine) return;
      if(!audioRef.current) audioRef.current=new AudioEngine();
      await audioRef.current!.resume();soundOn.current=true;setSoundEnabled(true);playCue(3);
    } catch {soundOn.current=false;setSoundEnabled(false);}
  };
  useEffect(()=>{
    let mounted=true,unlocking=false;
    soundOn.current=true;
    // Audio is enabled by default; browsers unlock the context on a gesture.
    const unlockAudio=async()=>{
      if(!soundOn.current||unlocking||document.hidden||audioRef.current?.state==="running")return;
      const AudioEngine=window.AudioContext||(window as any).webkitAudioContext;
      if(!AudioEngine)return;
      unlocking=true;
      try{
        if(!audioRef.current||audioRef.current.state==="closed"){audioRef.current=new AudioEngine();lastSound.current=-1;}
        await audioRef.current!.resume();
        if(mounted&&soundOn.current)playCue(3);
      }catch{/* Retry on the next gesture if the browser has not unlocked audio. */}
      finally{unlocking=false;}
    };
    document.addEventListener('pointerdown',unlockAudio,true);
    document.addEventListener('keydown',unlockAudio,true);
    return()=>{mounted=false;soundOn.current=false;document.removeEventListener('pointerdown',unlockAudio,true);document.removeEventListener('keydown',unlockAudio,true);const ctx=audioRef.current;audioRef.current=null;if(ctx&&ctx.state!=="closed")void ctx.close().catch(()=>{});};
  },[]);
  const [activePreview,setActivePreview] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if(menuOpen) menuRef.current?.showModal(); else menuRef.current?.close(); }, [menuOpen]);
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;

    // Row geometry is derived from the MEASURED collapsed height (the CSS --row,
    // which already scales to fit the viewport), so the physics floor and the
    // open height always match what's actually rendered — no rem guessing.
    const EXPAND = 1; // Reveal stays inside a fixed-height row; siblings never move.
    const FLOOR = 0.12; // floor inset as a fraction of the open height
    const expandedOf = (rs: RowState) => rs.collapsedPx * EXPAND;

    const serviceEls = Array.from(root.querySelectorAll<HTMLDivElement>(".kxr-service"));
    const rows: RowState[] = serviceEls.map((service) => ({
      service,
      h1: service.querySelector<HTMLHeadingElement>("h2")!,
      imgs: Array.from(service.querySelectorAll<HTMLDivElement>(".kxr-img")),
      hovered: false,
      collapsedPx: service.offsetHeight,
      curHeight: service.offsetHeight,
      curColor: [...TERRA] as [number, number, number],
      curShift: [50, 50, 50],
      hTween: null,
      cTween: null,
      iTween: [null, null, null],
      tagsEl: null,
      bodies: [],
      fadeOutAt: 0,
      dropTimer: null,
      simW: 0,
      floorY: 0,
    }));

    // ── tag creation / teardown ──
    const cleanupTags = (rs: RowState) => {
      if (rs.tagsEl) rs.tagsEl.remove();
      rs.tagsEl = null;
      rs.bodies = [];
      rs.fadeOutAt = 0;
    };

    const createTags = (rs: RowState, rowIdx: number) => {
      cleanupTags(rs);
      const expanded = expandedOf(rs);
      rs.simW = rs.service.offsetWidth;
      rs.floorY = expanded * (1 - FLOOR); // pile against the final open floor

      const container = document.createElement("div");
      container.className = "kxr-tags";
      rs.service.appendChild(container);
      rs.tagsEl = container;

      wake();
      const now = performance.now();
      ROWS[rowIdx].tags.forEach((label, i) => {
        const el = document.createElement("div");
        el.className = "kxr-tag";
        el.textContent = label;
        container.appendChild(el);
        const bw = el.offsetWidth;
        const bh = el.offsetHeight;
        const r = bh / 2;
        const L = Math.max(0, bw / 2 - r);
        const m = (bw * bh) * 0.002;
        const invM = 1 / m;
        const invI = 1 / ((m * (bw * bw + bh * bh)) / 12);
        const startX = rs.simW * 0.25 + Math.random() * rs.simW * 0.5;
        const startY = -(bh / 2) - i * 8;
        rs.bodies.push({
          el, x: startX, y: startY,
          vx: (Math.random() - 0.5) * 80, vy: 0,
          a: (Math.random() - 0.5) * 0.4, w: (Math.random() - 0.5) * 3,
          L, r, bw, bh, invM, invI,
          fadeStart: now + i * 40,
        });
      });
    };

    // ── open / close ──
    const enterRow = (rs: RowState, rowIdx: number) => {
      rs.hovered = true;

      rs.fadeOutAt = 0;
      wake();
      const now = performance.now();
      rs.hTween = { from: rs.curHeight, to: expandedOf(rs), start: now, dur: 750, ease: (t) => elasticOut(t, 0.5) };
      rs.cTween = { from: [...rs.curColor] as [number, number, number], to: CREAM, start: now, dur: 250 };
      for (let j = 0; j < rs.imgs.length; j++) {
        rs.iTween[j] = { from: rs.curShift[j], to: -50, start: now + j * 75, dur: 750, ease: (t) => elasticOut(t, 0.5) };
      }
      if (rs.dropTimer) clearTimeout(rs.dropTimer);
      rs.dropTimer = setTimeout(() => { if (rs.hovered) createTags(rs, rowIdx); }, 200);
    };

    const leaveRow = (rs: RowState) => {
      rs.hovered = false;
      wake();
      const now = performance.now();
      if (rs.dropTimer) { clearTimeout(rs.dropTimer); rs.dropTimer = null; }
      if (rs.bodies.length) rs.fadeOutAt = now; // fade the tags out, then remove
      rs.hTween = { from: rs.curHeight, to: rs.collapsedPx, start: now, dur: 500, ease: (t) => elasticOut(t, 0.75) };
      rs.cTween = { from: [...rs.curColor] as [number, number, number], to: TERRA, start: now, dur: 250 };
      for (let j = 0; j < rs.imgs.length; j++) {
        rs.iTween[j] = { from: rs.curShift[j], to: 50, start: now + j * 75, dur: 750, ease: (t) => elasticOut(t, 0.5) };
      }
    };

    // ── input: hover on the standalone page, auto-cycle inside a card ──
    const card = new URLSearchParams(window.location.search).has("card");
    const listeners: Array<() => void> = [];
    let cardCancelled = false;
    let cardTimer: ReturnType<typeof setTimeout> | null = null;

    if (card) {
      const cycle = (i: number) => {
        if (cardCancelled) return;
        enterRow(rows[i], i);
        cardTimer = setTimeout(() => {
          if (cardCancelled) return;
          leaveRow(rows[i]);
          cardTimer = setTimeout(() => cycle((i + 1) % rows.length), GAP_MS);
        }, OPEN_MS);
      };
      cardTimer=setTimeout(()=>cycle(0),0);
    } else {
      rows.forEach((rs, i) => {
        const onEnter = () => enterRow(rs, i);
        const onLeave = () => leaveRow(rs);
        const onClick = () => rs.hovered ? leaveRow(rs) : enterRow(rs, i);
        rs.service.addEventListener("click", onClick);
        rs.service.addEventListener("focus", onEnter);
        rs.service.addEventListener("blur", onLeave);
        rs.service.addEventListener("keydown", onKey);
        function onKey(e: KeyboardEvent) {if(e.key === "Enter" || e.key === " "){e.preventDefault();onClick();}}
        listeners.push(() => { rs.service.removeEventListener("click",onClick); rs.service.removeEventListener("focus",onEnter);rs.service.removeEventListener("blur",onLeave);rs.service.removeEventListener("keydown",onKey); });
        rs.service.addEventListener("mouseenter", onEnter);
        rs.service.addEventListener("mouseleave", onLeave);
        listeners.push(() => {
          rs.service.removeEventListener("mouseenter", onEnter);
          rs.service.removeEventListener("mouseleave", onLeave);
        });
      });
    }

    // Re-measure collapsed heights when the viewport changes (--row is vh/vw
    // capped), so resting rows track the new size and the floor stays correct.
    const onResize = () => {
      for (const rs of rows) {
        if (rs.hovered) continue;
        rs.service.style.height = ""; // let CSS --row recompute
        rs.collapsedPx = rs.service.offsetHeight;
        rs.curHeight = rs.collapsedPx;
      }
    };
    window.addEventListener("resize", onResize);
    listeners.push(() => window.removeEventListener("resize", onResize));

    // ── physics step for one row ──
    const endpoints = (b: TBody) => {
      const dx = Math.cos(b.a), dy = Math.sin(b.a);
      return { ax: b.x - dx * b.L, ay: b.y - dy * b.L, bx: b.x + dx * b.L, by: b.y + dy * b.L };
    };
    const applyImpulse = (b: TBody, px: number, py: number, cxp: number, cyp: number) => {
      b.vx += px * b.invM; b.vy += py * b.invM;
      const rx = cxp - b.x, ry = cyp - b.y;
      b.w += b.invI * (rx * py - ry * px);
    };
    const ptVel = (b: TBody, x: number, y: number) => {
      const rx = x - b.x, ry = y - b.y;
      return { vx: b.vx - b.w * ry, vy: b.vy + b.w * rx };
    };
    const resolve = (
      a: TBody, b: TBody | null,
      cxp: number, cyp: number,
      nx: number, ny: number, pen: number, rest: number
    ) => {
      const invMb = b ? b.invM : 0;
      if (a.invM + invMb === 0) return;
      const corr = pen / (a.invM + invMb);
      a.x += nx * corr * a.invM; a.y += ny * corr * a.invM;
      if (b) { b.x -= nx * corr * b.invM; b.y -= ny * corr * b.invM; }
      const va = ptVel(a, cxp, cyp);
      const vb = b ? ptVel(b, cxp, cyp) : { vx: 0, vy: 0 };
      const rvx = va.vx - vb.vx, rvy = va.vy - vb.vy;
      const vn = rvx * nx + rvy * ny;
      if (vn > 0) return;
      const rax = cxp - a.x, ray = cyp - a.y;
      const raCrossN = rax * ny - ray * nx;
      let denom = a.invM + a.invI * raCrossN * raCrossN;
      let rbx = 0, rby = 0;
      if (b) {
        rbx = cxp - b.x; rby = cyp - b.y;
        const rbCrossN = rbx * ny - rby * nx;
        denom += b.invM + b.invI * rbCrossN * rbCrossN;
      }
      const j = (-(1 + rest) * vn) / denom;
      applyImpulse(a, nx * j, ny * j, cxp, cyp);
      if (b) applyImpulse(b, -nx * j, -ny * j, cxp, cyp);
      let tx = rvx - vn * nx, ty = rvy - vn * ny;
      const tl = Math.hypot(tx, ty);
      if (tl > 1e-6) {
        tx /= tl; ty /= tl;
        const raCrossT = rax * ty - ray * tx;
        let denomT = a.invM + a.invI * raCrossT * raCrossT;
        if (b) {
          const rbCrossT = rbx * ty - rby * tx;
          denomT += b.invM + b.invI * rbCrossT * rbCrossT;
        }
        let jt = -(rvx * tx + rvy * ty) / denomT;
        const max = FRICTION * Math.abs(j);
        jt = Math.max(-max, Math.min(max, jt));
        applyImpulse(a, tx * jt, ty * jt, cxp, cyp);
        if (b) applyImpulse(b, -tx * jt, -ty * jt, cxp, cyp);
      }
    };

    const stepRow = (rs: RowState, dt: number) => {
      const bodies = rs.bodies;
      if (!bodies.length) return;
      const W = rs.simW, FL = rs.floorY;
      const lin = Math.max(0, 1 - AIR * dt);
      const ang = Math.max(0, 1 - ANG_AIR * dt);
      for (const b of bodies) {
        b.vy += GRAVITY * dt;
        b.vx *= lin; b.vy *= lin; b.w *= ang;
        b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
      }
      for (let it = 0; it < ITER; it++) {
        for (let i = 0; i < bodies.length; i++) {
          for (let k = i + 1; k < bodies.length; k++) {
            const A = bodies[i], B = bodies[k];
            const ea = endpoints(A), eb = endpoints(B);
            const cp = closestSegSeg(ea.ax, ea.ay, ea.bx, ea.by, eb.ax, eb.ay, eb.bx, eb.by);
            let nx = cp.c1x - cp.c2x, ny = cp.c1y - cp.c2y;
            let d = Math.hypot(nx, ny);
            const rr = A.r + B.r;
            if (d < rr) {
              if (d < 1e-6) { nx = 0; ny = -1; d = 1; } else { nx /= d; ny /= d; }
              resolve(A, B, (cp.c1x + cp.c2x) / 2, (cp.c1y + cp.c2y) / 2, nx, ny, rr - d, REST);
            }
          }
        }
        for (const b of bodies) {
          const e = endpoints(b);
          const pts = [[e.ax, e.ay], [e.bx, e.by]];
          for (const [px, py] of pts) {
            if (py + b.r > FL) resolve(b, null, px, FL, 0, -1, py + b.r - FL, REST_WALL);
            if (px - b.r < 0) resolve(b, null, 0, py, 1, 0, b.r - px, REST_WALL);
            if (px + b.r > W) resolve(b, null, W, py, -1, 0, px + b.r - W, REST_WALL);
          }
        }
      }
    };

    // ── per-frame: advance tweens, step physics, sync the DOM ──
    const applyTweens = (rs: RowState, now: number) => {
      if (rs.hTween) {
        rs.curHeight = tval(rs.hTween, now);
        // Keep row layout fixed while colour, artwork, and tags animate.
        if (tdone(rs.hTween, now)) rs.hTween = null;
      }
      if (rs.cTween) {
        const t = power4Out(clamp01((now - rs.cTween.start) / rs.cTween.dur));
        const c = rs.cTween.from.map((v, k) => v + (rs.cTween!.to[k] - v) * t) as [number, number, number];
        rs.curColor = c;
        rs.h1.style.color = `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
        if (now - rs.cTween.start >= rs.cTween.dur) rs.cTween = null;
      }
      for (let j = 0; j < rs.iTween.length; j++) {
        const tw = rs.iTween[j];
        if (!tw) continue;
        rs.curShift[j] = tval(tw, now);
        rs.imgs[j].style.setProperty("--sh", String(rs.curShift[j]));
        if (tdone(tw, now)) rs.iTween[j] = null;
      }
    };

    const syncTags = (rs: RowState, now: number) => {
      if (!rs.bodies.length) return;
      for (const b of rs.bodies) {
        b.el.style.transform = `translate(${b.x - b.bw / 2}px, ${b.y - b.bh / 2}px) rotate(${b.a}rad)`;
        let op: number;
        if (rs.fadeOutAt) op = 1 - clamp01((now - rs.fadeOutAt) / 250);
        else op = clamp01((now - b.fadeStart) / 300);
        b.el.style.opacity = String(op);
      }
      if (rs.fadeOutAt && now - rs.fadeOutAt >= 250) cleanupTags(rs);
    };

    let raf = 0;
    let prev = performance.now();
    let acc = 0,heroVisible=false;
    const canRun=()=>heroVisible&&!document.hidden&&!document.documentElement.classList.contains('club-is-loading');
    function wake(){if(!raf&&canRun()){prev=performance.now();raf=requestAnimationFrame(loop)}}
    const loop = (now: number) => {
      raf=0;if(!canRun())return;
      let frame = (now - prev) / 1000;
      prev = now;
      if (frame > 0.05) frame = 0.05;
      acc += frame;
      let steps = 0;
      while (acc >= FIXED_DT && steps < 8) {
        for (const rs of rows) stepRow(rs, FIXED_DT);
        acc -= FIXED_DT;
        steps++;
      }
      if (acc > FIXED_DT) acc = 0;
      for (const rs of rows) { applyTweens(rs, now); syncTags(rs, now); }
      if(rows.some(rs=>rs.hTween||rs.cTween||rs.iTween.some(Boolean)||rs.bodies.length))raf=requestAnimationFrame(loop);
    };
    const intersection=new IntersectionObserver(([entry])=>{heroVisible=entry.isIntersecting;root.classList.toggle('hero-in-view',heroVisible);if(heroVisible)wake();else{cancelAnimationFrame(raf);raf=0}});
    intersection.observe(root);
    const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else wake()};
    document.addEventListener('visibilitychange',onVisibility);window.addEventListener('club:loaded',wake);

    return () => {
      cancelAnimationFrame(raf);intersection.disconnect();root.classList.remove('hero-in-view');document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('club:loaded',wake);
      cardCancelled = true;
      if (cardTimer) clearTimeout(cardTimer);
      listeners.forEach((off) => off());
      rows.forEach((rs) => {
        if (rs.dropTimer) clearTimeout(rs.dropTimer);
        cleanupTags(rs);
      });
    };
  }, [reduced]);

  return (
    <div className="kxr-root" ref={rootRef}>
      <style>{css}</style>

      <header className="club-header">
        <a className="brand" href="#/" aria-label="Coding Club home" onPointerEnter={()=>playCue(3)}><img src="/assets/club-logo.png" alt="Coding Club" /><svg className="brand-sequence" viewBox="0 0 907 247" aria-hidden="true" focusable="false"><g className="logo-sequence-c"><image href="/assets/club-logo.png" x="0" y="0" width="907" height="247" style={{clipPath:'polygon(12.128% 16.194%,29.217% 16.194%,29.217% 86.235%,12.128% 86.235%)'}}/></g><g className="logo-sequence-left"><image href="/assets/club-logo.png" x="0" y="0" width="907" height="247" style={{clipPath:'polygon(0 0,15.987% 0,15.987% 16.194%,5.292% 49.798%,15.987% 83.806%,15.987% 100%,0 100%)'}}/></g><g className="logo-sequence-right"><image href="/assets/club-logo.png" x="0" y="0" width="907" height="247" style={{clipPath:'polygon(27.563% 0,43.881% 0,43.881% 100%,27.563% 100%,27.563% 84.211%,38.589% 49.798%,27.563% 16.194%)'}}/></g></svg></a>
        
        <div className="header-actions"><button className="sound-button" aria-label={soundEnabled?"Turn interaction sounds off":"Turn interaction sounds on"} aria-pressed={soundEnabled} onClick={toggleSound}><span className={`sound-bars ${soundEnabled?"is-on":""}`} aria-hidden="true"><i/><i/><i/><i/></span><span>SOUND {soundEnabled?"ON":"OFF"}</span></button>
        <button ref={menuButton} className="menu-button" aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="club-menu" onClick={() => {playCue(0);setMenuOpen(true)}}><span>MENU</span><i><b></b><b></b></i></button></div>
      </header>
      <div id="home" className="hero-content">
        <HeroField/>
        <div className="hero-atmosphere" aria-hidden="true"><span className="ambient-orbit orbit-one"></span><span className="ambient-orbit orbit-two"></span><span className="code-corner corner-left">&#123;</span><span className="code-corner corner-right">&#125;</span></div>
        
        <section className="kxr-services" aria-label="Create. Code. Conquer.">
          <h1 className="sr-only">Create. Code. Conquer.</h1>
          <div className="preview-stage icon-preview" style={{"--active-row":activePreview ?? 1} as CSSProperties} aria-label={activePreview === null ? "Word image preview" : `${ROWS[activePreview].name} artwork`} aria-hidden={activePreview === null}>
            {ICON_SETS.map((icons,i)=><div className={`icon-cloud ${activePreview===i?"is-active":""}`} key={i} aria-hidden={activePreview!==i}>{icons.map((icon,j)=><div className="icon-tile" data-icon={icon.id} key={icon.id} style={{"--tile":j} as CSSProperties}><img src={`/assets/icons/${icon.id}.svg`} alt={icon.label}/></div>)}</div>)}
          </div>
          {ROWS.map((row,i) => (
            <div className="kxr-service" key={row.name} onPointerEnter={(e)=>{if(e.pointerType === "mouse" || e.pointerType === "pen") {setActivePreview(i);playCue(i)}}} onPointerLeave={()=>setActivePreview(null)} role="button" tabIndex={0} aria-label={`Explore ${row.name}`}>
              
              <div className="kxr-name"><h2>{row.name}</h2></div>
              
              
            </div>
          ))}
        </section>

        <div className="discipline-strip" aria-label="Coding club interests"><div className="marquee-track">{[0,1].map(copy=><div className="marquee-group" key={copy} aria-hidden={copy===1}>{CATEGORIES.map(category=><span className="marquee-item" key={category}>{category}<b aria-hidden="true">✳</b></span>)}</div>)}</div></div>
      </div>
      <footer className="hero-footer"><span>THINK BIG. START WITH ONE LINE.</span><span className="footer-code">&lt; / &gt; &nbsp; BUILT ON CURIOSITY</span></footer>
      <dialog id="club-menu" className="club-stack-menu" data-lenis-prevent ref={menuRef} aria-label="Explore Coding Club" onCancel={()=>setMenuOpen(false)} onClose={()=>{setMenuOpen(false);menuButton.current?.focus()}}>
        {menuOpen&&<ClubMenu onClose={()=>setMenuOpen(false)} onNavigate={path=>{setMenuOpen(false);onNavigate?.(path)}}/>}
      </dialog>
    </div>
  );
}
