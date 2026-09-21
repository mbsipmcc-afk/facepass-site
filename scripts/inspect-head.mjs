import { NodeIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({ "draco3d.decoder": await draco3d.createDecoderModule() });

const doc = await io.read(join(root, "tmp-head", "head.glb"));
const scene = doc.getRoot().listScenes()[0];
const walk = (node, depth) => {
  const mesh = node.getMesh();
  let info = "";
  if (mesh) {
    const prims = mesh.listPrimitives().map((p) => {
      const pos = p.getAttribute("POSITION");
      const nrm = p.getAttribute("NORMAL");
      const idx = p.getIndices();
      return `${pos?.getCount() ?? 0}v/${idx ? idx.getCount() / 3 : 0}t n=${!!nrm}`;
    });
    info = ` mesh="${mesh.getName()}" prims=[${prims.join(", ")}]`;
  }
  console.log("  ".repeat(depth) + `node="${node.getName()}"${info}`);
  for (const child of node.listChildren()) walk(child, depth + 1);
};
for (const child of scene.listChildren()) walk(child, 0);
