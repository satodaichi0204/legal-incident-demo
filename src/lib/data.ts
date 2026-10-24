// 架空のデータ。企業、事件、法律事務所、弁護士、ニュースサイトはすべて架空。実在のサイトにはアクセスしない。

export type Category = "leak" | "cyber" | "consumer";
export const CATEGORY_LABEL: Record<Category, string> = { leak: "個人情報の漏えい", cyber: "サイバー攻撃", consumer: "消費者被害" };

export type SourceKind = "press" | "news";
export type Source = { id: string; name: string; kind: SourceKind; url: string; failsOnRun?: number };

export const SOURCES: Source[] = [
  { id: "s-midori", name: "ミドリ通販（架空） お知らせ", kind: "press", url: "https://midori-tsuhan.example/news" },
  { id: "s-towa", name: "東和精工（架空） ニュースリリース", kind: "press", url: "https://towa-seiko.example/ir" },
  { id: "s-hokuto", name: "北斗旅行（架空） 重要なお知らせ", kind: "press", url: "https://hokuto-travel.example/info" },
  { id: "n-keizai", name: "日本経済ニュース（架空）", kind: "news", url: "https://keizai-news.example/rss" },
  { id: "n-tech", name: "テックウォッチ（架空）", kind: "news", url: "https://techwatch.example/feed" },
  // 1回目の収集では、わざと取得に失敗する（通知の見本）
  { id: "n-kurashi", name: "くらしの消費者ニュース（架空）", kind: "news", url: "https://kurashi-news.example/rss", failsOnRun: 1 },
];

export type Article = {
  id: string;
  sourceId: string;
  date: string;
  company: string;
  category: Category;
  title: string;
  text: string;
  url: string;
  /** この回の収集から取れる（続報など） */
  availableFromRun: number;
};

export const ARTICLES: Article[] = [
  { id: "a1", sourceId: "s-midori", date: "2026-09-28", company: "ミドリ通販", category: "leak", availableFromRun: 1, url: "https://midori-tsuhan.example/news/20260928", title: "不正アクセスによるお客様情報流出の可能性に関するお知らせ", text: "株式会社ミドリ通販（架空）は2026年9月28日、同社の通販サイトが第三者による不正アクセスを受け、会員の氏名、住所、電話番号など約12万件が流出した可能性があると発表した。クレジットカード情報は含まれていないとしている。" },
  { id: "a2", sourceId: "n-keizai", date: "2026-09-29", company: "ミドリ通販", category: "leak", availableFromRun: 1, url: "https://keizai-news.example/2026/09/29/midori", title: "ミドリ通販（架空）、会員情報約12万件が流出の恐れ", text: "通販大手のミドリ通販（架空）は、会員の個人情報約12万件が外部に流出した可能性があると明らかにした。同社は外部の専門家と調査を進めている。" },
  { id: "a3", sourceId: "s-midori", date: "2026-10-20", company: "ミドリ通販", category: "leak", availableFromRun: 2, url: "https://midori-tsuhan.example/news/20261020", title: "不正アクセスに関する調査結果について（第2報）", text: "株式会社ミドリ通販（架空）は2026年10月20日、調査の結果、流出の可能性がある会員情報は約18万件に増えたと発表した。対象の会員には個別に連絡するとしている。" },
  { id: "a4", sourceId: "n-tech", date: "2026-10-02", company: "青葉学習塾", category: "leak", availableFromRun: 1, url: "https://techwatch.example/2026/10/02/aoba", title: "青葉学習塾（架空）、生徒情報入りUSBメモリを紛失", text: "学習塾を運営する青葉学習塾（架空）は10月2日、生徒と保護者の氏名、電話番号など約3,200件を保存したUSBメモリを紛失したと発表した。現時点で不正な利用は確認されていないという。" },
  { id: "a5", sourceId: "n-keizai", date: "2026-10-08", company: "ひかり保険代理店", category: "leak", availableFromRun: 1, url: "https://keizai-news.example/2026/10/08/hikari", title: "ひかり保険代理店（架空）、顧客情報を誤送信", text: "ひかり保険代理店（架空）は10月8日、顧客約450人分の氏名と契約内容を記載したファイルを、誤って別の取引先にメールで送信したと発表した。" },
  { id: "a6", sourceId: "s-towa", date: "2026-10-05", company: "東和精工", category: "cyber", availableFromRun: 1, url: "https://towa-seiko.example/ir/20261005", title: "ランサムウェア被害の発生について", text: "東和精工株式会社（架空）は2026年10月5日、社内のサーバーがランサムウェアに感染し、一部の工場で生産を停止していると発表した。取引先の情報が含まれていた可能性についても調査している。" },
  { id: "a7", sourceId: "n-tech", date: "2026-10-06", company: "東和精工", category: "cyber", availableFromRun: 1, url: "https://techwatch.example/2026/10/06/towa", title: "東和精工（架空）にランサムウェア攻撃、工場の生産停止", text: "部品メーカーの東和精工（架空）が、ランサムウェアによる攻撃を受け、一部の工場で生産を停止した。同社は警察に相談しているという。" },
  { id: "a8", sourceId: "n-tech", date: "2026-10-12", company: "まちの電力", category: "cyber", availableFromRun: 1, url: "https://techwatch.example/2026/10/12/machi", title: "まちの電力（架空）、会員サイトに不正ログイン", text: "電力小売りのまちの電力（架空）は10月12日、会員サイトに外部から不正なログインがあり、約2,100件の会員のポイントが不正に使われたと発表した。" },
  { id: "a9", sourceId: "s-hokuto", date: "2026-10-14", company: "北斗旅行", category: "cyber", availableFromRun: 1, url: "https://hokuto-travel.example/info/20261014", title: "当社予約サイトの改ざんとカード情報流出の可能性について", text: "北斗旅行株式会社（架空）は2026年10月14日、予約サイトが改ざんされ、利用者のクレジットカード情報約6,500件が流出した可能性があると発表した。" },
  { id: "a10", sourceId: "n-kurashi", date: "2026-10-10", company: "スマイル美容", category: "consumer", availableFromRun: 1, url: "https://kurashi-news.example/2026/10/10/smile", title: "「いつでも解約できる」はずが…美容サプリの定期購入で相談急増", text: "美容サプリを販売するスマイル美容（架空）の定期購入をめぐり、「解約の電話がつながらない」などの相談が、各地の消費生活センターに約300件寄せられている。" },
  { id: "a11", sourceId: "n-kurashi", date: "2026-10-15", company: "ゴールド投資サロン", category: "consumer", availableFromRun: 1, url: "https://kurashi-news.example/2026/10/15/gold", title: "高額な投資講座の返金トラブル、ゴールド投資サロン（架空）", text: "ゴールド投資サロン（架空）が販売する高額な投資講座について、「説明と内容が違う」「返金に応じない」とする相談が約120件寄せられている。" },
];

/** 事件のページの URL の名前（企業ごと） */
export const SLUG: Record<string, string> = {
  ミドリ通販: "midori-tsuhan-leak",
  青葉学習塾: "aoba-juku-usb",
  ひかり保険代理店: "hikari-hoken-misdelivery",
  東和精工: "towa-seiko-ransomware",
  まちの電力: "machi-denryoku-login",
  北斗旅行: "hokuto-travel-card",
  スマイル美容: "smile-biyou-subscription",
  ゴールド投資サロン: "gold-salon-refund",
};

export type Lawyer = { name: string; bar: string };
export type Firm = {
  id: string;
  slug: string;
  name: string;
  address: string;
  lawyers: Lawyer[];
  fee: string;
  formUrl: string;
  domain: string;
  domainType: "sub" | "custom";
  pageQuota: number;
  /** 契約の終わり（初期の状態を作るときに、今日からの日数で決める） */
  contractDays: number;
  aiCapYen: number;
  color: string;
};

export const FIRMS: Firm[] = [
  {
    id: "firm-a",
    slug: "sakura",
    name: "さくら総合法律事務所（架空）",
    address: "東京都千代田区（架空の住所）",
    lawyers: [
      { name: "山本 一郎（架空）", bar: "東京みなみ弁護士会（架空）" },
      { name: "森 由紀（架空）", bar: "東京みなみ弁護士会（架空）" },
    ],
    fee: "初回のご相談は30分まで無料です（2回目以降は30分5,500円）。着手金と報酬金は事件の内容により異なり、ご依頼の前に見積もりをお示しします。",
    formUrl: "https://example.com/sakura-law/contact",
    domain: "sakura.jiken-info.example",
    domainType: "sub",
    pageQuota: 10,
    contractDays: 180,
    aiCapYen: 300,
    color: "#1f3a68",
  },
  {
    id: "firm-b",
    slug: "minato",
    name: "みなと法律事務所（架空）",
    address: "大阪府大阪市（架空の住所）",
    lawyers: [{ name: "佐藤 花子（架空）", bar: "大阪ひがし弁護士会（架空）" }],
    fee: "ご相談は30分5,500円です。費用の詳しい条件は、ご相談の際にご説明します。",
    formUrl: "https://example.com/minato-law/form",
    domain: "www.minato-law.example",
    domainType: "custom",
    pageQuota: 5,
    contractDays: 21,
    aiCapYen: 150,
    color: "#0f5a52",
  },
];

export type Role = "lawyer" | "clerk";
export type User = { id: string; firmId: string; name: string; role: Role };
export const USERS: User[] = [
  { id: "u-a1", firmId: "firm-a", name: "山本 一郎（架空）", role: "lawyer" },
  { id: "u-a2", firmId: "firm-a", name: "田村 美咲（架空）", role: "clerk" },
  { id: "u-b1", firmId: "firm-b", name: "佐藤 花子（架空）", role: "lawyer" },
  { id: "u-b2", firmId: "firm-b", name: "小川 健（架空）", role: "clerk" },
];
export const ROLE_LABEL: Record<Role, string> = { lawyer: "弁護士（承認者）", clerk: "事務員（編集者）" };

export const firmById = (id: string) => FIRMS.find((f) => f.id === id)!;
export const firmBySlug = (slug: string) => FIRMS.find((f) => f.slug === slug);
export const userById = (id: string) => USERS.find((u) => u.id === id)!;
export const sourceById = (id: string) => SOURCES.find((s) => s.id === id)!;
export const articleById = (id: string) => ARTICLES.find((a) => a.id === id)!;

export type Fact = { text: string; sources: string[] };
export type DraftBody = { title: string; facts: Fact[]; guidance: string; showLawyer: boolean; showFee: boolean };

/** 見本モードの下書き（品質の高い完成形。主要な4件） */
export const SAMPLE_DRAFTS: Record<string, DraftBody> = {
  ミドリ通販: {
    title: "ミドリ通販（架空）の会員情報流出の可能性について",
    facts: [
      { text: "株式会社ミドリ通販（架空）は2026年9月28日、通販サイトが第三者による不正アクセスを受け、会員の氏名、住所、電話番号など約12万件が流出した可能性があると発表しました。", sources: ["a1"] },
      { text: "同社によると、クレジットカード情報は含まれていないとしています。", sources: ["a1"] },
      { text: "同社は外部の専門家と調査を進めていると報じられています。", sources: ["a2"] },
    ],
    guidance: "ご自身の情報が含まれているか不安な方は、まず同社からの連絡や公式の発表をご確認ください。不審なメールや電話にはご注意ください。今後の対応について、弁護士にご相談いただけます。",
    showLawyer: true,
    showFee: true,
  },
  東和精工: {
    title: "東和精工（架空）のランサムウェア被害について",
    facts: [
      { text: "東和精工株式会社（架空）は2026年10月5日、社内のサーバーがランサムウェアに感染し、一部の工場で生産を停止していると発表しました。", sources: ["a6", "a7"] },
      { text: "同社は、取引先の情報が含まれていた可能性についても調査しているとしています。", sources: ["a6"] },
      { text: "同社は警察に相談していると報じられています。", sources: ["a7"] },
    ],
    guidance: "取引先として影響を受けた可能性のある事業者の方は、同社の公式の発表をご確認のうえ、契約上の対応について弁護士にご相談いただけます。",
    showLawyer: true,
    showFee: true,
  },
  北斗旅行: {
    title: "北斗旅行（架空）の予約サイト改ざんとカード情報流出の可能性について",
    facts: [
      { text: "北斗旅行株式会社（架空）は2026年10月14日、予約サイトが改ざんされ、利用者のクレジットカード情報約6,500件が流出した可能性があると発表しました。", sources: ["a9"] },
    ],
    guidance: "同社の予約サイトでカードを利用された方は、カードの利用明細をご確認ください。身に覚えのない請求があった場合は、カード会社にご連絡ください。被害の回復について、弁護士にご相談いただけます。",
    showLawyer: true,
    showFee: true,
  },
  スマイル美容: {
    title: "スマイル美容（架空）の定期購入をめぐる相談の増加について",
    facts: [
      { text: "美容サプリを販売するスマイル美容（架空）の定期購入をめぐり、「解約の電話がつながらない」などの相談が、各地の消費生活センターに約300件寄せられていると報じられています。", sources: ["a10"] },
    ],
    guidance: "定期購入の解約でお困りの方は、まず契約の内容と、これまでのやり取りの記録をお手元にご用意ください。消費生活センターへのご相談のほか、弁護士にもご相談いただけます。",
    showLawyer: true,
    showFee: true,
  },
};

/** わざと問題を入れた下書き（公開前のチェックで止まる見本） */
export const PROBLEM_DRAFTS: { id: string; title: string; company: string; body: DraftBody }[] = [
  {
    id: "p1",
    title: "結果を約束する表現と、根拠のない最上級の表現",
    company: "ミドリ通販",
    body: {
      title: "ミドリ通販（架空）の情報流出の被害者の方へ",
      facts: [{ text: "株式会社ミドリ通販（架空）は2026年9月28日、会員の情報約12万件が流出した可能性があると発表しました。", sources: ["a1"] }],
      guidance: "被害に遭われた方は、当事務所が必ず全額取り戻せます。個人情報の事件の解決実績は当事務所が日本一です。相談は無料です。",
      showLawyer: true,
      showFee: true,
    },
  },
  {
    id: "p2",
    title: "費用の条件がない、出典のない事実、個人の情報",
    company: "スマイル美容",
    body: {
      title: "スマイル美容（架空）の定期購入トラブル",
      facts: [
        { text: "美容サプリの定期購入をめぐり、消費生活センターに約300件の相談が寄せられていると報じられています。", sources: ["a10"] },
        { text: "同社は過去にも同様の問題で行政処分を受けています。", sources: [] },
        { text: "被害者の田中様（45）は、解約の電話が50回つながらなかったと話しています。", sources: ["a10"] },
      ],
      guidance: "お困りの方は、お早めにご相談ください。",
      showLawyer: true,
      showFee: false,
    },
  },
];
