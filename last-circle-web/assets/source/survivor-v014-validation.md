# Survivor v0.14 handoff

Final model: `survivor-v014.glb`, 4,582,220 bytes, SHA-256 `3e9628fbb2fc7c0f881ae9785d229723057baac170f319829d23fabeeb848b1f`.

One skin, 20 stable deform bones, 20 clips and four material primitives. All transforms use meters, Y up, +Z forward. `survivor` is the identity root; `weapon_socket` remains parented to the right (+X) `hand_r`. Its receiver axes point +Z/+Y in idle, aim, crouch and prone. Attach the existing gun bank at local position zero / identity rotation.

The outer garment is one welded closed manifold: 20,306 vertices, 40,608 triangles, one connected component, zero boundary edges and zero non-manifold edges. The combined character is 74,066 triangles. In the editable blend, vertex group `_continuous_garment_source` identifies the garment surface inside the consolidated skin. Boots, gloves, eyes and sewn equipment are material/loose parts of the shared skin.

The authored head reaches 1.80 m; relaxed idle standing reaches about 1.78 m after lowering the hips. The head is .265 m high and .226 m wide (about 6.8 heads for the 1.80 m design). Outer shoulder width at the shoulder joint plane is .611 m; shoulder bone centers are .436 m apart. The relaxed idle knee flexes about22–25°; walk up to72°, run117°, crouch130°, jump112°. Jump has zero root translation and folds the legs rather than adding physical jump height.

Knee mixed-weight vertices are874 left /888 right. Elbow mixed-weight vertices are755 left /765 right. Each count requires both parent and child bone influences to exceed .02; recorded ranges span approximately .02–.98. Skinning uses up to four normalized deform influences. Source IK stance target error is at most .0051 m walking and .0060 m running; directional/crouch stance targets are within floating-point tolerance.

Existing11 clip names remain. Additional directional clips are `walk_left/right/backward`, `run_left/right/backward`, `crouch_walk_left/right/backward`. Directional variants share normalized gait phase. Walk cycle is .9 s, run .7 s, crouch1.2 s; gameplay can blend directional actions and adjust phase/playback. All locomotion has zero forward root motion. `jump`, `throw`, `reload` are one-shot actions; locomotion/idle actions loop.

`survivor-v014-validate.mjs` loads the actual GLB with Three GLTFLoader, clones the skin with SkeletonUtils, runs all20 clips through AnimationMixer, measures deformed bounds/knee motion and checks socket axes and root motion. Its Node bitmap shim is limited to geometry tests; all three embedded2048² WebP maps were additionally decoded with Pillow and rendered in Blender. Results are in `survivor-v014-validation.json`, anatomical/IK measurements in `survivor-v014-bounds.json`, topology details in `survivor-v014-topology-validation.json`.

Reviewed images are `survivor-v014-front.png`, `-side.png`, `-run.png`, `-crouch.png`, `-jump.png`, `-prone.png`. The sleeve ripple deformation was removed; shoulder caps, neck transition and eye whites were reduced after review.

Apply `survivor-v014-manifest-patch.json` in the owning integration workflow; its asset path names the eventual content hash file and its `sourcePath` points to the file supplied here. No production manifest, previous bank or application source was edited. The shared embedded map names remain `surface-atlas-basecolor`, `surface-atlas-normal`, `surface-atlas-orm`; replacement maps need `flipY=false`, sRGB only for base color, linear normal/ORM. ORM is R=AO/G=roughness/B=metalness.
