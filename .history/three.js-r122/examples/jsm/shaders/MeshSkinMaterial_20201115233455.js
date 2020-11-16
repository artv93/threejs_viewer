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
  #include <lights_template>

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

  // modulation
  #include <aomap_fragment>

  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

  gl_FragColor = vec4( outgoingLight, diffuseColor.a );

  #include <premultiplied_alpha_fragment>
  #include <tonemapping_fragment>
  #include <encodings_fragment>
  #include <fog_fragment>

}
`;

var MeshSkinMaterial = function (parameters) {
  parameters = Object.assign({}, parameters);
  THREE.MeshStandardMaterial.call(this);
  this.uniforms = Object.assign({},
    THREE.ShaderLib.standard.uniforms,
    {
      // your custom uniforms or overrides to built-ins
      time: { type: 'f', value: 0 },
      thicknessMap: { type: 't', value: parameters.thicknessMap || new THREE.Texture() },
      thicknessRepeat: { type: 'v3', value: parameters.thicknessRepeat || new THREE.Vector2() },
      thicknessPower: { type: 'f', value: 20 },
      thicknessScale: { type: 'f', value: 4 },
      thicknessDistortion: { type: 'f', value: 0.185 },
      thicknessAmbient: { type: 'f', value: 0.0 },
    }
  );
  setFlags(this);
  this.setValues(parameters);

  /*UniformsUtils.merge( [

	THREE.ShaderLib.standard.uniforms,
  ]);*/
}

MeshSkinMaterial.prototype = Object.create(THREE.MeshStandardMaterial.prototype);
MeshSkinMaterial.prototype.constructor = MeshSkinMaterial;
MeshSkinMaterial.prototype.isMeshStandardMaterial = true;

MeshSkinMaterial.prototype.copy = function (source) {
  THREE.MeshStandardMaterial.prototype.copy.call(this, source);
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