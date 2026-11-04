# LAST CIRCLE original art — revision 0.14.0

All assets are original project-authored meshes, textures and animations. No downloaded game models or photographs are used. The runtime mapping is `art-manifest.json`; files in `art/` are content addressed. Retained 0.13 weapons, hands, surface textures and farming props are documented below.

## 0.14 source and rebuild

- `python scripts/create-survivor-v014.py` builds `source/survivor-v014.blend`, the high-detail GLB, pose previews, topology/weight/pose validation and its manifest patch. Blender 4.3+, Pillow and numpy are required.
- `python scripts/create-survivor-lod.py` opens that approved blend and exports the separately decimated skinned model for mobile/AI. High: 74,066 triangles; low: 26,663 triangles. Both retain all 20 clips and the same bone/socket contract.
- `python scripts/create-trees-v014.py` builds five species with three independently seeded branch/crown variants each, shared leaf atlas, birch bark maps, editable blend, separate species GLBs, transparent far images and bounds/manifest metadata. No exposed root meshes are generated; trunk bases extend 0.1 m below the origin.
- `python scripts/package-design-assets.py assets/source/survivor-v014-manifest-patch.json assets/source/survivor-v014-lod-manifest-patch.json assets/source/trees-v014-manifest-patch.json` merges the patches. It externalizes matching shared textures and repacks geometry buffers before hashing the runtime GLBs. Source GLBs remain self-contained and editable.

The outer garment has one connected manifold component, smooth weights across elbows/knees, 20 bones and a 0.265 m head (~6.8 heads at 1.8 m design height). Relaxed idle height is 1.7824 m. Forward/backward/left/right clips exist for walk, run and crouch walk; idle, aim, prone idle/crawl, jump, throw and reload complete the 20 clips. A directional blend selects the feet from replicated velocity. Runtime two-bone leg IK adjusts planted feet to support heights; arm IK lowers the ready pose while retaining hand orientation. Jump clips bend/compress the body without adding a second world/root ascent. Translate the player from simulation state.

`survivor` and `survivor_lod` use `SurvivorRig`, stable bone names listed below and `weapon_socket` under `hand_r`, Y up / +Z forward. Use each bank's own animation clips and SkeletonUtils.clone. Material primitives are clothing, hair and small face details, not detached capsule body segments.

Tree roots are `tree_<oak|birch|pine|maple|metasequoia>_<0|1|2>`. Each manifest entry supplies physical `trunkDiameter`, measured bounds and its impostor. Scale height and trunk width separately. Bark and alpha-tested leaf primitives remain separate. Preserve vertex colors and the leaf-specific alpha atlas; do not replace every 2048px texture with the opaque surface atlas. The shader used for leaf wind is also applied to the alpha-tested shadow depth pass.

Tree placement is authored by `src/tree-layout.js`. `scripts/bake-tree-layout.mjs` runs before bundling, stores exact Float64 coordinates in `src/generated/tree-layout.js`, and records source hashes. Runtime decodes those coordinates instead of rescanning the entire map at startup. The regression test compares every field against the generator.

## Retained 0.13 assets and contracts

All meshes, textures and animations are original deterministic project assets. There are no downloaded models, stock photographs, account requirements or runtime asset services. Rebuild with `python scripts/create-art-assets.py` (Blender 4.3+, Python Pillow/numpy). The editable source is `source/last-circle-original-art.blend`; texture sources and provenance are alongside it. Runtime files live in `art/`, named by SHA-256. `art-manifest.json` is the authoritative mapping; every listed size and SHA matches the file bytes.

## Runtime contract

All GLBs use meters, Y up and +Z forward. World props have their origins at ground level; the survivor stands with feet at ground. Firearms and `first_person_arms` use the receiver origin. Model dimensions and local min/max bounds are included in every manifest model. Bounds include the crown/treads/handles rather than just collision geometry. Tree roots can extend slightly below ground.

| Bank asset ID | Root nodes |
| --- | --- |
| `world-kit` | `tree_broadleaf`, `tree_metasequoia`, `boulder`, `hay_stack`, `tractor`, `plow`, `wheelbarrow`, `grain_pallet` |
| `character` | `survivor` (one skin with four material primitives, `SurvivorRig`, weapon socket) |
| `weapons` | `weapon_m416`, `weapon_akm`, `weapon_ump45`, `weapon_kar98k`, `weapon_s12k`, `weapon_aug`, `weapon_vector`, `weapon_awm`, `weapon_mini14`, `weapon_m249`, `weapon_p10`, `weapon_groza`, `weapon_mk14`, `weapon_summit-300`, `first_person_arms` |

Load each GLB once with `GLTFLoader`. Select a specific root with `gltf.scene.getObjectByName(model.node)`. Clone the skinned `survivor` root using `SkeletonUtils.clone`; ordinary `Object3D.clone` is suitable for the static models. Static model geometry is already joined by root/material to keep draw calls small. To instance it, flatten each child primitive with its world matrix relative to that root. A model can contain more than one material, especially the tree bark/foliage pair. Keep the alpha-tested foliage primitive separate from bark.

Embedded texture format is `EXT_texture_webp`, supported by Three.js GLTFLoader in current browsers. Embedded textures are self-contained in each bank, with shared atlas data within the bank. The standalone maps in the manifest support terrain and building surfaces without depending on GLB UV coordinates.

## Survivor and attachment

The survivor is 1.78 m tall including its cap. Bones use stable names:

`root`, `hips`, `spine`, `chest`, `neck`, `head`; `shoulder_l/r`, `upperarm_l/r`, `forearm_l/r`, `hand_l/r`; `thigh_l/r`, `shin_l/r`, `foot_l/r`.

Attach a weapon to the named **`weapon_socket`** node. It is parented to `hand_r`, with receiver-space orientation already corrected. In the neutral gun-hold pose the socket is at `(0.080, 1.395, 0.560)` in survivor space, its local axes match +X right / +Y up / +Z forward, and the weapon model should have zero local translation and identity local rotation. The socket follows the arm's animation. Do not add another bone-axis correction. `hand_r` is also available if a game needs its own attachment transform.

Animation clips are `idle`, `walk`, `run`, `crouch_idle`, `crouch_walk`, `prone_idle`, `prone_crawl`, `jump`, `throw`, `aim`, `reload`. Lower-body movement retains the gun-hold arm pose. Most idle/aim/reload clips last 2 seconds, walk 1 second, run .75 seconds, crouch walk 1.167 seconds, prone crawl 1.333 seconds, jump 1.333 seconds, and throw 1 second. Movement and idle clips loop; play jump, throw and reload once with clamping. Translate the player from simulation state; locomotion clips contain no forward root motion. Jump includes a small vertical body movement. Crossfade clips over about .12 seconds.

`first_person_arms` is static, with modeled sleeves, cuffs, knuckle pads, palms and individual curled fingers. It uses the firearm receiver coordinate frame: right glove on the pistol grip, left glove below the handguard. Parent it alongside the weapon, inheriting existing camera sway and recoil; rotate/translate the whole node during reload. It contains no competing animation tracks or skeleton. Compact pistol/bullpup cases can hide/reposition the left hand as a gameplay choice.

## Firearm bank

Each firearm has a distinct receiver profile, round barrel and black bore, grip/trigger/guard, hardware, stock architecture and magazine. Weapons with scopes have actual tubes, objective/ocular housings, mounts and adjustment turrets. Reflex and holographic sight apertures are open; the game supplies its reticle.

Each `weapon_<id>` contains `mag_<id>`, `muzzle_<id>` and `optic_<id>`. Hide or animate the `mag_<id>` node during reload. Magazine geometry uses the same receiver-space origin as the firearm, so restore its original transform after animations. The muzzle and optic nodes mark effect/aim attachment positions. Root extras and manifest `opticalHeight` preserve existing game values: dot/holo .245 m; scope .18 m; pistol iron .088 m; other iron .13 m. Firearms extend primarily along +Z and their stocks extend -Z.

## PBR surfaces and foliage

Manifest material keys `meadow`, `dirt`, `gravel`, `rock`, `asphalt`, `wood`, `weatheredMetal`, `brick`, `plaster` each provide independent 512×512 base color, normal and roughness maps. Set only base color maps to `SRGBColorSpace`; normal and roughness maps are linear. Set repeat wrapping on both axes. Terrain maps are intended to repeat about every 3 meters; wood and weathered metal about every meter. `weatheredMetal` uses metalness .8. Set material colors to white to preserve authored colors, or tint deliberately for the biome.

`surfaceAtlas` supplies a 2048×2048 base color, tangent normal, roughness-only and packed ORM maps. ORM channels are R=occlusion (1), G=roughness, B=metalness. Its 4×4 tiles are listed in the manifest. Atlas UVs are already embedded in the model meshes.

`foliage` supplies the original RGBA botanical sprig atlas. GLB material is explicitly **MASK**, alpha cutoff .47, double-sided. For custom material replacement in Three.js use `transparent=false`, `alphaTest=.47`, `depthWrite=true`, `side=DoubleSide`; retain the alpha-bearing base color texture. Avoid turning these leaf cards into fully transparent materials. Grass/meadow ground uses an opaque surface map; the tree canopy uses actual folded leaf cards with detailed branching trunks.

## Verification

The generator validates GLB headers, root counts, one survivor skin, eleven named clips, per-file and total size budgets, and all content hashes. CPU preview `source/art-preview.png` shows the original authored world kit and human at their relative physical sizes. The runtime GLBs are the artifacts listed by the manifest, not the authoring preview or `.blend` file.

## Tree impostors

`impostors.tree_broadleaf` and `impostors.tree_metasequoia` reference transparent 256×512 WebP images rendered directly from the respective source models. Matching material keys are available at `materials.tree_broadleaf` and `materials.tree_metasequoia`. Use `planeWidth`, `planeHeight` and `center` from each record to place a camera-facing plane relative to the original model ground origin. Alternatively place its bottom at `-anchor[1] * planeHeight` and top at `(1 - anchor[1]) * planeHeight`. The broadleaf image is intentionally stored in a narrow texture and regains its correct crown proportions on the physical plane dimensions. Use alpha test .40, depth write and double-sided rendering. The images contain baked daylight shading.

For memory deduplication across all three banks, replace textures on material `LC • weathered surface atlas` with the manifest's shared standalone atlas maps. Embedded image names are exactly `surface-atlas-basecolor`, `surface-atlas-normal`, and `surface-atlas-orm`. Set replacements to `flipY=false`, keep base color in sRGB and normal/ORM in linear space, assign ORM to both roughnessMap and metalnessMap, and preserve normalScale .72. The foliage material is `LC • botanical broadleaf cards`; its image name is `foliage-basecolor`. Standalone atlas maps can be downscaled to 1024² for mobile while preserving UVs. This replacement requires no mesh or GLB changes.

## Independent wrist gloves for utility throws and pistols

The separate `hands` bank adds four static root nodes: `hand_right`, `hand_left`, `forearm_right`, `forearm_left`. Each origin is the wrist. Gloves extend along local +Z to .1625 m; +Y is the knuckle side, with individual fingers curled down toward -Y. A glove's full bounds are about .119 m wide, .093 m high and .178 m long including the short cuff. Thumbs are mirrored between hands. The separate sleeve roots extend from the wrist along -Z for .32 m.

For a utility throw, position and rotate `hand_right` directly from the wrist animation; parent the utility object to the same wrist group and hide it at release. For P10, place this wrist near the pistol grip and keep the left-hand root hidden. Forearm nodes can share the wrist transform or be stretched along Z toward the viewmodel elbow. These nodes contain no skeleton or animation tracks, allowing the game to drive throw/reload motion without a competing mixer. The original full `first_person_arms` root remains available for firearms. The hands GLB embeds the same shared surface atlas and can use the deduplication rules above.
