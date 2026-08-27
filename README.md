# Bro vs Bro — overlay + panel

Live Twitch-overlay og kontrolpanel til "Bro vs Bro" (Aggo vs Marcelo). Panel og overlay deler state i realtid over websocket.

## Lokalt

```
npm install
PANEL_KEY=vælg-en-kode node server.js
```

- Overlay: `http://localhost:3000/overlay` (eller `?view=badges` / `?view=fightcard`)
- Panel: `http://localhost:3000/panel`

## Deploy til Render

1. Push denne mappe til et GitHub-repo (privat, hvis du ikke vil have det offentligt).
2. Render.com → New → Web Service → forbind repoet.
3. Render læser `render.yaml` automatisk (Node, `npm install`, `npm start`).
4. Under Environment: sæt `PANEL_KEY` til en hemmelig kode — det er adgangskoden til `/panel`.
5. Deploy. Render giver dig en URL som `https://bro-vs-bro-overlay.onrender.com`.

**Vigtigt om gratis Render-plan:** tjenesten går i dvale efter 15 minutters inaktivitet og bruger ca. 30-60 sek. om at vågne ved næste besøg. Åbn overlay-URL'en et par minutter før I går live, så den er varmet op. Vil I undgå det helt, kræver det en betalt Render-plan.

## Brug i OBS / Pogly

I skal ikke nødvendigvis bruge Pogly til denne del — en almindelig **Browser Source** i OBS peget direkte på jeres Render-URL er den enkleste og mest robuste løsning:

- `https://JERES-APP.onrender.com/overlay?view=scoreboard` — fast bjælke øverst under hele dysten
- `https://JERES-APP.onrender.com/overlay?view=badges` — facecam-badges til hver streamer
- `https://JERES-APP.onrender.com/overlay?view=fightcard` — intro/transition-skærm

Tilføj dem som separate Browser Sources (bredde/højde efter behov, baggrunden er transparent). Hvis I hellere vil have det ind i et eksisterende Pogly-canvas, understøtter Pogly's "Widget"-element rå HTML/CSS/JS — men det er ikke testet med denne opsætning, og en almindelig Browser Source er garanteret at virke.

## Kontrolpanel

Åbn `/panel`, indtast `PANEL_KEY`. Herfra kan I:

- Give/trække point til Marcelo og Aggo
- Sætte den aktive dyst (frit tekstfelt eller preset-knapper)
- Tilføje/fjerne dyster i køen og trykke "Start næste dyst i køen"
- Se en log over seneste hændelser
- Nulstille point eller alt

Alle ændringer sendes med det samme til overlayet.
