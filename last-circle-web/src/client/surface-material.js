export function decorateTerrain(material,roadMask=null){material.onBeforeCompile=shader=>{if(roadMask)shader.uniforms.roadMask={value:roadMask};shader.vertexShader='attribute float biome;varying vec3 groundP;varying float groundType;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngroundP=position;groundType=biome;');shader.fragmentShader='uniform sampler2D roadMask;varying vec3 groundP;varying float groundType;float soilNoise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float softSoil(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(soilNoise(i),soilNoise(i+vec2(1.,0.)),f.x),mix(soilNoise(i+vec2(0.,1.)),soilNoise(i+vec2(1.,1.)),f.x),f.y);}\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec2 soil=groundP.xz;
float grain=soilNoise(floor(soil*22.0));float pebble=softSoil(soil*2.7);float patches=sin(soil.x*.29+sin(soil.y*.17)*2.0)*sin(soil.y*.23);
float pattern=.92+grain*.12+patches*.045;
if(groundType>3.5&&groundType<4.5)pattern=.96+.055*sin(soil.y*7.0+sin(soil.x*.8)*2.0)+grain*.04;
else if(groundType>4.5&&groundType<5.5){float seam=abs(sin(soil.x*1.3+soil.y*.75+sin(soil.y*.49)));pattern=.79+pebble*.24+grain*.06;if(seam<.055)pattern*=.73;}
else if(groundType>2.5&&groundType<3.5)pattern=.76+pebble*.33+grain*.08+patches*.08;
else if(groundType>5.5)pattern=.89+grain*.15+pebble*.04;
else if(groundType<1.5)pattern=.87+pebble*.15+patches*.12+grain*.06;
diffuseColor.rgb*=pattern;
vec2 roadUv=vec2((groundP.x+1024.0)/2048.0,(groundP.z+1024.0)/2048.0);
vec3 road=texture2D(roadMask,roadUv).rgb;float paved=road.r,trail=road.g;
vec3 asphalt=vec3(.145,.169,.166)*(.91+grain*.12);
vec3 dirtTrack=vec3(.335,.249,.151)*(.9+pebble*.16);
diffuseColor.rgb=mix(diffuseColor.rgb,dirtTrack,trail*.90);diffuseColor.rgb=mix(diffuseColor.rgb,asphalt,paved);`);};return material;}
