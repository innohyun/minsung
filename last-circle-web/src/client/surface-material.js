// Irregular soft material masks and stochastic texture projections share one
// terrain surface, so there are no overlapping grass/dirt sheets to flicker.
export function decorateTerrain(material,roadMask=null){
 material.customProgramCacheKey=()=>material.userData.art?.loaded?'natural-pbr-v15':'natural-v15';
 material.onBeforeCompile=shader=>{
  shader.uniforms.roadMask={value:roadMask};const art=material.userData.art?.loaded?material.userData.art:null,atlas=art?.manifest.materials.surfaceAtlas;
  if(art){for(const[key,id]of[['soilAlbedo',atlas.baseColor],['soilNormal',atlas.normal],['soilRoughness',atlas.roughness]])shader.uniforms[key]={value:art.texture(id)};}
  shader.vertexShader='attribute float biome;attribute vec4 groundMask;varying vec4 groundCover;varying vec3 groundP;varying float groundType;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngroundP=position;groundType=biome;groundCover=groundMask;');
  const fields=`
float nhs(vec2 p,uint seed){uint n=uint(int(p.x))*374761393u^uint(int(p.y))*668265263u^seed*1442695041u;n=(n^(n>>13u))*1274126177u;return float(n^(n>>16u))/4294967295.;}
float nh(vec2 p){return nhs(p,0u);}
vec2 nh2(vec2 p){return vec2(nh(p),nh(p+vec2(17,61)));}
float nvs(vec2 p,uint seed){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(nhs(i,seed),nhs(i+vec2(1,0),seed),f.x),mix(nhs(i+vec2(0,1),seed),nhs(i+vec2(1),seed),f.x),f.y);}
float vn(vec2 p){return nvs(p,0u);}
float fbs(vec2 p,uint seed,int octaves){float v=0.,a=.5,total=0.;mat2 r=mat2(1.791,-.731,.731,1.791);for(int i=0;i<4;i++){if(i>=octaves)break;v+=nvs(p,seed+uint(i)*61u)*a;total+=a;p=r*p+vec2(19.17,-7.41);a*=.5;}return v/total;}
float fb(vec2 p){return fbs(p,0u,4);}
vec2 warped(vec2 p){return p+(vec2(fbs(p*.013,419u,4),fbs(p*.013,617u,4))-.5)*34.;}
vec3 coverMask(vec2 q,float forest){float moisture=fbs(q*.032,71u,4),wear=fbs(q*.077,211u,3),dry=fbs(q*.018,997u,4);float grass=smoothstep(.35,.66,moisture)*(1.-smoothstep(.66,.86,wear));grass*=1.-forest*.88;return vec3(grass,(1.-grass)*(1.-smoothstep(.48,.72,dry)),smoothstep(.48,.72,dry)*(1.-grass));}
float dryFissures(vec2 p){vec2 cell=floor(p),f=fract(p);float first=8.,second=8.;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec2 node=vec2(float(x),float(y)),offset=node+nh2(cell+node)*.74+.13-f;float d=dot(offset,offset);if(d<first){second=first;first=d;}else second=min(second,d);}return(1.-smoothstep(.006,.025,second-first))*smoothstep(.60,.78,vn(p*.09));}
vec2 atlasUv(float tile,vec2 p){return(vec2(mod(tile,4.),floor(tile/4.))+vec2(.012)+fract(p)*.976)/4.;}
${art?`uniform sampler2D soilAlbedo;uniform sampler2D soilNormal;uniform sampler2D soilRoughness;
vec4 atNode(sampler2D tex,float tile,vec2 p,vec2 node){vec2 r=nh2(node);float a=r.x*6.283185;mat2 turn=mat2(cos(a),sin(a),-sin(a),cos(a));return texture2D(tex,atlasUv(tile,turn*p+r*31.));}
vec4 sampleSurface(sampler2D tex,float tile,vec2 p){vec2 cell=floor(p/7.),f=fract(p/7.);vec2 a=cell,b=cell+vec2(1,0),c=cell+vec2(0,1);vec3 w=vec3(1.-f.x-f.y,f.x,f.y);if(f.x+f.y>1.){a=cell+vec2(1);b=cell+vec2(0,1);c=cell+vec2(1,0);w=vec3(f.x+f.y-1.,1.-f.x,1.-f.y);}w=w*w;w/=dot(w,vec3(1));return atNode(tex,tile,p,a)*w.x+atNode(tex,tile,p,b)*w.y+atNode(tex,tile,p,c)*w.z;}
float dominantTile(vec3 mask){if(groundCover.b>.6)return 1.;return mask.x>.48?13.:12.;}
`:''}`;
  shader.fragmentShader='uniform sampler2D roadMask;varying vec4 groundCover;varying vec3 groundP;varying float groundType;\n'+fields+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
vec2 soil=groundP.xz,q=warped(soil);float woodland=max(groundCover.r,clamp((fbs(soil*.009,137u,4)-.61)*3.,0.,1.));vec3 cover=coverMask(q,woodland);float fine=vn(soil*6.1),macro=fb(soil*.007+91.);vec2 edgeNoise=vec2(vn(soil*.63),vn(soil*.71+23.))-.5;
vec3 route=texture2D(roadMask,(soil+1024.+edgeNoise*.75)/2048.).rgb;
float paved=smoothstep(.18,.84,route.r),trail=smoothstep(.12,.86,route.g),concrete=smoothstep(.18,.85,route.b);
vec3 grass=vec3(.115,.16,.057),earth=vec3(.23,.145,.073),dry=vec3(.34,.27,.153),gravel=vec3(.25,.235,.19),stone=vec3(.26,.267,.25);
${art?`vec2 texP=(soil+(vec2(vn(soil*.24),vn(soil*.24+53.))-.5)*.8)/2.6;
grass=sampleSurface(soilAlbedo,13.,texP).rgb;earth=sampleSurface(soilAlbedo,12.,texP).rgb;dry=earth*vec3(1.30,1.32,1.25)+vec3(.065,.054,.028);gravel=sampleSurface(soilAlbedo,14.,texP).rgb;stone=sampleSurface(soilAlbedo,1.,texP*.85).rgb;`:''}
vec3 natural=grass*cover.x+earth*cover.y+dry*cover.z;
float forest=woodland*smoothstep(.23,.65,fb(q*.041));natural=mix(natural,earth*vec3(.72,.68,.57),forest*.7);
float sand=groundCover.g;natural=mix(natural,mix(dry,gravel,.28)*vec3(1.15,1.12,1.03),sand*.8);
float rock=groundCover.b;natural=mix(natural,stone,rock*.96);
float crop=groundCover.a;natural=mix(natural,mix(earth,dry,.33),crop*.87);
float cracks=dryFissures(q*3.1)*smoothstep(.35,.8,cover.z);natural*=1.-cracks*.14;
natural*=.82+macro*.31+(fine-.5)*.055;
natural=mix(natural,mix(earth,gravel,.28)*(.9+fine*.16),trail*.95);
natural=mix(natural,vec3(.075,.087,.081)*(.83+fine*.19),paved);
natural=mix(natural,mix(gravel,vec3(.27,.267,.248),.65)*(.88+fine*.17),concrete);
diffuseColor.rgb=natural;
`);
  if(art){shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
vec2 detailP=texP;vec3 detailMask=cover;float detailTile=dominantTile(detailMask);roughnessFactor=clamp(sampleSurface(soilRoughness,detailTile,detailP).g,.72,1.);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
vec3 soilN=sampleSurface(soilNormal,dominantTile(cover),texP).xyz*2.-1.;vec3 q1=dFdx(-vViewPosition),q2=dFdy(-vViewPosition);vec2 s1=dFdx(groundP.xz),s2=dFdy(groundP.xz);vec3 t=normalize(q1*s2.y-q2*s1.y),b=normalize(-q1*s2.x+q2*s1.x);normal=normalize(normal+t*soilN.x*.42+b*soilN.y*.42);`);
  }
 };
 return material;
}
