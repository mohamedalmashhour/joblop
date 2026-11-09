import * as DocumentPicker from "expo-document-picker";
import { PICKER_TYPES } from "./documentsContent";

export type PickedFile = Readonly<{ name: string; mimeType: string | null; size: number | null; dataBase64: string }>;

// Let the worker choose one file from the phone (Files, Photos or Drive), then read it as base64 for
// the upload. Nothing leaves the phone until the worker taps "Upload document". Null = cancelled.
export async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: [...PICKER_TYPES], multiple: false, copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const blob: Blob = asset.file ?? (await (await fetch(asset.uri)).blob());
  const dataBase64 = await blobToBase64(blob);
  return { name: asset.name, mimeType: asset.mimeType ?? null, size: asset.size ?? blob.size ?? null, dataBase64 };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}
