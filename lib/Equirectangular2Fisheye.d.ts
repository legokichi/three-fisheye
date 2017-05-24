/// <reference types="three" />
import * as THREE from "three";
import { Fisheye } from "./Fisheye";
export declare class Equirectangular2Fisheye extends Fisheye<THREE.OrthographicCamera> {
    protected mesh_num: number;
    private meshes;
    private texis;
    constructor(o?: {});
    render(): void;
    protected load(): void;
    protected unload(): void;
    drag(type: "start" | "move", offsetX: number, offsetY: number): void;
}
export declare function createFisheyeMesh(tex: THREE.Texture, R1_ratio?: number, R2_ratio?: number): THREE.Mesh;
