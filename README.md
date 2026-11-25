# ECLIPSE

Browser-based stylized 3D adventure with 2D gameplay and an angled camera.

## Character creator v0.2 — GLB foundation

Run `python3 -m http.server 8000` and open http://localhost:8000, or visit https://link9060.github.io/Eclipse/. GitHub Actions deploys pushes to main when GitHub Pages uses the Actions source.

The character creator supports body frame, height, build, facial silhouette, skin, markings, eye light, 12 hairstyles, hair color, hood, cloak pattern, mantle, tunic, belt, wraps, boots and four material colors. State is versioned and persisted under `eclipse.character.v2`; v1 choices migrate automatically. Confirmation emits `eclipse:character-confirmed` with the Stage I kit and gameplay hood down.

## Art status

Production character meshes have not been created. The procedural block character has been removed. Until all required meshes for a selection exist, the creator displays missing slot names rather than an inaccurate character. Controls save the selected configuration even without meshes.

## Architecture

- `src/character/state.js`: schema, validation, asset paths and local saves.
- `src/character/CharacterAssembler.js`: GLTFLoader, independent slot instances, material customization, race-safe loading.
- `src/creator.js`: controls, renderer, camera, confirmation event.
- `assets/characters/ASSET_SPEC.md`: exact conventions for art production.

The creator is a static rest-pose preview foundation. Shared animation playback, attachment fitting, collision, final artwork and the playable prologue are future work.

Three.js is pinned to 0.160.1 and loaded from jsDelivr. Internet access and WebGL are needed for 3D rendering.
