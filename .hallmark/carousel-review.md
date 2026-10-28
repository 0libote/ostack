# Carousel control refinement

Hallmark component scope, Console theme retained. No new imagery or material slots.

Changed: a next-card preview, a slim interactive position rail, and icon-only
playback and arrow controls below the cards. Removed the visible numeric counter;
its live status and skill names remain available to assistive technology.

Preflight: `site/tokens.css` carries the palette and local fonts, `package.json`
carries the Bun build, and `site/index.html` supplies the 13 real skills.

Scoped sloplint with the production URL: 0 FAIL, 0 REFLEX, 0 WARN.
Finish review: in-thread, ship. Recaptured the URL alone after the first batch's
source-file shots showed the no-JavaScript fallback. The live desktop and mobile
captures show the new partial next card and integrated rail. The Console surfaces,
readable text, instant focus outlines, and 44px controls are preserved.

The former toolbar made the exact numeric count more prominent. The new component
puts attention on the skills, while the range control and screen-reader status
retain position and direct navigation. No new photos, metrics, or copy claims.
