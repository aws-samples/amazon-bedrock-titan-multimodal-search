export type ProductType = {
  multimodal_vector?: number[];
  image_class: string;
  image_url: string;
  image_brand: string;
  image_path?: string;
  image_product_description: string;
}

export type InputJsonType = {
  class_label: string;
  image_url: string;
  brand: string;
  image_path: string;
  product_title: string;
}

export type EmbeddingErrorType = {
  image_path: string;
  error: string;
}