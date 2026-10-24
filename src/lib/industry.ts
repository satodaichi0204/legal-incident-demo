// 業種の設定。共通の部品（収集、AI の処理、ページの生成、事業者ごとの設定、認証、承認、通知）はそのままで、
// この設定を差し替えるだけで、ほかの業種に転用できるようにする（このデモで動いているのは「法律事務所」）。
export type Industry = {
  id: string;
  name: string;
  business: string;
  approver: string;
  categories: string[];
  sources: string[];
  checks: string[];
  required: string[];
  pageWords: string;
  active?: boolean;
};

export const INDUSTRIES: Industry[] = [
  {
    id: "legal",
    name: "法律事務所",
    business: "法律事務所",
    approver: "弁護士",
    categories: ["個人情報の漏えい", "サイバー攻撃", "消費者被害"],
    sources: ["企業の公式の発表", "ニュース"],
    checks: ["断定的な表現（必ず、全額取り戻せる）", "誇大な表現（日本一、No.1）", "条件のない「無料」", "個人の情報"],
    required: ["事務所名", "弁護士の氏名と所属の弁護士会", "費用の条件"],
    pageWords: "事件の概要、時系列、一次情報、弁護士へのご相談",
    active: true,
  },
  {
    id: "reform",
    name: "リフォーム業",
    business: "工務店・リフォーム会社",
    approver: "建築士・責任者",
    categories: ["台風・地震の被害", "製品のリコール", "補助金の公募"],
    sources: ["自治体の発表", "メーカーのリコール情報", "気象の情報"],
    checks: ["誇大な表現（地域一番、最安）", "不安をあおる表現（今すぐ直さないと危険）", "補助金を確約する表現"],
    required: ["会社名", "建設業の許可番号", "見積もりの条件"],
    pageWords: "被害の概要、受付の期限、補助金の条件、無料点検のご案内",
  },
  {
    id: "resign",
    name: "退職代行",
    business: "退職代行の事業者",
    approver: "責任者（法的な交渉は提携の弁護士）",
    categories: ["労働の法令の改正", "企業の未払いの報道", "ハラスメントの報道"],
    sources: ["厚生労働省の発表", "ニュース"],
    checks: ["非弁行為と受け取られる表現（会社と交渉します）", "結果を約束する表現（必ず退職できます）"],
    required: ["運営会社名", "料金と追加費用の条件", "弁護士が対応する範囲"],
    pageWords: "制度の変更点、相談の窓口、ご利用の流れ",
  },
];
