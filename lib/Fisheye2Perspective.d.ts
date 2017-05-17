/// <reference types="three" />
import * as THREE from "three";
import { Fisheye, Radian } from "./Fisheye";
export interface CameraConfig {
    region: FishEyeRegion;
    direction: DirectionOfView;
    zoom: number;
}
export declare type Pixel = number;
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
export declare class Fisheye2Perspective extends Fisheye<THREE.PerspectiveCamera> {
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
    readonly collisionSphere: THREE.Mesh;
    /** load 前 === src 変更前に書き換えてね */
    protected mesh_num: number;
    private meshes;
    private texis;
    private readonly local;
    readonly CAMERA_PITCH_MAX: number;
    readonly CAMERA_PITCH_MIN: number;
    readonly debug: boolean;
    private prevEuler;
    constructor(o?: {
        textureSizeExponent?: number;
        mesh?: number;
        sep_mode?: boolean;
        debug?: boolean;
    });
    destructor(): void;
    /**
     * 描画する
     * needsUpdate して render
     */
    render(): void;
    pitch: Radian;
    private _yaw;
    yaw: Radian;
    cameraPose: DirectionOfView;
    zoom: number;
    /**
     * 画面情報
     */
    config: CameraConfig;
    protected updateFisheyeRegion(): void;
    /**
   * 以前のリソースを消す
   */
    protected unload(): void;
    /**
     * リソースの置き換え
     */
    protected load(): void;
    drag(type: "start" | "move", offsetX: number, offsetY: number): void;
}
