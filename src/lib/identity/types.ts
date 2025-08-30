export interface OrdinalDetail {
  name: string;
  archetype_name: string;
  comp: string;
  background: string;
  skin: string;
  helmet: string;
  jacket: string;
  image_200_url: string;
  image_200_jpeg_url: string;
  image_400_url: string;
  image_400_jpeg_url: string;
  image_1024_url: string;
  image_1024_jpeg_url: string;
  image_2048_url: string;
  image_2048_jpeg_url: string;
  image_pixalated_url: string;
  mp4_url: string;
}

export interface OrdinalApiResponse {
  has_operators: boolean;
  error_message: string;
  data: OrdinalDetail[];
}
