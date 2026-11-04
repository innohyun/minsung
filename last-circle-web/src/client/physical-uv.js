// Instanced buildings keep a physical texture scale; stains cross adjacent wall
// pieces continuously instead of restarting on every rectangular primitive.
export function physicalUV(material,meters=2,{fabric=false,tile=false}={}){if(material.userData.physicalUV)return material;material.userData.physicalUV=true;material.customProgramCacheKey=()=>`world-surface-v15-${meters}-${fabric}-${tile}`;material.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 buildingP;varying vec3 buildingN;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
vec3 surfaceP=position,surfaceN=normal;
#ifdef USE_INSTANCING
surfaceP=(instanceMatrix*vec4(surfaceP,1.)).xyz;surfaceN=mat3(instanceMatrix)*surfaceN;
#endif
surfaceP=(modelMatrix*vec4(surfaceP,1.)).xyz;surfaceN=normalize(mat3(modelMatrix)*surfaceN);buildingP=surfaceP;buildingN=surfaceN;
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
`);
shader.fragmentShader=`varying vec3 buildingP;varying vec3 buildingN;
float wh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float wn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(wh(i),wh(i+vec2(1,0)),f.x),mix(wh(i+vec2(0,1)),wh(i+vec2(1)),f.x),f.y);}
`+shader.fragmentShader;
shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
vec2 weatherP=abs(buildingN.y)>.6?buildingP.xz:abs(buildingN.x)>abs(buildingN.z)?buildingP.zy:buildingP.xy;
float mottled=wn(weatherP*.61+buildingP.xz*.03)*.64+wn(weatherP*2.3)*.25+wn(weatherP*12.)*.11;
${fabric?`float weave=(sin(weatherP.x*110.)*sin(weatherP.y*110.))*.018;diffuseColor.rgb*=.92+mottled*.14+weave;`:
tile?`vec2 seam=abs(fract(weatherP/.43)-.5);float grout=smoothstep(.473,.49,max(seam.x,seam.y));diffuseColor.rgb*=mix(.92+mottled*.10,.61,grout);`:
`float chipped=smoothstep(.67,.83,wn(weatherP*5.4+vec2(wn(weatherP*.37)*3.)));float streak=smoothstep(.61,.88,wn(vec2(weatherP.x*2.7,weatherP.y*.18)+17.));float crack=(1.-smoothstep(.006,.019,abs(wn(weatherP*3.5)-.51)))*smoothstep(.72,.87,wn(weatherP*.47));diffuseColor.rgb*=.85+mottled*.26-streak*.08-crack*.07;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.11,1.08,.96),chipped*.27);`}
`);};material.needsUpdate=true;return material;}
