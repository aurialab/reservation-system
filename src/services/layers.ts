import {
  type LayerRecord,
  listLayers as listLayerRecords
} from "../repositories/layers";

export type Layer = {
  latitude: number;
  longitude: number;
  zone: string;
};

function toLayer(record: LayerRecord): Layer {
  return {
    latitude: record.latitude,
    longitude: record.longitude,
    zone: record.zone
  };
}

export async function listLayers(): Promise<Layer[]> {
  const layers = await listLayerRecords();
  return layers.map(toLayer);
}
