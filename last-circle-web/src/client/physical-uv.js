// Architecture is instanced at many sizes. World-space UVs keep boards, mortar and
// gravel the same physical size on a cottage and on the eighty-metre barn.
export function physicalUV(material,meters=2){if(material.userData.physicalUV)return material;material.userData.physicalUV=true;material.customProgramCacheKey=()=>`world-surface-v14-${meters}`;material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
vec3 surfaceP=position,surfaceN=normal;
#ifdef USE_INSTANCING
surfaceP=(instanceMatrix*vec4(surfaceP,1.)).xyz;surfaceN=mat3(instanceMatrix)*surfaceN;
#endif
surfaceP=(modelMatrix*vec4(surfaceP,1.)).xyz;surfaceN=normalize(mat3(modelMatrix)*surfaceN);
vec2 physicalUv=(abs(surfaceN.y)>.5?surfaceP.xz:abs(surfaceN.x)>abs(surfaceN.z)?surfaceP.zy:surfaceP.xy)/${meters.toFixed(2)};
#ifdef USE_MAP
vMapUv=physicalUv;
#endif
#ifdef USE_NORMALMAP
vNormalMapUv=physicalUv;
#endif
#ifdef USE_ROUGHNESSMAP
vRoughnessMapUv=physicalUv;
#endif
`);};material.needsUpdate=true;return material;}
