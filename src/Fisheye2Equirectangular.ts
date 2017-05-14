import * as THREE from "three";
import {Fisheye, mercator2Sphere, sphere2Fisheye} from "./Fisheye";    
/**
 * Equirectangular Cylindrical Mercator
* http://wiki.panotools.org/Projections
*/
export class Fisheye2Equirectangular extends Fisheye<THREE.OrthographicCamera> {
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
    if(this.src == null){ return; }
    const [sx, sy, sw, sh, dx, dy, dw, dh] = this.pos;
    this.texctx.canvas.width = this.texctx.canvas.width; // clear
    const {width, height} = this.texctx.canvas;
    this.texctx.drawImage(this.src, sx, sy, sw, sh, dx, dy, dw, dh);
    this.texis.forEach((tex)=>{ tex.needsUpdate = true; });
    this.renderer.render(this.scene, this.camera);
  }
  protected load(): void {
    const source = this.src;
    if(source == null){ return; }
    this.unload(); // 以前のパノラマを消す
    // 現在のレンダラを現在のピクセルサイズに最適化する
    this.resize();
    const tex = new THREE.Texture(this.texctx.canvas);
    const mesh = createPanoramaMesh(tex);
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



export function createPanoramaMesh(fisheye_texture, panorama_width=0, R1_ratio=0, R2_ratio=1){
  // 正方形テクスチャを仮定
  //const panorama_width = 400; パノラマ板ポリの空間上の横幅、デフォルトはR2の円周の長さ
  //const R1_ratio = 0; // 扇型の下弦 0~1
  //const R2_ratio = 1; // 扇型の上弦 0~1 下弦 < 上弦
  const {width, height} = (()=>{
    // fisheye -> panorama のパノラマのw/hアスペクト比を計算
    const {width, height} = fisheye_texture.image;
    const [Hs, Ws] = [width, height]; // fisheye 画像短径
    const [Cx, Cy] = [Ws/2, Hs/2]; // fisheye 中心座標
    const R = Hs/2; // 中心座標からの半径
    const [R1, R2] = [R*R1_ratio, R*R2_ratio]; // fisheye から ドーナッツ状に切り取る領域を決める半径二つ
    const [Wd, Hd] = [(R2 + R1)*Math.PI, R2 - R1] // ドーナッツ状に切り取った領域を短径に変換した大きさ
    return {height:Hd, width:Wd};
  })();
  const h_per_w_ratio = height/width;
  // panorama_width の デフォルト値設定
  if(panorama_width <= 0){
    panorama_width = width;
  }
  const モノリス = new THREE.PlaneGeometry(panorama_width, panorama_width*h_per_w_ratio, 32, 32);
  const {vertices, faces, faceVertexUvs} = モノリス;
  // UVを扇型に変換
  const [Hs, Ws] = [1, 1]; // UV のサイズ
  const [Cx, Cy] = [Ws/2, Hs/2]; // UV の中心座標
  const R = Hs/2; // 中心座標からの半径
  const [R1, R2] = [R*R1_ratio, R*R2_ratio]; // UV からドーナッツ状に切り取る領域を決める半径二つ
  const [Wd, Hd] = [1, 1] // ドーナッツ状に切り取った領域を短径に変換した大きさ
  faceVertexUvs[0] = faceVertexUvs[0].map((pt2Dx3)=>{
    return pt2Dx3.map(({x, y})=>{
      const [xD, yD] = [x, y];
      // x, y ∈ [0, 1] は正方形に正規化された PlaneGeometry 上のUV座標
      // たとえば (x,y) = (0, 0) は PlaneGeometry 左上座標。
      // この(x,y)座標が表示すべき(魚眼)テクスチャ座標を返せば良い。
      // 今回はテクスチャが魚眼画像なので UV座標(0,0) が表示すべきテクスチャ座標は オイラー座標で (0,0)、直交座標では(cx,cy)になる。
      // PlaneGeometry 上のあるピクセルはテクスチャ上のどの位置を表示(写像)しなければいけないかを考える。
      const r = (yD/Hd)*(R2-R1) + R1;
      const theta = (xD/Wd)*2.0*Math.PI;
      const xS = Cx + r*Math.sin(theta);
      const yS = Cy + r*Math.cos(theta);
      return new THREE.Vector2(xS, yS);
      
    });
  });
  const mat = new THREE.MeshBasicMaterial( { color: 0xFFFFFF, map: fisheye_texture } );
  const 漆黒のモノリス = new THREE.Mesh(モノリス, mat);
  漆黒のモノリス.rotation.x = Math.PI; // 北緯側の半球になるように回転
  漆黒のモノリス.rotation.y = Math.PI; // こっちむいてベイビー
  漆黒のモノリス.position.z = -panorama_width; // カメラからの距離
  return 漆黒のモノリス;
}


