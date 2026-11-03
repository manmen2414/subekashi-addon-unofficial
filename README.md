# 全て歌詞の所為です。Chrome拡張機能
YouTubeの再生ページから、その動画の曲が[全て歌詞の所為です。](https://lyrics.imicomweb.com)に登録されているかを確認し、曲の情報の閲覧や登録ができる拡張機能です。

## インストール方法
1. Chromeのデベロッパーモードを有効化する。  
![dev-mode](https://github.com/user-attachments/assets/d95565dc-9348-4a6c-b7a1-f71b60c8a344)

2. `git clone https://github.com/izumin2000/subekashi-addon-unofficial`でcloneする。またはZIPファイルをダウンロードして展開する。
3. Chromeの「パッケージ化されていない拡張機能を読み込む」ボタンから、プロジェクトのルートフォルダを選択する。
4. 「全て歌詞の所為です。拡張機能」が表示されたらインストール完了。
   
> [!WARNING]
> デフォルトでは、`https://lyrics.imicomweb.com`を参照しています。  
> 自分の環境のすべかしを用いる場合、`src/config.js`を以下のように書き換えてください。
> ```diff
> - const LOCALHOST = false;
> + const LOCALHOST = true;
> ```

## 機能・利用方法
### 曲の表示
![showing](https://github.com/user-attachments/assets/6133cc31-9c5c-4ab5-ab14-398e2d7fbc58)  
<sub>画像表示に全て玉響の所為です。さんの[玉響](https://www.youtube.com/watch?v=_s12twdYLlw)を用いています</sub>

拡張機能のボタンをクリックすることで、Youtubeから直接、タグや模倣状況、歌詞の確認が可能です。

### YouTube上のボタン
YouTubeの再生ページ(`youtube.com/watch`)を開くと、画面右下に曲の掲載状況を示すボタンが表示されます。`youtu.be`のリンクはYouTubeの再生ページに転送されるため、同じように表示されます。ShortsやライブのURLは対象外です。

| 色 | 状態 | クリックしたとき |
| --- | --- | --- |
| 灰色 | 読み込み中、または取得に失敗した | 取得に失敗した場合は再取得する |
| 緑色 | すべかしに登録されている | 拡張機能のボタンをクリックしたときと同じ画面を表示する |
| 赤色 | すべかしに登録されていない | 曲の登録画面を開く |

このボタンは、拡張機能のメニュー下部の「YouTubeの右下にボタンを表示する」から非表示にできます。

### 曲の登録
![registering](https://github.com/user-attachments/assets/72c522a5-faed-4999-9f3f-ae39625928c1)  
登録されていない曲は、登録ボタンをクリックすることでそのまま登録画面まで移動することが可能です。

## コントリビューション
主にissueの起票・対応をやっていただけると嬉しいです。  
機能追加・バグ・質問点がありましたらissueに起票をお願いします。  
プルリクエストには原則2週間以内に対応します。  
commit時は`[Add] 概要` `[Fix] 概要`のように変更種別と概要を記したタイトルをつけていただけると幸いです。

## ライセンス
このプロジェクトにはMIT Licenceが適用されています。
LICENSE内の作者表記を維持することを条件に、自由に改変・再配布が可能です。

## クレジット
本ソフトでは表示フォントに「源全角ゴ改」(https://drive.google.com/drive/folders/19WidrJoCmI5qLJV-eR_ydURIwxB2-DS) を使用しています。 Licensed under SIL Open Font License 1.1 http://scripts.sil.org/OFL © 2021 全て語り手の所為です。