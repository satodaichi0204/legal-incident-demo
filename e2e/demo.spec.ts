import { expect, test, type Page } from "@playwright/test";

const asUser = (page: Page, id: string) => page.getByTestId("user-switch").selectOption(id);

test("通しの流れ：収集 → 続報 → 下書きの更新 → チェック → 承認の依頼 → 弁護士の承認 → 公開ページに反映 → 公開停止", async ({ page }) => {
  await page.goto("/admin/collect");
  await page.getByTestId("run-collect").click();
  await expect(page.getByTestId("collect-msg")).toContainText("件の記事を取得");

  await page.goto("/admin/incidents?id=" + encodeURIComponent("ミドリ通販"));
  const card = page.locator('[data-testid=incident-card][data-company="ミドリ通販"]');
  await expect(card.getByTestId("updated-badge")).toBeVisible();
  await expect(card).toContainText("約12万件 → 約18万件");
  await page.getByRole("link", { name: /下書きを開く/ }).click();

  // 件数を直しただけでは、出典（第1報）に18万件がないので止まる
  const fact1 = page.getByLabel("事実の文 1", { exact: true });
  await fact1.fill((await fact1.inputValue()).replace("約12万件", "約18万件"));
  await expect(page.getByTestId("check-verdict")).toContainText("止める項目");
  // 第2報を出典に足すと通る
  await page.getByRole("button", { name: "事実の文 1 の出典 3" }).click();
  await expect(page.getByTestId("check-verdict")).toHaveText("承認の依頼に進めます");
  await page.getByLabel("変更のメモ").fill("続報（第2報）で件数を更新");
  await page.getByRole("button", { name: "版を保存" }).click();
  await expect(page.getByTestId("reapproval-banner")).toBeVisible();

  // 公開ページは、まだ前の版（12万件）
  await page.goto("/s/sakura/midori-tsuhan-leak");
  await expect(page.getByTestId("incident-article")).toContainText("約12万件");

  await page.goto("/admin/drafts");
  await page.locator('tr[data-draft="ミドリ通販"] a').click();
  await page.getByTestId("request").click();
  await expect(page.getByTestId("draft-status")).toHaveText("承認待ち");
  await expect(page.getByTestId("approve")).toHaveCount(0); // 事務員には承認のボタンがない

  await asUser(page, "u-a1");
  await page.getByTestId("approve").click();
  await expect(page.getByTestId("draft-msg")).toContainText("再承認しました");

  await page.goto("/s/sakura/midori-tsuhan-leak");
  await expect(page.getByTestId("incident-article")).toContainText("約18万件");
  await expect(page.getByTestId("corrections")).toContainText("続報（第2報）で件数を更新");

  await page.goto("/admin/drafts");
  await page.locator('tr[data-draft="ミドリ通販"] a').click();
  await page.getByTestId("stop").click();
  await page.goto("/s/sakura/midori-tsuhan-leak");
  await expect(page.getByTestId("not-published")).toBeVisible();
});

test("新しい事件の下書きを作り、承認すると、事務所の公開ページの一覧に出る", async ({ page }) => {
  await page.goto("/admin/collect");
  await page.getByTestId("run-collect").click();
  await page.goto("/admin/incidents?id=" + encodeURIComponent("スマイル美容"));
  await page.getByTestId("create-draft").click();
  await expect(page.getByTestId("check-verdict")).toHaveText("承認の依頼に進めます");
  await page.getByTestId("request").click();
  await asUser(page, "u-a1");
  await page.getByTestId("approve").click();
  await page.goto("/s/sakura");
  await expect(page.getByTestId("public-index")).toContainText("スマイル美容");
});

test("公開前のチェック：問題のある見本は止まり、承認を依頼できない", async ({ page }) => {
  await page.goto("/admin/check");
  const p1 = page.getByTestId("problem-p1");
  await expect(p1.getByTestId("check-panel")).toHaveAttribute("data-pass", "false");
  await expect(p1.getByTestId("issues")).toContainText("必ず");
  await expect(p1.getByTestId("issues")).toContainText("日本一");
  await expect(p1.getByTestId("issues")).toContainText("「無料」の条件");
  const p2 = page.getByTestId("problem-p2");
  await expect(p2.getByTestId("issues")).toContainText("費用の条件");
  await expect(p2.getByTestId("issues")).toContainText("出典のない事実");
  await expect(p2.getByTestId("issues")).toContainText("個人を特定");
});

test("下書きに「必ず全額取り戻せます」を書くと止まり、承認を依頼できない", async ({ page }) => {
  await page.goto("/admin/drafts");
  await page.locator('tr[data-draft="青葉学習塾"] a').click();
  await page.getByLabel("お知らせ").fill("被害は当事務所が必ず全額取り戻せます。");
  await expect(page.getByTestId("check-verdict")).toContainText("止める項目");
  await page.getByRole("button", { name: "版を保存" }).click();
  await expect(page.getByTestId("request")).toBeDisabled();
});

test("差し戻しは弁護士だけで、理由が必要", async ({ page }) => {

  await page.goto("/admin/approvals");
  await asUser(page, "u-a1");
  await page.locator("[data-testid=pending-table] a").first().click();
  await page.getByTestId("reject").click();
  await expect(page.getByTestId("draft-msg")).toContainText("理由");
  await page.getByLabel("理由").fill("出典の日付を確認してください");
  await page.getByTestId("reject").click();
  await expect(page.getByTestId("draft-status")).toHaveText("差し戻し");
});

test("事務所ごとの分離：事務所Bの利用者は事務所Aの下書きを開けず、一覧にも出ない", async ({ page }) => {
  await page.goto("/admin/drafts");
  const href = await page.locator('tr[data-draft="青葉学習塾"] a').getAttribute("href");
  await asUser(page, "u-b2");
  await expect(page.getByTestId("draft-table")).not.toContainText("青葉学習塾");
  await page.goto(href!);
  await expect(page.getByText("この事務所の下書きではないか")).toBeVisible();
});

test("契約の期限：時間を進めると、事務所Bの公開ページが自動で停止し、事務所Aは公開のまま", async ({ page }) => {
  await page.goto("/s/minato/hokuto-travel-card");
  await expect(page.getByTestId("incident-article")).toBeVisible();
  await page.goto("/admin/ops");
  await asUser(page, "u-b1");
  await page.getByTestId("advance").click();
  await page.getByTestId("advance").click();
  await expect(page.getByTestId("notices")).toContainText("自動で停止");
  await page.goto("/s/minato/hokuto-travel-card");
  await expect(page.getByTestId("not-published")).toBeVisible();
  await page.goto("/s/sakura/towa-seiko-ransomware");
  await expect(page.getByTestId("incident-article")).toBeVisible();
});

test("公開ページ：事務所の情報、費用の条件、外部の受付フォーム、共有、SEO の情報", async ({ page }) => {
  await page.goto("/s/sakura/towa-seiko-ransomware");
  await expect(page.getByTestId("firm-block")).toContainText("東京みなみ弁護士会（架空）");
  await expect(page.getByTestId("firm-block")).toContainText("費用の条件");
  await expect(page.getByTestId("form-button")).toHaveAttribute("href", "https://example.com/sakura-law/contact");
  await expect(page.getByTestId("share")).toContainText("Xで共有");
  await expect(page).toHaveTitle(/東和精工（架空）.*さくら総合法律事務所（架空）/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /towa|matrix/);
  expect(await page.locator('script[type="application/ld+json"]').first().textContent()).toContain('"@type":"Article"');
  const sitemap = await page.request.get("/s/sakura/sitemap.xml");
  expect(await sitemap.text()).toContain("towa-seiko-ransomware");
});

test("すべての管理画面に「AIがすること」と「弁護士・事務所が確認すること」の枠がある", async ({ page }) => {
  for (const path of ["/", "/admin/collect", "/admin/incidents", "/admin/drafts", "/admin/check", "/admin/approvals", "/admin/public", "/admin/announce", "/admin/settings", "/admin/ops", "/design"]) {
    await page.goto(path);
    await expect(page.getByTestId("rolebox"), path).toContainText("弁護士・事務所が確認すること");
  }
});

test("Claude で事前に生成した下書き・概要・告知文と、その記録（量と費用の実測）が見える", async ({ page }) => {
  await page.goto("/admin/drafts");
  await page.locator('tr[data-draft="東和精工"] a').click();
  await expect(page.getByTestId("draft-mode")).toContainText("Claude（claude-sonnet-5-5）で実際に生成した下書き");
  await page.goto("/admin/incidents?id=" + encodeURIComponent("東和精工"));
  await expect(page.getByTestId("incident-detail")).toContainText("claude-haiku-5-5 で実際に生成");
  await page.goto("/admin/announce");
  await expect(page.getByTestId("announce-mode").first()).toContainText("Claude");
  await page.goto("/admin/ops");
  const log = page.getByTestId("generation-log");
  await expect(log).toContainText("不合格 → 見本に戻す");
  await expect(log).toContainText("作り直して合格");
  await expect(page.getByTestId("mode")).toContainText("AI事前生成モード");
});
