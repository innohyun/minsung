# LAST CIRCLE 0.14 original botanical tree pack

All model, texture and impostor bytes are frozen. Only this guide and validation reports were added after handoff. Production `assets/art-manifest.json`, existing banks and runtime code were not changed by this generator.

Run `python scripts/create-trees-v014.py` to regenerate the original procedural meshes, editable Blender source, botanical alpha atlas, birch PBR maps, five species banks, fifteen impostors and standalone manifest patch. `--draft` skips the impostors/variant renders/patch and is only for review. Blender 4.3+, Python Pillow and NumPy are required; no accounts or downloads are used. Run `node assets/source/trees-v014-validate.mjs` and `python assets/source/trees-v014-validate-images.py` to repeat the read-only checks.

## Model and scaling contract

- Five banks: `trees-v014-{oak,birch,pine,maple,metasequoia}.glb`. Every bank has three stable top-level roots, `tree_<species>_0`, `_1`, `_2`, each with bark and foliage meshes.
- Metres, Y up, +Z forward, all root transforms identity. Origin is the trunk at ground. The base is exactly -0.10m. No roots, root cards, radial buttresses, rocks or terrain are present.
- `trees-v014-manifest-patch.json` contains 24 source-backed, SHA-256-addressed assets: 5 banks, 4 maps, 15 impostors. Merge its `models`, `materials`, `impostors` and assets as desired. `sourcePath` points to the unmodified bytes; `path` is their content-addressed destination. No assets/art copies are made here.
- Every `models[id]` has `bounds` with local min/max and width/height/length, and `trunkDiameter` in metres. Scale Y by desired tree height / bounds.height; scale X and Z by desired cover diameter / trunkDiameter. The nominal basal diameter is exact; small bark ridges at Y=0 add under 0.5% to the visible diameter.
- Trunk diameters by variant: oak .70/.77/.64, birch .38/.42/.35, pine .52/.59/.48, maple .60/.68/.55, metasequoia 1.65/1.80/1.50. World height remains under runtime control.
- Detailed variants have 11,998–17,500 triangles, two mesh primitives per tree. Their crown width, lean, scaffold count, branch angles, gaps and silhouettes differ; no symmetric branch tiers are generated. Mature crown volumes overlap while retaining small holes of sky.

## Textures, transparency and wind

The embedded material `Trees014 • foliage leaf cards` is separate from bark. It uses alpha MASK at .45, double-sided rendering and depth writing. Keep these settings when flattening for instancing. Mesh names end `_foliage_leaf`, making leaf-only wind classification explicit. Broadleaf cards contain small botanical oak/birch/maple leaves on fine twigs; pine sprays and paired metasequoia needles occupy their own atlas slots. No individual card exceeds .70m.

Embedded image names are exact, without extension:

| Banks | Names to share/deduplicate |
|---|---|
| Oak, pine, maple, metasequoia | `surface-atlas-basecolor`, `surface-atlas-normal`, `surface-atlas-orm` |
| All five banks, foliage only | `trees-v014-leaf-atlas-basecolor` |
| Birch bark only | `trees-v014-birch-basecolor`, `trees-v014-birch-normal`, `trees-v014-birch-orm` |

The first three are the existing source atlas, so their production asset IDs remain owned by the parent integration. Do not replace `trees-v014-leaf-atlas-basecolor` with an opaque surface map. The new leaf atlas is 2048² RGBA WebP; birch PBR maps are 512² WebP. Base color maps use sRGB; normal/ORM use linear data. ORM channels are occlusion, roughness, metallic.

## Impostors

`impostors[modelId]` has the assetId, physical `planeWidth`/`planeHeight`, local `center` [x,y,0], ground anchor, alpha cutoff .40 and double-sided/depth-write flags. Each WebP is transparent 256×512, rendered directly from that exact mesh before any comparison-scene placement. Use the physical plane aspect ratio in metadata: the stored pixels are deliberately standardized. Apply the model's XZ/Y scale to plane dimensions and center. Ground stays at root Y=0; the flat base extends .1m below it. Rotate the plane around the tree's ground origin while keeping the recorded local center offset. No photographic or unrelated generated images are included.

## Verification and visual review

`trees-v014-validation.json` records actual Three GLTFLoader geometry checks: all 15 roots and identity transforms, exact exported AABB agreement, correct nominal trunk diameters/no radial roots, 8–18k triangle budget, finite UV geometry, separate MASK foliage, distinct geometry hashes, and every asset SHA/size. The Node image shim supplies only browser bitmap construction; Pillow separately decodes all 20 embedded WebP bitstreams and 19 standalone WebPs in `trees-v014-image-validation.json`. All fifteen impostors have fully transparent margins, opaque trunk pixels and the expected 256×512 size.

The five species were rendered side by side at true relative height in `trees-v014-species-comparison.png`. Every three-variant group was directly inspected in `trees-v014-<species>-variants.png`; the editable `.blend` retains all roots at identity. The parent approved the mature crown shape and root-free direction before final packaging. Metasequoia needle width/card width were then reduced slightly to soften the appearance of large triangular fragments without changing the crown structure.
