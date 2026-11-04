interface SongJson {
  id: number;
  title: string;
  authors: { id: number; name: string }[];
  url: string[];
  lyrics: string;
  imitates: number[];
  imitateds: number[];
  prush: string | null;
  post_time: string;
  upload_time: string | null;
  is_original: boolean;
  is_joke: boolean;
  is_deleted: boolean;
  is_draft: boolean;
  is_inst: boolean;
  is_subeana: boolean;
  is_special: boolean;
  is_lock: boolean;
  is_limited: boolean;
  is_questionable: boolean;
  view: number | null;
  like: number | null;
  category: string;
}
