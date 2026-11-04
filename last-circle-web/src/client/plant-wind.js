import * as T from'three';
export function plantWind(material,clock,{height=1,amount=.04,leaves=true}={}){const previous=material.onBeforeCompile,code=`uniform float vegetationClock;\n`,bend=`
float plantHeight=clamp(position.y/${height.toFixed(3)},0.,1.);vec3 seedP=position;
#ifdef USE_INSTANCING
seedP+=instanceMatrix[3].xyz;
#endif
float plantPhase=seedP.x*.37+seedP.z*.23;
transformed.x+=sin(vegetationClock*.73+plantPhase+position.y*.27)*${amount.toFixed(4)}*plantHeight*plantHeight;
transformed.z+=sin(vegetationClock*.49+plantPhase*1.3)*${(amount*.63).toFixed(4)}*plantHeight*plantHeight;
${leaves?`transformed.x+=sin(vegetationClock*2.6+position.x*4.1+position.z*3.3+plantPhase)*.016*plantHeight;`:''}`;
 const patch=shader=>{shader.uniforms.vegetationClock=clock;shader.vertexShader=code+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+bend);};
 material.onBeforeCompile=shader=>{previous?.(shader);patch(shader);};material.customProgramCacheKey=()=>`vegetation-v15-${height}-${amount}-${leaves}`;
 const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:material.map,alphaTest:material.alphaTest||0,side:material.side});depth.onBeforeCompile=patch;depth.customProgramCacheKey=material.customProgramCacheKey;material.userData.vegetationDepth=depth;material.needsUpdate=true;return material;
}
