# Coding Club frontend design

Palette: near-black #0D0E12; dark surfaces #15161B and #1C1D24; text #F2F0ED; coral #FF6559; lime #C8E98C; lavender #BDABED. All content pages and demos use dark surfaces. The established preloader retains its contrasting paper background.

Typography: Manrope for editorial headings, DM Sans for body, Barlow Condensed for event posters and the established hero.

Motion: GSAP 3.13 ScrollTrigger handles section reveals, staggered manifesto text, scrubbing decorative forms, and scrubbed, angled full-screen panel entrances in Our Aim. Our Aim uses text and club branding inside full-screen panels adapted from the supplied reference. Main event and profile cards use compact grids, staggered scroll entrances, pointer lighting, and subtle tilt. Dynamic filter results receive new entrance animations. Lenis 1.3.26 provides wheel smoothing, synchronized with the GSAP ticker. Microinteractions include restrained card tilt, poster-symbol rotation, hover arrows, animated team allocation, and menu transitions. Reduced-motion preferences disable motion and smooth scrolling.

Journey: Hero → Events → Our Aim → Faculty → Student Team → Contact, with hero menu, footer navigation, and next-section links. A fine-pointer cursor follows the mouse and reacts to cards and links; touch and reduced-motion users retain normal controls.

Views: home; Events with combined upcoming and past filters; Event Details and recaps; Registration with free and simulated paid checkout; Faculty circular roster (two top, four below; six placeholder profiles); Student equal-sized grid and role filters; Contact; My Registrations; Leader demo; Admin demo.

This version is frontend only. Data lives in browser localStorage. Login controls, payment success/failure states, receipts, contact submission and leader IDs are explicitly labelled demos. No backend, shared database, authentication service, payment gateway or email delivery is connected. All sample event and profile content is labelled.


Reference update: Our Aim follows the user-supplied full-screen card scene: coral opening, then black, cobalt, warm paper, and lime panels. GSAP scrubs angled, translated, scaled panels over the previous one within a native sticky stage. Club-specific vision, mission, objectives, and community replace the supplied agency copy. Reduced-motion and script-free layouts present every panel sequentially without overlap.

Chapter contrast: Events cobalt #343EE8; Faculty pale blue #C9D8F0; Student Team lime #D8EE9A; Contact lavender #C4B2ED. Their content retains tinted dark backgrounds and compact cards. The hero and private demo portals retain dark styling.


Unified public design: the separate section navbar and subpage navbar are removed. The hero hamburger remains. Aim’s sticky stage now fills the viewport at top:0 with no navigation offset. Events, Faculty, Student Team, and Contact use condensed uppercase display titles with cropped GSAP line reveals, scrolling type strips, flat color panels, squared compact cards, and red accents. The footer uses the same display type. Student profiles remain a flat grid.


Events update: adapt the Projects in Pictures section of https://studiors.be/ into Upcoming and Past event galleries. Use cream and near-black scenes, condensed oversized titles, original code-window event posters, varied media proportions and a stepped diagonal rail. GSAP animates horizontal travel, depth, opacity and featured counts within native sticky scenes. Mobile keeps swipe controls and reduced-motion keeps a static grid. Do not include the reference studio’s imagery or project copy. Events precede Our Aim; footer and section links follow that order.


Hero refinement: retain the original centered red Create / Code / Conquer typography, logo, menu, hover behavior, and layout. Remove the decorative code window. Add an original full-width generative red wireframe signal surface behind the type, with lower contrast in the center, slow travel and pointer-driven deformation. It uses a capped-resolution Canvas at about 30fps, pauses offscreen and in background tabs, and becomes static with reduced motion. No new logos, copy, or interface widgets.


Interaction sound starts enabled by default, unlocking on the first pointer or keyboard gesture according to browser audio policy. Cue peak gain is 0.04 (previously 0.028); the visible Sound control still mutes and resumes audio. Context and gesture listeners are cleaned up when the hero unmounts.


Faculty redesign: circular, uncropped name/role profiles replace rectangular cards and hierarchy connectors. Two larger leadership portraits are centered above four mentors, with no extra profile copy. Names sit below each circle in the existing condensed uppercase type; roles use warm coral and department is muted. Outer outline rings scrub subtly on scroll. Cards reveal with staggered entrances and retain restrained pointer tilt; portraits soften from grayscale into color on hover. On narrow screens the lower four wrap into two columns, while the top two remain together. Reduced-motion users receive a static layout.


Performance revision: keep the visual system while tightening Lenis response and scroll scrub lag. Reduce Aim travel to 400svh (380svh on smaller screens) and gallery traversal to a shorter distance. Preloader retains rolling digits and contrasting paper but exits after the app is ready with a 5000ms minimum and 280ms exit, independent of fonts. A 6500ms watchdog and 7000ms independent HTML fallback release inert, aria-hidden, and overflow locks. Motion assets load concurrently where independent. Route cleanup aborts pending setup, stops one Lenis/GSAP clock, and releases animation resources. Cursor and hero physics request frames only when active; hidden/offscreen and preloader animation work is paused. Pointer tilt is throttled to one update per frame with tween overwrite. DOM changes under the hero no longer trigger global ScrollTrigger refreshes.


Preloader-only follow-up: restore the five-second wait while keeping the bounded exit and scroll unlock. Preload/decode hover stickers, reuse their ready elements, skip failed image loads, remember the first hover while loading, and reset the throttle on pointer leave/re-entry. Other scrolling and animations retain their performance changes.

## Typography and wayfinding refinement
Manrope for reading and interface text, Barlow Condensed for display titles. Body 15–17 px; supporting details 12–14 px; section labels 10–11 px. Increased practical event information, faculty roles, form labels, footer links and touch targets. Display headings and hero composition retained. A compact Explore disclosure appears after the hero, follows the active chapter, and links all sections in scroll order; Escape and outside click dismiss it. No continuous scroll loop.

## Event contrast
Warm white event titles on dark caption panels; coral date/time; quiet category chips; lime fees; solid red registration actions. Upcoming display subhead uses deep red on cream; Past uses lime on ink. Event detail essentials use a cream surface with ink values, distinct status badges and a solid registration action. Animation and flat text rendering remain unchanged.
