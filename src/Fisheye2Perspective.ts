import * as THREE from "three";
import {Fisheye, Radian} from "./Fisheye";


export interface CameraConfig { region: FishEyeRegion, direction: DirectionOfView, zoom: number }

export type Pixel     = number;

/**
 * 画像上の魚眼円の位置と大きさ
 */
export interface FishEyeRegion {
  centerX: Pixel;
  centerY: Pixel;
  radius: Pixel;
}

/**
 * 注視点の向き、単位
 */
export interface DirectionOfView {
  pitch: Radian;
  yaw: Radian;
}


/**
 * 魚眼cnvを透視投影に変換する
 * ソースとなる cnv を動的に変えることができる、再利用可能な gl renderer
 * @example
 * ```js
 * // ライフサイクル
 * const a = new FisheyeCanvas2PerspectiveRenderer();
 * a.changeSource(video);         // 魚眼ソース指定
 * a.updateFisheyeRegion(region); // 魚眼ソースからクリッピングする領域を指定
 * a.setCanvasSize(size);         // 出力 canvas サイズを指定
 * a.setCameraPose(pose);         // カメラの向きを指定
 * a.render();                    // 描画
 * document.body.append(a.canvas); // 結果表示
 * ```
 */
export class Fisheye2Perspective extends Fisheye<THREE.PerspectiveCamera> {


  /**
   * ソース魚眼をクリッピングしたテクスチャ
   */
  readonly texctx1: CanvasRenderingContext2D;
  readonly texctx2: CanvasRenderingContext2D;

  /**
   * 描画モード
   * true - テクスチャ&ポリゴン削減モード
   * false - naive モード
   */
  readonly sep_mode: boolean;

  // 当たり判定
  readonly collisionSphere: THREE.Mesh;

  
  /** load 前 === src 変更前に書き換えてね */
  public mesh_num: number;
  private meshes: THREE.Mesh[];
  private texis: THREE.Texture[];
  private readonly local: THREE.Object3D;


  readonly CAMERA_PITCH_MAX: number;
  readonly CAMERA_PITCH_MIN: number;

  // for debug
  readonly debug: boolean;


  private prevEuler: {pitch: Radian, yaw: Radian};

  constructor(o?: {textureSizeExponent?: number, mesh?: number, sep_mode?: boolean, debug?: boolean}){
    super(new THREE.PerspectiveCamera( 30, 4 / 3, 1, 10000 ), o);

    if(o != null && o.sep_mode === true){
      this.sep_mode = true;
    }else{
      this.sep_mode = false;
    }
    if(o != null && o.mesh != null){
      this.mesh_num = o.mesh;
    }else{
      this.mesh_num = 32;
    }

    this.local = new THREE.Object3D();
    this.meshes = [];
    this.texis = [];

    this.local.position.z = 0;
    this.camera.position.z = 0.01;

    // ドラッグ用当たり判定メッシュ
    // SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength)
    const sphereGeom =  new THREE.SphereGeometry( 100, 32, 16 );
    const blueMaterial = new THREE.MeshBasicMaterial( { color: 0x0000ff, side: THREE.BackSide, transparent: true, opacity: 0 } );
    this.collisionSphere = new THREE.Mesh( sphereGeom, blueMaterial );

    this.scene.add(this.local);
    this.scene.add(this.collisionSphere);

    
    if(this.sep_mode){
      this.texctx1 = <CanvasRenderingContext2D>document.createElement("canvas").getContext("2d");
      this.texctx2 = <CanvasRenderingContext2D>document.createElement("canvas").getContext("2d");
    }

    

    this.CAMERA_PITCH_MAX = Math.PI*1/8;
    this.CAMERA_PITCH_MIN = (Math.PI/2)*7/8;
    this.prevEuler = {pitch: 0, yaw: 0};

    if(this.debug){
      this.mesh_num = 2; // ローポリ
    }
  }

  destructor(): void {
    super.destructor();
    this.unload();
    this.collisionSphere.geometry.dispose();
    this.collisionSphere.material.dispose();
  }

  /**
   * 描画する
   * needsUpdate して render
   */
  render(): void {
    if(this.src == null){ return; }
    const [sx, sy, sw, sh, dx, dy, dw, dh] = this.pos;
    this.texctx.canvas.width = this.texctx.canvas.width; // clear
    const {width, height} = this.texctx.canvas;

    

    if(this.sep_mode){
      // テクスチャを回転
      this.texctx.translate(width/2, height/2);
      this.texctx.rotate(this.yaw);
      this.texctx.translate(-width/2, -height/2);
      this.texctx.transform(-1, 0, 0, 1, width, 0);

      // clear
      this.texctx1.canvas.width = width/2;
      this.texctx2.canvas.width = width/2;
      const {width: w1, height: h1} = this.texctx1.canvas;
      const {width: w2, height: h2} = this.texctx2.canvas;

      // texctx1 は左下の魚眼中心になるようにする
      this.texctx1.translate(w1/2, h1/2);
      this.texctx1.rotate(Math.PI/2);
      this.texctx1.translate(-w1/2, -h1/2);
      
      // texctx2 は左下が魚眼中心になっているのでそのままでよい

      this.texctx.drawImage(this.src, sx, sy, sw, sh, dx, dy, dw, dh);
      this.texctx1.drawImage(this.texctx.canvas, 0,       0, width/2, height/2, 0, 0, w1, h1);
      this.texctx2.drawImage(this.texctx.canvas, width/2, 0, width/2, height/2, 0, 0, w2, h2);
    }else{
      this.texctx.drawImage(this.src, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    this.texis.forEach((tex)=>{ tex.needsUpdate = true; });
    this.renderer.render(this.scene, this.camera);
  }



  set pitch(pitch: Radian){
    this.local.rotation.x = -pitch;
  }
  get pitch(): Radian {
    return -this.local.rotation.x;
  }
  private _yaw: Radian;
  set yaw(yaw: Radian){
    if(this.meshes.length === 0){ return; }
    if(this.sep_mode){
      this._yaw = yaw;
    }else{
      this.meshes[0].rotation.z = yaw;
    }
  }
  get yaw(): Radian {
    if(this.meshes.length === 0){ return 0; }
    if(this.sep_mode){
      return this._yaw;
    }else{
      return this.meshes[0].rotation.z;
    }
  }

  set cameraPose({pitch, yaw}: DirectionOfView) {
    const {camera, local} = this;
    this.pitch = pitch;
    this.yaw = yaw;
  }
  get cameraPose(): DirectionOfView {
    const {camera, local} = this;
    const pitch = this.pitch;
    const yaw = this.yaw;
    return {pitch, yaw};
  }

  set zoom(scale: number) {
    this.camera.zoom = scale;
    this.camera.updateProjectionMatrix();
  }
  get zoom(): number {
    return this.camera.zoom;
  }
  /**
   * 画面情報
   */
  get config(): CameraConfig {
    const {region, zoom, cameraPose: direction} = this;
    return {region, direction, zoom};
  }
  set config(conf: CameraConfig) {
    const {region, zoom, direction: cameraPose} = conf;
    this.region = region;
    this.zoom = zoom;
    this.cameraPose = cameraPose;
  }

  protected updateFisheyeRegion() {
    super.updateFisheyeRegion();
    if(this.sep_mode){
      const {width, height} = this.texctx.canvas;
      this.texctx1.canvas.width = width/2;
      this.texctx2.canvas.width = width/2;
      this.texctx1.canvas.height = height/2;
      this.texctx2.canvas.height = height/2;
    }
  }
    /**
   * 以前のリソースを消す
   */
  protected unload(): void {
    this.meshes.forEach((mesh)=>{
      this.local.remove( mesh );
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.texis.forEach((tex)=>{
      tex.dispose();
    });
    this.meshes = [];
    this.texis = [];
  }

  /**
   * リソースの置き換え
   */
  protected load(): void {
    const source = this.src;

    if(source == null){ return; }
    // 現在の設定を取得
    const config = this.config;

    this.unload(); // 以前のパノラマを消す

    this.resize();
    
    // 天球 mesh
    if(this.sep_mode){
      const tex1 = new THREE.Texture(this.texctx1.canvas);
      const tex2 = new THREE.Texture(this.texctx2.canvas);
      const mesh1 = createFisheyeMesh2(tex1, this.mesh_num);
      mesh1.rotation.z = Math.PI/2; // 向かって左側になるように
      const mesh2 = createFisheyeMesh2(tex2, this.mesh_num);

      this.local.add(mesh1);
      this.local.add(mesh2);
      this.meshes.push(mesh1);
      this.meshes.push(mesh2);
      this.texis.push(tex1);
      this.texis.push(tex2);
    }else{
      const tex = new THREE.Texture(this.texctx.canvas);
      const mesh = createFisheyeMesh(tex, this.mesh_num);

      this.local.add(mesh);
      this.meshes.push(mesh);
      this.texis.push(tex);
    }
    // 以前の設定を反映
    this.config = config;
  }

  drag(type: "start" | "move", offsetX: number, offsetY: number){
    if(this.debug){
      console.info("Fisheye2Perspective now debug mode so use OrbitControls");
      return;
    }
    const {width, height} = this.canvasSize;
    // 取得したスクリーン座標を-1〜1に正規化する（WebGLは-1〜1で座標が表現される）
    const mouseX =  (offsetX/width)  * 2 - 1;
    const mouseY = -(offsetY/height) * 2 + 1;
    const pos = new THREE.Vector3(mouseX, mouseY, 1);
    const {camera, collisionSphere} = this;
    // pos はスクリーン座標系なので、オブジェクトの座標系に変換
    // オブジェクト座標系は今表示しているカメラからの視点なので、第二引数にカメラオブジェクトを渡す
    // new THREE.Projector.unprojectVector(pos, camera); ↓最新版では以下の方法で得る
    pos.unproject(camera);
    // 始点、向きベクトルを渡してレイを作成
    const ray = new THREE.Raycaster(camera.position, pos.sub(camera.position).normalize());
    const objs = ray.intersectObjects([collisionSphere]);
    // https://threejs.org/docs/api/core/Raycaster.html
    if(objs.length === 0){ return; }
    const obj = objs[0];
    if(type === "start"){
      this.prevEuler = toEuler(obj.point, obj.distance);
      return;
    }
    const curr = toEuler(obj.point, obj.distance);
    const {pitch, yaw} = this;
    let   _pitch = pitch - (curr.pitch - this.prevEuler.pitch);
    const _yaw   = yaw   - (curr.yaw - this.prevEuler.yaw);
    if(_pitch < this.CAMERA_PITCH_MAX){ _pitch = this.CAMERA_PITCH_MAX; }
    if(_pitch > this.CAMERA_PITCH_MIN){ _pitch = this.CAMERA_PITCH_MIN; }
    this.pitch = _pitch;
    this.yaw = _yaw;
    this.render();
    
    this.prevEuler = curr;
  }
}

/**
 * ptr は 画面
 * 奥へ向かって -z軸、
 * 右へ向かって x軸
 * 上に向かって y軸
 * であるような右手系 */
function toEuler(ptr: THREE.Vector3, l: number): {pitch: Radian, yaw: Radian}{
  // 画面
  // 奥へ向かってx軸
  // 右へy軸
  // 上へz軸
  // な座標系へ変換
  const [x,y,z] = [-ptr.z, ptr.x, ptr.y]; 
  // オイラー角に変換
  const yaw   = - Math.atan2(y, x);
  const a = -z/l;
  const pitch = Math.atan2(z, Math.sqrt(x*x + y*y));
  //2*Math.atan2(a, 1 + Math.sqrt(1 - Math.pow(a, 2))); // == asin(-z/l)
  return {yaw, pitch};
}

function toDeg(radians: number) {
  return radians * 180 / Math.PI;
}

/**
 * 正方形テクスチャを半球に投影したマテリアルとそのメッシュを得る
 * @param fisheye_texture - 正方形テクスチャ
 */
function createFisheyeMesh(fisheye_texture: THREE.Texture, MESH_N: number): THREE.Mesh { // 正方形テクスチャを仮定
  // SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength)
  const sphere = new THREE.SphereGeometry(1000, MESH_N, MESH_N, Math.PI, Math.PI);
  const {vertices, faces, faceVertexUvs} = sphere;
  const radius = sphere.boundingSphere.radius;
  // 半球の正射影をとる
  faces.forEach((face, i)=>{
    // face: 一枚のポリゴン
    const {a, b, c} = face; // ポリゴンの三つの頂点の ID
    // faceVertexUvs[0] となっているが 1 は特にない - http://d.hatena.ne.jp/technohippy/20120718
    faceVertexUvs[0][i] = [a, b, c].map((id)=>{
      const {x, y, z} = vertices[id]; // ポリゴンの3次元頂点座標
      return new THREE.Vector2(
        (x+radius)/(2*radius),
        (y+radius)/(2*radius));
    });
  });
  const mat = new THREE.MeshBasicMaterial( { color: 0xFFFFFF, map: fisheye_texture, side: THREE.BackSide } );
  const mesh = new THREE.Mesh(sphere, mat);
  mesh.rotation.x = Math.PI*1/2; // 北緯側の半球になるように回転
  return mesh;
}


/**
 * 北緯0-90度、西経0-90度の範囲
 * front
 *    ^ y top
 *   /
 *  /      
 * +-------> right
 * |       x
 * |
 * v z
 * back
 * 
 * back,-right,top の3つに囲まれた半半球を返す
 * 
 *  テクスチャは x-y 平面に貼られる。魚眼 canvas は魚眼中心が左下になるように x-y 平面に図のように貼られる。
 * 
 * ^_ y
 * |   `
 * |     \
 * +------> x
 *  \ 
 *   \
 *    v z
 * 
 * このままでは魚眼中心がz方向にあるので `mesh.rotation.x = Math.PI/2;` でy方向へ魚眼中心を持ってくる.
 * 
 * 最終的にできる mesh は rotation = 0 の状態で front-right-top の半半球として表示される。
 */
function createFisheyeMesh2(tex: THREE.Texture, MESH_N: number): THREE.Mesh {
  const sphere = new THREE.SphereGeometry(1000, MESH_N, MESH_N, Math.PI/2, Math.PI/2, 0, Math.PI/2);
  const {vertices, faces, faceVertexUvs} = sphere;
  const radius = sphere.boundingSphere.radius;
  // 半球の正射影をとる
  faces.forEach((face, i)=>{
    // face: 一枚のポリゴン
    const {a, b, c} = face; // ポリゴンの三つの頂点の ID
    // faceVertexUvs[0] となっているが 1 は特にない - http://d.hatena.ne.jp/technohippy/20120718
    faceVertexUvs[0][i] = [a, b, c].map((id)=>{
      const {x, y, z} = vertices[id]; // ポリゴンの3次元頂点座標
      return new THREE.Vector2(
        x/radius,
        y/radius);
    });
  });
  const mat = new THREE.MeshBasicMaterial( { color: 0xFFFFFF, map: tex, side: THREE.DoubleSide } );
  const mesh = new THREE.Mesh(sphere, mat);
  mesh.rotation.x = -Math.PI/2; // 北緯側の半球になるように回転
  return mesh;
}

