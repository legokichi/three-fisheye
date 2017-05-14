import * as THREE from "three";
const OrbitControls: any = require('three-orbit-controls')(THREE);

export abstract class Fisheye<Camera extends THREE.Camera>{
  /**
    * gl canvas
    */
  public readonly canvas: HTMLCanvasElement;


  /**
   * three
   */
  public readonly camera: Camera;
  protected readonly renderer: THREE.WebGLRenderer;
  protected readonly scene: THREE.Scene;
  private skybox: THREE.Mesh;
  private skyboxtex: THREE.CubeTexture;

  /**
   * ソース魚眼をクリッピングしたテクスチャ
   */
  public readonly texctx: CanvasRenderingContext2D;
  /** 変換元の魚眼 */
  private source: HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|null;
  /** 2のn乗になるテクスチャの大きさのnの値 */
  private exponent: number;
  /**
   * 2のn乗になるテクスチャの大きさのnの値
   * 書き換えたら this.resize(); すること
   */
  public defaultExponent: number | null;
  /** 正方形テクスチャから切り取る領域 */
  protected region: { centerX: number; centerY: number; radius: number; };
  /**
   * ```js
   * ctx.drawImage(video, 
   *   sx, sy, sw, sh,
   *   dx, dy, dw, dh
   * );```
   */
  protected pos: [
    number,number,number,number,
    number,number,number,number
  ];


  public debug: boolean;

  constructor(camera: Camera, o?: { textureSizeExponent?: number; mesh?: number; debug?: boolean; }){
    if(o != null && o.textureSizeExponent != null){
      this.defaultExponent = o.textureSizeExponent;
    }else{
      this.defaultExponent = null;
    }
    if(o != null && o.debug != null){
      this.debug = o.debug;
    }else{
      this.debug = false;
    }

    this.camera = camera;
    this.renderer = new THREE.WebGLRenderer();
    this.canvas = this.renderer.domElement;
    this.scene = new THREE.Scene();
    this.scene.add(this.camera);

    this.source = null;
    this.pos = [0,0,0,0,0,0,0,0];
    this.exponent = 0;
    this.texctx = <CanvasRenderingContext2D>document.createElement("canvas").getContext("2d");
    this.region = {centerX: 300, centerY: 300, radius: 300};

    if(this.debug){

      this.camera.lookAt(new THREE.Vector3())
      const controls = new OrbitControls(this.camera, this.canvas);

      this.camera.position.z = 2000;

      load_skybox_texture().then((tex)=>{
        this.skyboxtex = tex;
        return createSkyboxMesh(tex);
      }).then((skybox)=>{
        this.skybox = skybox;
        this.scene.add(skybox);
      });
    }
  }


  /**
   * @param source - 変換元の魚眼何かを変更
   */
  public set src(source: HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|null) {
    if(source == null){ return; }
    if(source === this.source){ return; }
    this.source = source;
    this.load();
  }
  public get src(): HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|null {
    return this.source;
  }


  public set centerX(centerX: number){
    this.region.centerX = centerX;
    this.updateFisheyeRegion();
  }
  public get centerX(): number {
    return this.region.centerX;
  }
  public set centerY(centerY: number){
    this.region.centerY = centerY;
    this.updateFisheyeRegion();
  }
  public get centerY(): number {
    return this.region.centerY;
  }
  public set radius(radius: number){
    this.region.radius = radius;
    this.updateFisheyeRegion();
  }
  public get radius(): number {
    return this.region.radius;
  }
  /**
   * 魚眼の円の位置を調整する
   */
  public set fisheyeRegion(prop: { centerX: number; centerY: number; radius: number; }) {
    this.region = prop;
    this.updateFisheyeRegion();
  }
  public get fisheyeRegion(): { centerX: number; centerY: number; radius: number; } { return this.region; }


  public set width(n: number){ this.canvasSize = {width: n, height: this.canvasSize.height}; }
  public get width(): number{ return this.canvasSize.width; }
  public set height(n: number){ this.canvasSize = {width: this.canvasSize.width, height: n}; }
  public get height(): number{ return this.canvasSize.height; }
  /**
   * 現在のレンダラを現在のピクセルサイズに最適化する
   */
  public set canvasSize(size: {width: number, height: number} ) {
    // 現在のレンダラを現在のピクセルサイズに最適化する
    this.renderer.setSize(size.width, size.height);
    if(this.camera instanceof THREE.PerspectiveCamera){
      this.camera.updateProjectionMatrix();
    }
  }
  public get canvasSize(): {width: number, height: number} { return this.renderer.getSize(); }

  public destructor(): void {
    if(this.debug){
      this.scene.remove(this.skybox);
      this.skybox.geometry.dispose();
      this.skybox.material.dispose();
      this.skyboxtex.dispose();
    }
  }
  public abstract render(): void;
  public abstract drag(type: "start" | "move", offsetX: number, offsetY: number);

  protected abstract load(): void;
  protected abstract unload(): void;


  /**
   * cam.src の size にテクスチャを合わせる
   */
  public resize(): void {
    const source = this.source;

    if(source == null){ return; }

    let {width, height} = source;

    if(source instanceof HTMLVideoElement){
      width  = source.videoWidth;
      height = source.videoHeight;
    }

    const size = Math.min(width, height);
    if(this.defaultExponent == null){
      for(var i=0; size > Math.pow(2, i); i++){} // 2^n の大きさを得る
      this.exponent = i; // ターゲット解像度
    }else{
      this.exponent = this.defaultExponent;
    }
    this.updateFisheyeRegion();
  }

    /**
   * 魚眼クリッピング領域の計算
   */
  protected updateFisheyeRegion() {
    const pow = Math.pow(2, this.exponent);
    const {radius, centerX, centerY} = this.region;
    const clippedWidth  = radius*2;
    const clippedHeight = radius*2;
    const left = centerX - radius;
    const top  = centerY - radius;

    let [sx, sy] = [left, top];
    let [sw, sh] = [clippedWidth, clippedHeight];
    let [dx, dy] = [0, 0];
    let [dw, dh] = [pow, pow]; // 縮小先の大きさ
    // ネガティブマージン 対応
    if(left < 0){
      sx = 0;
      sw = clippedWidth - left;
      dx = -left*pow/clippedWidth;
      dw = sw*pow/clippedWidth;
    }
    if(top < 0){
      sy = 0;
      sh = clippedHeight - top;
      dy = -top*pow/clippedHeight;
      dh = sh*pow/clippedHeight;
    }
    this.pos = [sx, sy, sw, sh, dx, dy, dw, dh];
    // 2^nな縮拡先の大きさ
    this.texctx.canvas.width  = pow;
    this.texctx.canvas.height = pow;
  }
}



export function load_skybox_texture(path=
  'textures/cube/Park3Med/'
  //'textures/cube/skybox/'
  //'textures/cube/SwedishRoyalCastle/'
): Promise<THREE.CubeTexture> {
  return new Promise<THREE.CubeTexture>((resolve, reject)=>{
    const loader = new THREE.CubeTextureLoader();
    loader.setPath(path);
    loader.load( [
      'px.jpg', 'nx.jpg',
      'py.jpg', 'ny.jpg',
      'pz.jpg', 'nz.jpg'
    ], resolve, (xhr) => {}, reject );
  });
}

export function createSkyboxMesh(skybox_texture: THREE.CubeTexture): THREE.Mesh {
  const cubeShader = THREE.ShaderLib[ 'cube' ];
  cubeShader.uniforms[ 'tCube' ].value = skybox_texture;
  const skyBoxMaterial = new THREE.ShaderMaterial({
    fragmentShader: cubeShader.fragmentShader,
    vertexShader: cubeShader.vertexShader,
    uniforms: cubeShader.uniforms,
    depthWrite: false,
    side: THREE.BackSide
  });
  // BoxGeometry(width, height, depth, widthSegments, heightSegments, depthSegments)
  const skybox = new THREE.Mesh( new THREE.BoxGeometry( 3000, 3000, 3000, 1, 1, 1 ), skyBoxMaterial);
  return skybox;
}

/**
 * 半径 1 の球体を想定
 * @param longitude - 経度 rad
 * @param latitude - 緯度 rad
 * @return [x, y]
 */
export function sphere2Mercator(longitude: Radian, latitude: Radian): [number, number]{
  const x = longitude;
  const y = Math.log(Math.tan(Math.PI/4 + latitude/2))
  return [x, y];
}
/**
 * 半径 1 の球体を想定
 * @param x
 * @param y
 * @return [longitude, latitude]
 */
export function mercator2Sphere(x: number, y: number): [Radian, Radian]{
  const longitude = x;
  const latitude = Math.asin(Math.tanh(y));
  return [longitude, latitude];
}

/**
 * 縦横 2 の正方形な魚眼画像から
 * 半径 1 の上半球極座標へ射影(up)
 * @param x ∈ [-1, 1]
 * @param y ∈ [-1, 1]
 * @return [longitude, latitude] - Spherical coordinates
 */
export function fisheye2Sphere(x: number, y: number, r=1): [Radian, Radian] | null {
  const [cx, cy] = [1, 1];
  [x, y] = [x-cx, y-cy];
  const [theta, l] = [Math.atan2(y, x), Math.sqrt(x*x + y*y)]; // Cartesian to Euler
  if(l >= 1){ return null; }
  const [longitude, latitude] = [theta, Math.acos(l/r)];
  return [longitude, latitude];
}

/**
 * 半径 1 の上半球極座標から
 * 縦横 2 の原点を中心とした正方形座標へ射影(down)
 * @param longitude - Spherical coordinates
 * @param latitude - Spherical coordinates
 * @return [x, y] ∈ [-1, 1]
 */
export function sphere2Fisheye(longitude: Radian, latitude: Radian, r=1): [number, number]{
  const [theta, l] = [longitude, r*Math.cos(latitude)];
  const [x, y] = [l*Math.cos(theta), l*Math.sin(theta)];
  return [x, y];
}

/**
 * @param alpha - 右手座標系 z 軸こっち向いて左まわり Euler angles
 * @param beta - 右手座標系 x 軸こっち向いて左まわり Euler angles
 * @param gamma - 右手座標系 y 軸こっち向いて左まわり Euler angles
 */
export function rotate(alpha: Radian, beta: Radian, gamma: Radian){

}
export type Radian    = number;


