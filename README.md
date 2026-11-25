# ECLIPSE

Browser-based stylized 3D adventure with 2D gameplay and an angled orthographic camera.

## Character creator — first prototype

Open `index.html` in a modern WebGL-capable browser with internet access (Three.js is pinned to 0.160.1 on jsDelivr). For local development, run `python3 -m http.server 8000` in the repository and open http://localhost:8000. No build tooling required.

For GitHub Pages: Settings → Pages → Deploy from a branch → `main` → `/ (root)` → Save.

### Features

- Male and female Concordant frames; 12 hairstyles; three facial silhouettes; four marking options.
- Fixed obsidian skin, ivory hair and black-and-white Stage I traveler garments.
- Orthographic 3D preview, drag rotation, zoom, face view, and hood preview.
- Name entry, randomization, reset, and local browser persistence.

### Integration

Character data is stored under `eclipse.character.v1` in localStorage. Confirmation dispatches the `eclipse:character-confirmed` event with versioned character data, the starting kit `concordant-traveler`, and `garmentStage: 1`. The hood preview is not a gameplay preference; confirmation uses Down and the future world system should control hood state automatically.

### Scope

The model is a procedural low-poly placeholder, not final production artwork or a rigged character. The playable prologue, animation, equipment inventory, scene transitions, and Eclipse garment evolution are not implemented yet. The external CDN and WebGL are required for the preview; customization remains usable if preview initialization fails.
