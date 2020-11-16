import * as THREE from '../../../build/three.module.js';

/**
 * parameters = {
 *  color: <hex>,
 *  roughness: <float>,
 *  metalness: <float>,
 *  opacity: <float>,
 *
 *  map: new THREE.Texture( <Image> ),
 *
 *  lightMap: new THREE.Texture( <Image> ),
 *  lightMapIntensity: <float>
 *
 *  aoMap: new THREE.Texture( <Image> ),
 *  aoMapIntensity: <float>
 *
 *  emissive: <hex>,
 *  emissiveIntensity: <float>
 *  emissiveMap: new THREE.Texture( <Image> ),
 *
 *  bumpMap: new THREE.Texture( <Image> ),
 *  bumpScale: <float>,
 *
 *  normalMap: new THREE.Texture( <Image> ),
 *  normalMapType: THREE.TangentSpaceNormalMap,
 *  normalScale: <Vector2>,
 *
 *  displacementMap: new THREE.Texture( <Image> ),
 *  displacementScale: <float>,
 *  displacementBias: <float>,
 *
 *  roughnessMap: new THREE.Texture( <Image> ),
 *
 *  metalnessMap: new THREE.Texture( <Image> ),
 *
 *  alphaMap: new THREE.Texture( <Image> ),
 *
 *  envMap: new THREE.CubeTexture( [posx, negx, posy, negy, posz, negz] ),
 *  envMapIntensity: <float>
 *
 *  refractionRatio: <float>,
 *
 *  wireframe: <boolean>,
 *  wireframeLinewidth: <float>,
 *
 *  skinning: <bool>,
 *  morphTargets: <bool>,
 *  morphNormals: <bool>
 * }
 */

// This is the original source, we will copy + paste it for our own GLSL
const vertexShader = THREE.ShaderChunk.meshphysical_vert;
//const fragmentShader = THREE.ShaderChunk.meshphysical_frag;

// Our custom shaders
const fragmentShader = `
#define USE_TRANSLUCENCY
#define TRANSMISSION

#ifdef USE_TRANSLUCENCY
  uniform sampler2D thicknessMap;
  uniform float thicknessPower;
  uniform float thicknessScale;
  uniform float thicknessDistortion;
  uniform float thicknessAmbient;
  uniform vec2 thicknessRepeat;
#endif

#define STANDARD
#ifdef PHYSICAL
	#define REFLECTIVITY
	#define CLEARCOAT
	#define TRANSMISSION
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef TRANSMISSION
	uniform float transmission;
#endif
#ifdef REFLECTIVITY
	uniform float reflectivity;
#endif
#ifdef CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheen;
#endif
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <transmissionmap_pars_fragment>
#include <bsdfs>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#ifdef TRANSMISSION
		float totalTransmission = transmission;
	#endif
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <transmissionmap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
  #include <lights_fragment_end>
  
  #ifdef USE_TRANSLUCENCY
    vec3 thicknessColor = vec3(1.0, 0.0, 0.0);
    vec3 thickness = thicknessColor * (1.0 - texture2D(thicknessMap, vUv * thicknessRepeat).r);
    vec3 N = geometry.normal;
    vec3 V = normalize(geometry.viewDir);
    float thicknessCutoff = 0.75;
    float thicknessDecay = 1.0;

  #if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
    for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
      directionalLight = directionalLights[ i ];

      vec3 vLightDir = directionalLight.direction;
      vec3 L = normalize(vLightDir);

      float lightDist = length(vLightDir);
      //float lightAtten = punctualLightIntensityToIrradianceFactor(lightDist, pointLight.distance, pointLight.decay);
      
      vec3 LTLight = normalize(L + (N * thicknessDistortion));
      float LTDot = pow(saturate(dot(V, -LTLight)), thicknessPower) * thicknessScale;
      vec3 LT = (LTDot + thicknessAmbient) * thickness;
      reflectedLight.directDiffuse += material.diffuseColor * directionalLight.color * LT;
    }
  #endif

    #if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
      for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
        pointLight = pointLights[ i ];

        vec3 vLightDir = pointLight.position - geometry.position;
        vec3 L = normalize(vLightDir);

        float lightDist = length(vLightDir);
        float lightAtten = punctualLightIntensityToIrradianceFactor(lightDist, pointLight.distance, pointLight.decay);
        
        vec3 LTLight = normalize(L + (N * thicknessDistortion));
        float LTDot = pow(saturate(dot(V, -LTLight)), thicknessPower) * thicknessScale;
        vec3 LT = lightAtten * (LTDot + thicknessAmbient) * thickness;
        reflectedLight.directDiffuse += material.diffuseColor * pointLight.color * LT;
      }
    #endif
    #if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
      for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
        rectAreaLight = rectAreaLights[ i ];
        
        vec3 vLightDir = rectAreaLight.position - geometry.position;
        vec3 L = normalize(vLightDir);

        float lightDist = length(vLightDir);
        float lightAtten = punctualLightIntensityToIrradianceFactor(lightDist, thicknessCutoff, thicknessDecay);
        
        vec3 LTLight = normalize(L + (N * thicknessDistortion));
        float LTDot = pow(saturate(dot(V, -LTLight)), thicknessPower) * thicknessScale;
        vec3 LT = lightAtten * (LTDot + thicknessAmbient) * thickness;
        reflectedLight.directDiffuse += material.diffuseColor * rectAreaLight.color * LT;
      }
    #endif
  #endif

	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#ifdef TRANSMISSION
		diffuseColor.a *= mix( saturate( 1. - totalTransmission + linearToRelativeLuminance( reflectedLight.directSpecular + reflectedLight.indirectSpecular ) ), 1.0, metalness );
	#endif
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}
`;

var MeshSkinMaterial = function (parameters) {
  parameters = Object.assign({}, parameters);
  THREE.MeshPhysicalMaterial.call(this);
  this.uniforms = Object.assign({},
    THREE.ShaderLib.physical.uniforms,
    {
      // your custom uniforms or overrides to built-ins
      time: new THREE.Uniform(0), //{ value: 0 },
      thicknessMap: new THREE.Uniform(parameters.thicknessMap || new THREE.Texture()), //{ value: parameters.thicknessMap || new THREE.Texture() },
      thicknessRepeat: new THREE.Uniform(parameters.thicknessRepeat || new THREE.Vector2(1, 1)), //{ value: parameters.thicknessRepeat || new THREE.Vector2() },
      thicknessPower: new THREE.Uniform(200), //{ value: 20 },
      thicknessScale: new THREE.Uniform(40), //{ value: 4 },
      thicknessDistortion: new THREE.Uniform(0.5), //{ value: 0.185 },
      thicknessAmbient: new THREE.Uniform(0.25), //{ value: 0.5 },
      transmissionMap: new THREE.Uniform(parameters.thicknessMap || new THREE.Texture()), //{value: parameters.thicknessMap || new THREE.Texture()},
      transmission: new THREE.Uniform(0.5), //{value: 0.5}
    }
  );
  setFlags(this);
  this.setValues(parameters);

  /*UniformsUtils.merge( [

	THREE.ShaderLib.standard.uniforms,
  ]);*/

  console.dir(this);

  return this;
}

MeshSkinMaterial.prototype = Object.create(THREE.MeshPhysicalMaterial.prototype);
MeshSkinMaterial.prototype.constructor = MeshSkinMaterial;
//MeshSkinMaterial.prototype.isMeshStandardMaterial = true;

MeshSkinMaterial.prototype.copy = function (source) {
  THREE.MeshPhysicalMaterial.prototype.copy.call(this, source);
  this.uniforms = THREE.UniformsUtils.clone(source.uniforms);
  setFlags(this);
  return this;
};

function setFlags (material) {
  material.vertexShader = vertexShader;
  material.fragmentShader = fragmentShader;
  material.type = 'MeshSkinMaterial';
}

export {MeshSkinMaterial}

/* 

#define STANDARD
#ifdef PHYSICAL
	#define REFLECTIVITY
	#define CLEARCOAT
	#define TRANSMISSION
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef TRANSMISSION
	uniform float transmission;
#endif
#ifdef REFLECTIVITY
	uniform float reflectivity;
#endif
#ifdef CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheen;
#endif
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <transmissionmap_pars_fragment>
#include <bsdfs>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#ifdef TRANSMISSION
		float totalTransmission = transmission;
	#endif
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <transmissionmap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#ifdef TRANSMISSION
		diffuseColor.a *= mix( saturate( 1. - totalTransmission + linearToRelativeLuminance( reflectedLight.directSpecular + reflectedLight.indirectSpecular ) ), 1.0, metalness );
	#endif
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}

*/










/* 

#define USE_TRANSLUCENCY

#ifdef USE_TRANSLUCENCY
  uniform sampler2D thicknessMap;
  uniform float thicknessPower;
  uniform float thicknessScale;
  uniform float thicknessDistortion;
  uniform float thicknessAmbient;
  uniform vec2 thicknessRepeat;
#endif

#define PHYSICAL

uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;

#ifndef STANDARD
  uniform float clearCoat;
  uniform float clearCoatRoughness;
#endif

uniform float envMapIntensity; // temporary

varying vec3 vViewPosition;

varying vec2 vUv;

#ifndef FLAT_SHADED

  varying vec3 vNormal;

#endif

#include <common>
#include <packing>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <cube_uv_reflection_fragment>
#include <lights_pars_begin>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {

  #include <clipping_planes_fragment>

  vec4 diffuseColor = vec4( diffuse, opacity );
  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
  vec3 totalEmissiveRadiance = emissive;

  #include <logdepthbuf_fragment>
  #include <map_fragment>
  #include <color_fragment>
  #include <alphamap_fragment>
  #include <alphatest_fragment>
  #include <specularmap_fragment>
  #include <roughnessmap_fragment>
  #include <metalnessmap_fragment>
  #include <normal_fragment_begin>
	#include <normal_fragment_maps>
  #include <emissivemap_fragment>

  // accumulation
  #include <lights_physical_fragment>
  //#include <lights_template>
  #include <lights_fragment_begin>
  //#include <lights_fragment_maps>
  
  //GeometricContext geometry;
  //geometry.position = - vViewPosition;
  //geometry.normal = normal;
  //geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
#ifdef CLEARCOAT
	//geometry.clearcoatNormal = clearcoatNormal;
#endif

  #ifdef USE_TRANSLUCENCY
    vec3 thicknessColor = vec3(1.0, 1.0, 1.0);
    vec3 thickness = thicknessColor * texture2D(thicknessMap, vUv * thicknessRepeat).r;
    vec3 N = geometry.normal;
    vec3 V = normalize(geometry.viewDir);
    float thicknessCutoff = 0.75;
    float thicknessDecay = 1.0;
    
    #if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )

      for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {

        pointLight = pointLights[ i ];

        vec3 vLightDir = pointLight.position - geometry.position;
        vec3 L = normalize(vLightDir);

        float lightDist = length(vLightDir);
        float lightAtten = punctualLightIntensityToIrradianceFactor(lightDist, pointLight.distance, pointLight.decay);
        
        vec3 LTLight = normalize(L + (N * thicknessDistortion));
        float LTDot = pow(saturate(dot(V, -LTLight)), thicknessPower) * thicknessScale;
        vec3 LT = lightAtten * (LTDot + thicknessAmbient) * thickness;
        reflectedLight.directDiffuse += material.diffuseColor * pointLight.color * LT;

      }

    #endif

    #if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
      

      for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {

        rectAreaLight = rectAreaLights[ i ];
        
        vec3 vLightDir = rectAreaLight.position - geometry.position;
        vec3 L = normalize(vLightDir);

        float lightDist = length(vLightDir);
        float lightAtten = punctualLightIntensityToIrradianceFactor(lightDist, thicknessCutoff, thicknessDecay);
        
        vec3 LTLight = normalize(L + (N * thicknessDistortion));
        float LTDot = pow(saturate(dot(V, -LTLight)), thicknessPower) * thicknessScale;
        vec3 LT = lightAtten * (LTDot + thicknessAmbient) * thickness;
        reflectedLight.directDiffuse += material.diffuseColor * rectAreaLight.color * LT;
      }
    #endif
  #endif

 // #include <lights_fragment_begin>
 //#include <lights_fragment_maps>
  //#include <lights_fragment_end>

  // modulation
  #include <aomap_fragment>

  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

  gl_FragColor = vec4( outgoingLight, diffuseColor.a );

  #include <premultiplied_alpha_fragment>
  #include <tonemapping_fragment>
  #include <encodings_fragment>
  #include <fog_fragment>

}


*/