// 画面で使う写真（ぱくたそ https://www.pakutaso.com/ ）。再配布が禁止のため GitHub には上げず、公開先にだけ上げる。
// 人物の写真は場面のイメージとしてだけ使う（特定の弁護士として紹介しない）
import type { Category } from "./data";

export type Photo = { src: string; alt: string };
const p = (file: string, alt: string): Photo => ({ src: `/photos/${file}.jpg`, alt });

export const PHOTOS = {
  gavel: p("gavel", "木槌"),
  matrix: p("matrix", "暗い画面を流れるデジタルのコード"),
  hacker: p("hacker", "セキュリティの穴をつくハッカーのイメージ"),
  cyberRed: p("cyber-red", "赤く光るデジタルのコード"),
  phone: p("phone", "スマートフォンを確認するビジネスパーソン"),
  newspaper: p("newspaper", "新聞を読むビジネスパーソン"),
  meetingRoom: p("meeting-room", "大きな窓のある会議室"),
  building: p("building", "ガラス張りのオフィスビル"),
  notePc: p("notepc", "ノートパソコンを見ながらメモを取るビジネスパーソン"),
  contract: p("contract", "契約書を確認する様子"),
  consult: p("consult", "資料を見ながら打ち合わせをする2人"),
  deskDocs: p("desk-docs", "書類が置かれた机"),
  payment: p("payment", "店舗に貼られた電子決済のステッカー"),
  laptop: p("laptop-cafe", "木のテーブルの上のノートパソコン"),
  mynumber: p("mynumber", "スマートフォンとカード"),
} satisfies Record<string, Photo>;

export const CATEGORY_PHOTO: Record<Category, Photo> = { leak: PHOTOS.mynumber, cyber: PHOTOS.hacker, consumer: PHOTOS.payment };
/** 事件ごとの写真（分類の写真を基本に、事件ごとに少し変える） */
export const INCIDENT_PHOTO: Record<string, Photo> = {
  ミドリ通販: PHOTOS.mynumber,
  青葉学習塾: PHOTOS.deskDocs,
  ひかり保険代理店: PHOTOS.notePc,
  東和精工: PHOTOS.matrix,
  まちの電力: PHOTOS.cyberRed,
  北斗旅行: PHOTOS.hacker,
  スマイル美容: PHOTOS.phone,
  ゴールド投資サロン: PHOTOS.payment,
};
export const incidentPhoto = (company: string, cat: Category) => INCIDENT_PHOTO[company] ?? CATEGORY_PHOTO[cat];
export const PHOTO_CREDIT = "写真：ぱくたそ（www.pakutaso.com）";
