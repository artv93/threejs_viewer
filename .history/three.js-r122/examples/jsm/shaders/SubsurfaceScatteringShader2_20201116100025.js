import * as THREE from "../../../build/three.module.js";

var SubsurfaceScatteringShader2 = {

	uniforms: THREE.UniformsUtils.merge([
		THREE.ShaderLib[ "physical" ].uniforms,
		{
			time: { type: 'f', value: 0 },
			thicknessMap: { type: 't', value: new THREE.Texture() },
			thicknessRepeat: { type: 'v3', value: new THREE.Vector2() },
			thicknessPower: { type: 'f', value: 20 },
			thicknessScale: { type: 'f', value: 4 },
			thicknessDistortion: { type: 'f', value: 0.185 },
			thicknessAmbient: { type: 'f', value: 0.0 },
		}
	]),

	vertexShader: "#define USE_UV\n" + THREE.ShaderChunk.meshphysical_vert,

	fragmentShader: `
	#define USE_TRANSLUCENCY
	#define USE_UV
	
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
	`,
};

export { SubsurfaceScatteringShader2 };
