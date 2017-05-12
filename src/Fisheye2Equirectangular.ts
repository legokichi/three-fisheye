import * as THREE from "three";
import {Fisheye} from "./Fisheye";    

export class Fisheye2Equirectangular extends Fisheye<THREE.OrthographicCamera> {

  constructor(o?: {}){
    // left, right, top, bottom, near, far
    const camera = new THREE.OrthographicCamera(600/-2, 600/2, 400/2, 400/-2, 1, 10000);
    camera.position.z = 0.01;
    super(camera, o);
  }
  render(): void {

  }
  drag(type: "start" | "move", offsetX: number, offsetY: number) {

  }
  load(): void {}
  unload(): void {}
  

  start_draw_fisheye_images(meshes, step){ // void
    // 静止画の場合
    const {scene, camera, renderer} = this;
  
    const tasks = meshes.map((mesh)=> (next)=>{
      scene.add(mesh);

      // 画角初期化
      updateAngleOfView(camera, renderer, mesh);
      
      renderer.render(scene, camera); // 撮影

      step(renderer.domElement, next);

    });

    // レンダリングループ
    let i = 0;
    function recur(){
      tasks[i++ % tasks.length](recur);
    }

    recur();
  }

  start_draw_fisheye_video(mesh, step){
    // 動画の場合

    const {scene, camera, renderer, stats} = this;
    
    scene.add(mesh);


    // 画角初期化
    updateAngleOfView(camera, renderer, mesh);


    // レンダリングループ
    //let detectiong = false;
    function _loop(){
      // レンダリング
      renderer.render(scene, camera);

      step(renderer.domElement);

      //requestAnimationFrame(_loop);
      setTimeout(_loop, 30);
    }

    requestAnimationFrame(_loop);
  }
}







export function load_video_texture(url) {
  return load_video(url).then((video)=>{
    video.loop = true;
    video.play();
    return new THREE.VideoTexture( video );
  });
}

export function load_skybox_texture(urls){
  return new Promise((resolve, reject)=>{
    const loader = new THREE.CubeTextureLoader();
    loader.setPath(urls);
    loader.load( [
      'px.jpg', 'nx.jpg',
      'py.jpg', 'ny.jpg',
      'pz.jpg', 'nz.jpg'
    ], resolve, (xhr) => {}, reject );
  });
}

export function calculate_clip_size(width, height, margin=0){
  const min = Math.min(width, height);
  const max = Math.max(width, height);
  for(var i=0; min > Math.pow(2, i); i++); // 2^n の大きさを得る
  let pow = Math.pow(2, i-1);
  const [dx, dy, dw, dh] = [0, 0, pow, pow]; // 縮小先の大きさ
  const [sx, sy, sw, sh] = width < height ? [0-margin, (max/2)-(min/2)-margin, min+margin*2, min+margin*2] // ソースのクリッピング領域
                                          : [(max/2)-(min/2)-margin, 0-margin, min+margin*2, min+margin*2];
  console.log(`fisheye size: ${pow}x${pow}`);
  return {sx, sy, sw, sh, dx, dy, dw, dh};
}

export function load_fisheye_image_canvas_texture(url, margin=0){
  return load_image(url).then((img)=>{
    const cnv = document.createElement("canvas");
    const ctx = cnv.getContext("2d");
    const {width, height} = img;
    const {sx, sy, sw, sh, dx, dy, dw, dh} = calculate_clip_size(width, height, margin);
    const [_dw, _dh] = [2*dw, 2*dh]; // 静止画はアップサイジング
    [cnv.width, cnv.height] = [_dw, _dh];
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, _dw, _dh);
    const tex = new THREE.Texture(cnv);
    tex.needsUpdate = true;
    return tex;
  });
}

export function load_fisheye_video_url_canvas_texture(url, margin=0){
  return load_video(url).then((video)=>{
    video.loop = true;
    video.play();
    return load_fisheye_video_canvas_texture(video, margin);
  });
}

export function load_fisheye_video_canvas_texture(video, margin=0){
  const cnv = document.createElement("canvas");
  const ctx = cnv.getContext("2d");
  const {videoWidth, videoHeight} = video;
  const {sx, sy, sw, sh, dx, dy, dw, dh} = calculate_clip_size(videoWidth, videoHeight, margin);
  [cnv.width, cnv.height] = [dw, dh];
  let paused = false;
  video.addEventListener("playing", (ev)=>{ paused = false; requestAnimationFrame(_draw) });
  video.addEventListener("pause", (ev)=>{ paused = true; });
  video.addEventListener("ended", (ev)=>{ paused = true; });
  const tex = new THREE.Texture(cnv);
  function _draw(){
    cnv.width = cnv.width;
    ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
    tex.needsUpdate = true;
    if(!paused) requestAnimationFrame(_draw);
  }
  _draw(); // clipping draw loop start
  return Promise.resolve(tex);
}

export function createSkyboxMesh(skybox_texture){
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

export function createFisheyeMesh(fisheye_texture){ // 正方形テクスチャを仮定
  // SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength)
  const 球体 = new THREE.SphereGeometry(800, 16, 16, 0, Math.PI);
  const {vertices, faces, faceVertexUvs} = 球体;
  const radius = 球体.boundingSphere.radius;
  // 半球の正射影をとる
  faces.forEach((face, i)=>{
    const {a, b, c} = face;
    faceVertexUvs[0][i] = [a, b, c].map((id)=>{
      const {x, y} = vertices[id];
      return new THREE.Vector2(
        (x+radius)/(2*radius),
        (y+radius)/(2*radius));
    });
  });
  const mat = new THREE.MeshBasicMaterial( { color: 0xFFFFFF, map: fisheye_texture, side: THREE.BackSide } );
  const 完全な白い球体 = new THREE.Mesh(球体, mat);
  完全な白い球体.rotation.x = Math.PI*3/2; // 北緯側の半球になるように回転
  return 完全な白い球体;
}

export function createPanoramaMesh(panorama_width=0, R1_ratio=0, R2_ratio=1){
  //const panorama_width = 400; パノラマ板ポリの空間上の横幅、デフォルトはR2の円周の長さ
  //const R1_ratio = 0; // 扇型の下弦 0~1
  //const R2_ratio = 1; // 扇型の上弦 0~1 下弦 < 上弦
  return function _createPanoramaMesh(fisheye_texture){ // 正方形テクスチャを仮定
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
  };
}



export function updateAngleOfView(camera, renderer, mesh){
  if(camera instanceof THREE.PerspectiveCamera){
    // 普通のカメラ
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }else if(camera instanceof THREE.OrthographicCamera && mesh instanceof THREE.Mesh && mesh.geometry instanceof THREE.PlaneGeometry){
    // 並行投影 + クリッピング
    const {width, height} = mesh.geometry.parameters;
    camera.left = width/-2;
    camera.right = width/2;
    camera.top = height/2;
    camera.bottom = height/-2;
    camera.updateProjectionMatrix();
    renderer.setSize( width, height );
  }else if(camera instanceof THREE.OrthographicCamera){
    // 単純並行投影
    camera.left = window.innerWidth/-2;
    camera.right = window.innerWidth/2;
    camera.top = window.innerHeight/2;
    camera.bottom = window.innerHeight/-2;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }
}




export function get_image_resources(
  srcs = [
    "2001Z_01.jpg",
    "2001Z_02.jpg",
    "2001Z_03.jpg",
    "2001Z_04.jpg",
    "2001Z_05.jpg",
    "2001Z_06.jpg",
    "2001Z_07.jpg",
    "2001Z_08.jpg",
    "2001Z_09.jpg",
    "2001Z_10.jpg",
    "2001Z_11.jpg",
    "2001Z_12.jpg",
    "2001Z_13.jpg",
    "2001Z_14.jpg",
    "2001Z_15.jpg",
    "2001Z_16.jpg",
    "2016Z_01.jpg",
    "2016Z_02.jpg",
    "2016Z_03.jpg",
    "2016Z_04.jpg",
    "2016Z_05.jpg",
    "2016Z_06.jpg",
    "2016Z_07.jpg",
    "2016-10-18-16.29.01.png",
    "2016-10-03-205213.jpg",
    "2016-10-03-205226.jpg",
    "2016-10-11-153914.jpg",
    "2016-10-11-153935.jpg",
    "2016-10-11-153953.jpg",
    "2016-10-11-154005.jpg",
    "2016-10-11-154013.jpg",
    "2016-10-11-154021.jpg",
    "2016-10-11-154033.jpg",
    "2016-10-11-154039.jpg",
    "2016-10-11-154046.jpg",
    "2016-10-11-154055.jpg",
    "2016-10-11-154109.jpg",
    "2016-10-11-154121.jpg",
    "2016-10-11-154127.jpg",
    "2016-10-11-154140.jpg",
    "2016-10-11-154150.jpg",
    "2016-10-18-123734.jpg",
    "2016-10-18-123740.jpg",
    "2016-10-18-123748.jpg",
    "2016-10-18-123754.jpg",
    "2016-10-18-123904.jpg",
    "2016-10-18-123938.jpg"
  ]
){
  const prms = srcs.map((src)=> load_fisheye_image_canvas_texture(src, 100).then(createPanoramaMesh(1200)) );
  return Promise.all(prms);
}

export function get_video_url_resource(
  webm = "2016-10-20-192906.webm"
){
  //const webm = "2016-10-03-195323.webm";
  //const webm = "2016-10-18-120852.webm";
  //const webm = "2016-10-18-123529.webm";
  //const webm = "2016-10-20-192906.webm";
  //const webm = "2016-10-20-193126.webm";
  return load_fisheye_video_url_canvas_texture(webm, 100).then(createPanoramaMesh(1200)); // 魚眼動画 → パノラマ板ポリの空間上の横幅、デフォルトはR2の円周の長さ
}

export function get_video_resource(video){
  return load_fisheye_video_canvas_texture(video, 100).then(createPanoramaMesh(1200));
}

export function get_camera_resources(stream){
  return load_fisheye_video_url_canvas_texture(URL.createObjectURL(stream), 100).then(createPanoramaMesh(1200));
}



