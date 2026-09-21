// Inspect the head GLB: nodes, meshes, primitives, bboxes — to find the mouth-region mesh.
import { NodeIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({ "draco3d.decoder": await draco3d.createDecoderModule() });

const doc = await io.read(join(root, "tmp-head", "head.glb"));
const root3d = doc.getRoot();

console.log("— nodes —");
for (const node of root3d.listNodes()) {
  console.log(`node "${node.getName()}" mesh=${node.getMesh()?.getName() ?? "none"}`);
}

console.log("— meshes —");
for (const mesh of root3d.listMeshes()) {
  console.log(`mesh "${mesh.getName()}"`);
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute("POSITION");
    const mode = prim.getMode();
    const stats = [];
    for (const sem of ["POSITION", "NORMAL", "TEXCOORD_0"]) {
      const attr = prim.getAttribute(sem);
      if (attr) stats.push(`${sem}:${attr.getCount()}`);
    }
    let min = null, max = null;
    if (pos) {
      min = [Infinity, Infinity, Infinity];
      max = [-Infinity, -Infinity, -Infinity];
      const arr = pos.getArray();
      for (let i = 0; i < arr.length; i += 3) {
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k], arr[i + k]);
          max[k] = Math.max(max[k], arr[i + k]);
        }
      }
    }
    console.log(
      `  prim mode=${mode} ${stats.join(" ")} bbox=[${min?.map((v) => v.toFixed(1))}]..[${max?.map((v) => v.toFixed(1))}] material="${prim.getMaterial()?.getName() ?? "none"}"`,
    );
  }
}

console.log("— materials —");
for (const mat of root3d.listMaterials()) {
  console.log(`material "${mat.getName()}"`);
}
