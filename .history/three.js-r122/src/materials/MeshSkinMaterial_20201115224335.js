import { TangentSpaceNormalMap } from '../constants.js';
import { Material } from './Material.js';
import { Vector2 } from '../math/Vector2.js';
import { Color } from '../math/Color.js';

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
// const vertexShader = THREE.ShaderChunk.meshphysical_vert;
// const fragmentShader = THREE.ShaderChunk.meshphysical_frag;

// Our custom shaders
const fragmentShader = glslify(path.resolve(__dirname, 'ice.frag'));
const vertexShader = glslify(path.resolve(__dirname, 'ice.vert'));

module.exports = MeshSkinMaterial;
function MeshSkinMaterial (parameters) {
  parameters = assign({}, parameters);
  THREE.MeshStandardMaterial.call(this);
  this.uniforms = assign({},
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
