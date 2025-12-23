interface SongJson {
  id: number;
  title: string;
  channel: string;
  url: string;
  lyrics: string;
  imitate: string;
  imitated: string;
  post_time: string;
  upload_time: string;
  isoriginal: boolean;
  isjoke: boolean;
  isdeleted: boolean;
  isdraft: boolean;
  isinst: boolean;
  issubeana: boolean;
  isspecial: boolean;
  islock: boolean;
  view: number;
  like: number;
  category: "song";
}
