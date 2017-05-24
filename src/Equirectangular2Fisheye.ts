import * as THREE from "three";
import {fisheye2equirectangular, Fisheye} from "./Fisheye";

export class Equirectangular2Fisheye extends Fisheye<THREE.OrthographicCamera> {
  protected mesh_num: number;
  private meshes: THREE.Mesh[];
  private texis: THREE.Texture[];
  
  constructor(o?: {}){
    // left, right, top, bottom, near, far
    const camera = new THREE.OrthographicCamera(600/-2, 600/2, 400/2, 400/-2, 1, 10000);
    camera.position.z = 0.01;
    super(camera, o);
    
    this.meshes = [];
    this.texis = [];
  }
  render(): void {
    const source = this.src;
    if(source == null){ return; }
    this.texctx.canvas.width = this.texctx.canvas.width
    let {width:w, height:h} = source;
    if(source instanceof HTMLVideoElement){
      w  = source.videoWidth;
      h = source.videoHeight;
    }
    this.texctx.drawImage(source, 0, 0, w, h, 0, 0, this.texctx.canvas.width, this.texctx.canvas.height);
    this.texis.forEach((tex)=>{ tex.needsUpdate = true; });
    this.renderer.render(this.scene, this.camera);
  }
  protected load(): void {
    const source = this.src;
    if(source == null){ return; }
    this.unload(); // 以前のパノラマを消す
    let {width:w, height:h} = source;
    if(source instanceof HTMLVideoElement){
      w  = source.videoWidth;
      h = source.videoHeight;
    }
    this.texctx.canvas.width = h;
    this.texctx.canvas.height = h;
    const tex = new THREE.Texture(this.texctx.canvas);
    const mesh = createFisheyeMesh(tex);
    const {width, height} = (<THREE.PlaneGeometry>mesh.geometry).parameters;
    this.renderer.setSize( width, height );
    this.camera.left = width/-2;
    this.camera.right = width/2;
    this.camera.top = height/2;
    this.camera.bottom = height/-2;
    this.camera.updateProjectionMatrix();
    this.scene.add(mesh);
    this.meshes.push(mesh);
    this.texis.push(tex);
  }
  protected unload(): void {
    this.meshes.forEach((mesh)=>{
      this.scene.remove( mesh );
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.texis.forEach((tex)=>{
      tex.dispose();
    });
    this.meshes = [];
    this.texis = [];
  }
  drag(type: "start" | "move", offsetX: number, offsetY: number) {
  }
}




export function createFisheyeMesh(tex: THREE.Texture, R1_ratio=0, R2_ratio=1){
  const img = tex.image;
  const {width, height} = img;
  const fish_plane = new THREE.PlaneGeometry(height*2, height*2, 32, 32);
  const {vertices, faces, faceVertexUvs} = fish_plane;
  faceVertexUvs[0] = faceVertexUvs[0].map((pt2Dx3)=>{
    return pt2Dx3.map(({x, y})=>{
      const [xD, yD] = [x, y];
      const [s, t] = fisheye2equirectangular(xD, yD);
      return new THREE.Vector2(s, t);
    });
  });
  const mat = new THREE.MeshBasicMaterial( { color: 0xFFFFFF, map: tex, side: THREE.DoubleSide } );
  const fish_mesh = new THREE.Mesh(fish_plane, mat);
  fish_mesh.rotation.z = -Math.PI/2;
  fish_mesh.position.z = -800; // カメラからの距離
  return fish_mesh;
}


