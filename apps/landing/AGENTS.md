<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Icons and link cards

- `src/app/icon.tsx` (SVG) is the favicon; `favicon.ico` (16/32/48) and `icon1.png` (96) next to it are the same
  mark as files, transparent, for clients that skip SVG icons. Regenerate from the repo root with Pillow:
  `python3 -c "from PIL import Image;m=Image.open('docs/brand/final/klokka-mark-heavy.png').convert('RGBA');m=m.crop(m.getbbox());exec('def g(n,f,bg=(0,0,0,0)):\n k=n*f/max(m.size);a=m.getchannel(\'A\').resize((round(m.width*k),round(m.height*k)),Image.LANCZOS);p=Image.new(\'RGBA\',a.size,\'#FF006E\');p.putalpha(a);o=Image.new(\'RGBA\',(n,n),bg);o.alpha_composite(p,((n-a.width)//2,(n-a.height)//2));return o');g(96,.94).save('apps/landing/src/app/icon1.png');i=[g(n,.94) for n in (48,32,16)];i[0].save('apps/landing/src/app/favicon.ico',sizes=[(48,48),(32,32),(16,16)],append_images=i[1:])"`
- Link cards are `/og/<id>-<locale>.jpg`, drawn at build time by `pageCard` in `src/lib/brand-image.tsx` over the
  artwork in `src/assets/og/` (1200 px wide, JPEG q82, resized from `docs/brand/social/backgrounds/`).
