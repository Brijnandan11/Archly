# Design references and assets

Preloader design reference: https://www.befreaky.co/ . Split-square rolling numerals, pointer sticker trail, and dot-collapse motion reimplemented in local CSS/JavaScript.

At the user’s explicit request, six decorative preloader sticker SVGs are retained from the reference site. These are decorative trail assets, not a list of Coding Club clients or partners. Original sources:

- https://david-denni-portfolio.cdn.prismic.io/david-denni-portfolio/Z64MjpbqstJ9-lW__BG.svg
- https://david-denni-portfolio.cdn.prismic.io/david-denni-portfolio/Z64MvZbqstJ9-lXV_MarcoMartini.svg
- https://david-denni-portfolio.cdn.prismic.io/david-denni-portfolio/Z64M4ZbqstJ9-lXl_Miro.svg
- https://david-denni-portfolio.cdn.prismic.io/david-denni-portfolio/Z64NJJbqstJ9-lYE_WearOS.svg
- https://david-denni-portfolio.cdn.prismic.io/david-denni-portfolio/Z64MzZbqstJ9-lXc_Microsoft.svg
- https://david-denni-portfolio.cdn.prismic.io/david-denni-portfolio/Z64Mc5bqstJ9-lWz_Amazon.svg
- https://david-denni-portfolio.cdn.prismic.io/david-denni-portfolio/Z7WrKJ7c43Q3f9X3_Peer.svg
- https://david-denni-portfolio.cdn.prismic.io/david-denni-portfolio/Z64NApbqstJ9-lX1_SkiDubai.svg
- https://david-denni-portfolio.cdn.prismic.io/david-denni-portfolio/Z65WepbqstJ9-mJY_TreFontane.svg
- https://david-denni-portfolio.cdn.prismic.io/david-denni-portfolio/Z64NNZbqstJ9-lYM_Zonda.svg
- https://david-denni-portfolio.cdn.prismic.io/david-denni-portfolio/Z65V8ZbqstJ9-mI-_LFC.svg
- https://david-denni-portfolio.cdn.prismic.io/david-denni-portfolio/Z64MnJbqstJ9-lXG_DAC.svg

Frontend animation libraries (served locally): GSAP 3.13.0 and ScrollTrigger from https://gsap.com/ ; Lenis 1.3.26 from https://github.com/darkroomengineering/lenis . Distribution headers are retained in public/assets/vendor.

Typography: Google Fonts (Manrope, DM Sans, Barlow Condensed), with system fallbacks.

Student team grid: adapted from Ashutoshx7 / VengeanceUI, TeamRevealGrid, MIT. Source: https://raw.githubusercontent.com/Ashutoshx7/VengeanceUI/main/public/r/team-reveal-grid.json . Full license retained in public/assets/licenses/vengeance-ui-MIT.txt. Tailwind utility styles translated to local CSS for the existing React/esbuild frontend.

Student team portraits: locally served sample Unsplash portraits, supplied solely as illustrative demo profiles. Fictional names do not identify the people pictured. Image source identifiers: photo-1494790108377-be9c29b29330, photo-1500648767791-00dcc994a43e, photo-1506794778202-cad84cf45f1d, photo-1507003211169-0a1dd7228f2d, photo-1517841905240-472988babdf9, photo-1519085360753-af0119f7cbe7, photo-1519345182560-3f2917c472ef, photo-1524250502761-1ac6f2e30d43, photo-1524504388940-b1c1722653e1, photo-1531123897727-8f129e1688ce, photo-1534528741775-53994a69daeb, photo-1539571696357-5a69c17a67c6.

Hamburger menu: adapted from the GSAP SVG stack interactor code supplied by the user. Food-specific imagery replaced by local illustrative Unsplash technology and collaboration photography: photo-1519389950473-47ba0277781c, photo-1516321318423-f06f85e504b3, photo-1515879218367-8466d910aaa4, photo-1523240795612-9a054b0db644, photo-1522071820081-009f0129c71c, photo-1521737711867-e3b97375f902. These pictures illustrate themes and do not depict verified club members or events.

Current hamburger interaction: adapted from the RevealImageList source supplied by the user, replacing the previous SVG mask preview with two-image scale and fan-out reveals. Reuses the local illustrative photography credited above.

Official faculty content and portraits: Rajkiya Engineering College, Azamgarh, IT faculty directory, https://gecazamgarh.ac.in/information-technology-faculty/ (retrieved 18 October 2026). Faculty source links and direct official CV links are displayed in the frontend. Image source paths on that origin: /wp-content/uploads/2024/04/Faculty31304_15062018124723.jpg; /wp-content/uploads/elementor/thumbs/ashok-1-min-rli323jmafumt0tr8166ar9r9jbn9vbkswpwpuhdg8.jpg; /wp-content/uploads/2024/07/Mahesh-min.jpeg; /wp-content/uploads/2025/05/Shweta.png; /wp-content/uploads/2025/10/tej.jpg; /wp-content/uploads/2025/10/deep.jpg. Used at the user’s request for these faculty profiles.
