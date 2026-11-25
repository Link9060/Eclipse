# Stage I — Concordant Traveler

Visual target: the supplied hooded traveler concept, not the v0.1 primitive avatar. Preserve layered ivory/charcoal cloth, asymmetric shoulder mantle, hanging split panels, side pouch, loose trousers, fitted wraps and boots, pale sculpted hair, obsidian skin, and modest geometric woven trim. No energized shards or evolved armor at this stage.

## First complete default set

Export GLB files at these exact relative paths:

- body/male/slim.glb
- head/male/angular.glb
- hair/sweep.glb
- garments/male/slim/hood-up.glb
- garments/male/slim/mantle-wrapped.glb
- garments/male/slim/tunic-layered.glb
- garments/male/slim/trousers.glb
- garments/male/slim/belt-pouch.glb
- garments/male/slim/wraps-standard.glb
- garments/male/slim/boots-traveler.glb
- markings/male/angular-cheeks.glb

Also export hood-down for the gameplay start. See state.js resolveSlots for other variants; do not rename the path segments. Shaved hair and no markings deliberately require no respective meshes. 

## Modeling and export

- glTF 2.0 binary (.glb), meters, Y up, facing +Z, ground at Y=0. Author all slots in the same coordinate system, origin, neutral rest pose and scale; do not independently center parts.
- Base medium height convention: approximately 1.8 m. Short/tall are applied uniformly by the creator.
- Use an articulated, natural traveler silhouette and authored folds, triangulated angular surfaces, readable face planes, sculpted locks and a cloth hood with an open face.
- Body should include exposed hands/neck only where appropriate. Clothing slots must cover the character without intersecting excessively. Hair should fit the hood; test each frame and hood selection.
- Use matching rig bone names, hierarchy and bind pose in every skinned export. Current assembler clones each slot rig independently for static preview; synchronized animation or skeleton rebinding is a later integration step.
- Keep GLBs self-contained with embedded textures. Use standard glTF materials and uncompressed geometry initially; no external decoder dependencies.
- Material role names: skin, hair, primary, secondary, accent, metal, eyes. Names may have Blender numeric suffixes. Unknown material names are preserved.
- Name trim meshes pattern_trim* and additional border meshes pattern_border* to enable the cloak pattern controls. Markings use independent face-fitting meshes.
- Use muted cloth textures and low metallic values, not glossy armor. Avoid excessive body/garment geometry; inspect the silhouette from front, sides and back.
- Validate each default GLB in a glTF viewer, then test all slots together in Eclipse. Add additional body and garment variants after the default traveler is visually approved.
