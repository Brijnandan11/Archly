# Coding Club Website — Full Frontend Source

This contains the current website, including all source code, local assets, and the latest performance improvements.

## Run in VS Code

Install Node.js 22 or newer. Extract the ZIP, open the `coding-club-website` folder in VS Code, and open a terminal there.

```bash
npm install
npm run build
npm start
```

Open http://localhost:3000. Stop the server with Ctrl+C.

Run the build command again after editing source files. Opening index.html directly will not work because assets use URLs starting with `/assets/`. The build command creates the `dist` folder locally.

## Files

- `src/`: complete React/TypeScript components, CSS, routing, data, and animations.
- `public/`: local logos, portraits, student and faculty images, preloader stickers, fonts, and animation libraries.
- `dist/`: generated locally by `npm run build`; omitted from this ZIP to avoid duplicating assets.
- `build.cjs`: bundles the website with esbuild.
- `serve.cjs`: local web server using Node.js only.
- `package.json` and `package-lock.json`: dependency versions and commands.
- `THIRD_PARTY.md` and asset license files: credits and licenses.
- `DESIGN.md`: design notes from development; some earlier design descriptions may differ from the current source.

## Current website

The homepage sequence is Hero → Events → Our Aim → Faculty → Student Team → Credits. Events use the earlier filterable card grid with separate Upcoming and Past groups. Event details, registration forms, My Registrations, the contact form, and leader/admin demonstration portals use hash routes. Faculty use six circular portraits; the team has 14 demo members; creator names reveal separate sticker portraits.

The intro lasts about 1.5 seconds, sticker art loads on hover, offscreen profile images load lazily, and the animated hero uses a lighter canvas workload.

## Frontend demonstration

This is frontend code only. Registrations, contact messages, admin edits, leader/team allocation, and payment simulations use browser localStorage under `cc-frontend-v1`. No backend, real payment gateway, secure login, or email delivery is connected. Data entered on the hosted website remains in that browser and is not included in this export.

Student profiles and events contain demo information. Faculty details are a documented snapshot from the college directory. Use the Admin Demo to edit club details and sample events. Remove the `cc-frontend-v1` localStorage entry in browser developer tools to reset local changes.

## Hosting

Run `npm install` and `npm run build`, then upload the contents of `dist` to a static host. Host it at the root of its domain because assets use absolute root URLs. No environment variables are required.
