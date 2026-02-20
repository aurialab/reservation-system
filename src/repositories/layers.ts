import prisma from "../prisma/client";

export type LayerRecord = {
  id: number;
  latitude: number;
  longitude: number;
  zone: string;
};

export async function listLayers(): Promise<LayerRecord[]> {
  return prisma.layer.findMany({ orderBy: { id: "asc" } });
}
