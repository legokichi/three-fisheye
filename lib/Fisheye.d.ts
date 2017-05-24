/// <reference types="three" />
import * as THREE from "three";
export declare abstract class Fisheye<Camera extends THREE.Camera> {
    /**
      * gl canvas
      */
    readonly canvas: HTMLCanvasElement;
    /**
     * three
     */
    readonly camera: Camera;
    protected readonly renderer: THREE.WebGLRenderer;
    protected readonly scene: THREE.Scene;
    private skybox;
    private skyboxtex;
    /**
     * ソース魚眼をクリッピングしたテクスチャ
     */
    readonly texctx: CanvasRenderingContext2D;
    /** 変換元の魚眼 */
    private source;
    /** 2のn乗になるテクスチャの大きさのnの値 */
    private exponent;
    /**
     * 2のn乗になるテクスチャの大きさのnの値
     * 書き換えたら this.resize(); すること
     */
    defaultExponent: number | null;
    /** 正方形テクスチャから切り取る領域 */
    protected region: {
        centerX: number;
        centerY: number;
        radius: number;
    };
    /**
     * ```js
     * ctx.drawImage(video,
     *   sx, sy, sw, sh,
     *   dx, dy, dw, dh
     * );```
     */
    protected pos: [number, number, number, number, number, number, number, number];
    debug: boolean;
    constructor(camera: Camera, o?: {
        textureSizeExponent?: number;
        mesh?: number;
        debug?: boolean;
    });
    /**
     * @param source - 変換元の魚眼何かを変更
     */
    src: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | null;
    centerX: number;
    centerY: number;
    radius: number;
    /**
     * 魚眼の円の位置を調整する
     */
    fisheyeRegion: {
        centerX: number;
        centerY: number;
        radius: number;
    };
    width: number;
    height: number;
    /**
     * 現在のレンダラを現在のピクセルサイズに最適化する
     */
    canvasSize: {
        width: number;
        height: number;
    };
    destructor(): void;
    abstract render(): void;
    abstract drag(type: "start" | "move", offsetX: number, offsetY: number): any;
    protected abstract load(): void;
    protected abstract unload(): void;
    /**
     * cam.src の size にテクスチャを合わせる
     */
    resize(): void;
    /**
   * 魚眼クリッピング領域の計算
   */
    protected updateFisheyeRegion(): void;
}
export declare function load_skybox_texture(path?: string): Promise<THREE.CubeTexture>;
export declare function createSkyboxMesh(skybox_texture: THREE.CubeTexture): THREE.Mesh;
/**
 * 半径 1 の球体を想定
 * @param longitude - 経度 rad
 * @param latitude - 緯度 rad
 * @return [x, y]
 */
export declare function sphere2Mercator(longitude: Radian, latitude: Radian): [number, number];
/**
 * 半径 1 の球体を想定
 * @param x
 * @param y
 * @return [longitude, latitude]
 */
export declare function mercator2Sphere(x: number, y: number): [Radian, Radian];
/**
 * 縦横 2 の正方形な魚眼画像から
 * 半径 1 の上半球極座標へ射影(up)
 * @param x ∈ [-1, 1]
 * @param y ∈ [-1, 1]
 * @return [longitude, latitude] - Spherical coordinates
 */
export declare function fisheye2Sphere(x: number, y: number, r?: number): [Radian, Radian] | null;
/**
 * 半径 1 の上半球極座標から
 * 縦横 2 の原点を中心とした正方形座標へ射影(down)
 * @param longitude - Spherical coordinates
 * @param latitude - Spherical coordinates
 * @return [x, y] ∈ [-1, 1]
 */
export declare function sphere2Fisheye(longitude: Radian, latitude: Radian, r?: number): [number, number];
/**
 * @param alpha - 右手座標系 z 軸こっち向いて左まわり Euler angles
 * @param beta - 右手座標系 x 軸こっち向いて左まわり Euler angles
 * @param gamma - 右手座標系 y 軸こっち向いて左まわり Euler angles
 */
export declare function rotate(alpha: Radian, beta: Radian, gamma: Radian): void;
export declare type Radian = number;
/**
 * 円筒テクスチャを魚眼画像に変換するときに使う。
 */
export declare function fisheye2equirectangular(x: number, y: number): [number, number];
