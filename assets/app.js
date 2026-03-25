/* =========================
   基本データ・設定
========================= */
const STORAGE_KEY = "support_book_v5_tab_pager";

const TEMPLATE = {
  pages: [
    { id:"p1", title:"表紙", fields: {
      updatedDate:"", childName:"", nickname:"", birth:"", age:"", diagnosis:"", messageShort:"",
      photoMain:{ src:"", s:1, x:0, y:0, r:0, cap:"本人" },
      photo1:{ src:"", s:1, x:0, y:0, r:0, cap:"好きなもの" },
      photo2:{ src:"", s:1, x:0, y:0, r:0, cap:"安心グッズ" },
    }},
    { id:"p2", title:"長所・興味", fields: {
      strengths:"", interests:"", triggers:"", calming:"",
      photo1:{ src:"", s:1, x:0, y:0, r:0, cap:"得意なこと" },
      photo2:{ src:"", s:1, x:0, y:0, r:0, cap:"好きな場所" },
      photo3:{ src:"", s:1, x:0, y:0, r:0, cap:"落ち着く" },
    }},
    { id:"p3", title:"伝え方", fields: {
      understand:"", express:"", supportTips:"",
      photo1:{ src:"", s:1, x:0, y:0, r:0, cap:"視覚支援" },
      photo2:{ src:"", s:1, x:0, y:0, r:0, cap:"見本" },
      photo3:{ src:"", s:1, x:0, y:0, r:0, cap:"ルール" },
    }},
    { id:"p4", title:"ここで困るかも", fields: {
      sensory:"", life:"", learning:"",
      schoolArrival:"", schoolClass:"", schoolRecess:"", schoolDismissal:"",
      panicSigns:"", panicSupport:"",
      photo1:{ src:"", s:1, x:0, y:0, r:0, cap:"教室" },
      photo2:{ src:"", s:1, x:0, y:0, r:0, cap:"配慮" },
      photo3:{ src:"", s:1, x:0, y:0, r:0, cap:"クールダウン" },
    }},
    { id:"p5", title:"場面別", fields: {
      rows:[
        {scene:"予定の変更", fact:"", support:""},
        {scene:"指示の理解", fact:"", support:""},
        {scene:"音の過敏", fact:"", support:""},
        {scene:"切り替え", fact:"", support:""},
        {scene:"友だちとのトラブル", fact:"", support:""},
      ],
      teacherMessage:"",
      photo1:{ src:"", s:1, x:0, y:0, r:0, cap:"連絡手段" },
      photo2:{ src:"", s:1, x:0, y:0, r:0, cap:"持ち物" },
      photo3:{ src:"", s:1, x:0, y:0, r:0, cap:"配布物" },
    }},
  ]
};

const PAGE_TEXT_LABELS = {
  p1: { updatedDate:"更新日", childName:"氏名", birth:"生年月日", age:"年齢", diagnosis:"診断名（任意）", messageShort:"ひとこと（任意）" },
  p2: { strengths:"強み", interests:"興味・好きなもの" },
  p3: { understand:"理解しやすい伝え方", express:"本人の伝え方", supportTips:"家庭での伝え方" },
  p4: { sensory:"感覚（音・光など）", life:"生活（トイレ・給食など）", learning:"学習（作業・板書など）", schoolArrival:"朝の準備・登校", schoolClass:"授業中", schoolRecess:"休み時間・集団場面", schoolDismissal:"下校・切り替え", panicSigns:"予兆（事実）", panicSupport:"対応（対策）" },
  p5: { teacherMessage:"メッセージ" }
};

const PAGE_PHOTO_SLOTS = {
  p1: [{ key:"photo1", size:"small", label:"好きなもの" }, { key:"photo2", size:"small", label:"安心グッズ" }],
  p2: [{ key:"photo1", size:"small", label:"得意なこと" }, { key:"photo2", size:"small", label:"好きな場所" }, { key:"photo3", size:"small", label:"落ち着く" }],
  p3: [{ key:"photo1", size:"small", label:"視覚支援" }, { key:"photo2", size:"small", label:"見本" }, { key:"photo3", size:"small", label:"ルール" }],
  p4: [{ key:"photo1", size:"small", label:"教室" }, { key:"photo2", size:"small", label:"配慮" }, { key:"photo3", size:"small", label:"クールダウン" }],
  p5: [{ key:"photo1", size:"small", label:"連絡手段" }, { key:"photo2", size:"small", label:"持ち物" }, { key:"photo3", size:"small", label:"配布物" }],
};

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
let state = loadState();
let currentPage = 0;
const historyStack = [];
const HISTORY_LIMIT = 30;

function createPhotoField(label="写真"){
  return { src:"", s:1, x:0, y:0, r:0, cap:label };
}

function ensurePageUI(page){
  const defaultLabels = PAGE_TEXT_LABELS[page.id] || {};
  page.textLabels = { ...defaultLabels, ...(page.textLabels || {}) };

  const baseSlots = (PAGE_PHOTO_SLOTS[page.id] || []).map(s=>({ ...s }));
  page.photoSlots = Array.isArray(page.photoSlots) ? page.photoSlots.map(s=>({ ...s })) : baseSlots;
  if(page.photoSlots.length === 0 && baseSlots.length) page.photoSlots = baseSlots;

  page.photoSlots.forEach((slot, i)=>{
    if(!slot.key) slot.key = `photo_custom_${page.id}_${i+1}`;
    if(!slot.size) slot.size = "small";
    if(!slot.label) slot.label = `写真${i+1}`;
    if(!page.fields[slot.key]) page.fields[slot.key] = createPhotoField(slot.label);
    if(!page.fields[slot.key].cap) page.fields[slot.key].cap = slot.label;
  });
}

/* タブ内の物理ページ位置（タブごとに保持） */
const subPageByTab = Object.create(null); // { [tabIndex]: number }
let currentSheetsCache = []; // 現在タブのsheets（プレビュー用）

/* =========================
   UI構築・レンダリング
========================= */
function render(){
  state.pages.forEach(ensurePageUI);
  // Tabs
  const tabsDiv = document.getElementById("tabs");
  tabsDiv.innerHTML = "";
  state.pages.forEach((p, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `tab ${i===currentPage ? "active" : ""}`;
    b.textContent = `${i+1}. ${p.title}`;
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", i===currentPage ? "true" : "false");
    b.onclick = () => {
      currentPage = i;
      if(subPageByTab[currentPage] == null) subPageByTab[currentPage] = 0;
      render();
      b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    };
    tabsDiv.appendChild(b);
  });

  // Create blocks -> paginate
  const contentBlocks = createPageBlocks(currentPage, false);
  const sheets = paginateBlocks(contentBlocks);
  currentSheetsCache = sheets;

  // Clamp sub-page
  const total = Math.max(1, sheets.length);
  let sp = subPageByTab[currentPage] ?? 0;
  sp = Math.min(Math.max(0, sp), total-1);
  subPageByTab[currentPage] = sp;

  // Pager UI
  const info = document.getElementById("pageInfo");
  const btnPrev = document.getElementById("btnPrevSub");
  const btnNext = document.getElementById("btnNextSub");
  info.textContent = `${sp+1}/${total}`;
  btnPrev.disabled = (sp <= 0);
  btnNext.disabled = (sp >= total-1);

  // Stage: show only one sheet
  const stage = document.getElementById("stage");
  stage.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "sheet-wrap";
  wrap.appendChild(sheets[sp] || createSheetEl());
  stage.appendChild(wrap);

  persist();
  syncUndoButton();
}

document.getElementById("btnPrevSub").onclick = () => {
  const cur = subPageByTab[currentPage] ?? 0;
  subPageByTab[currentPage] = Math.max(0, cur - 1);
  render();
};
document.getElementById("btnNextSub").onclick = () => {
  const cur = subPageByTab[currentPage] ?? 0;
  const max = Math.max(0, (currentSheetsCache?.length || 1) - 1);
  subPageByTab[currentPage] = Math.min(max, cur + 1);
  render();
};

// 任意: キーボード左右で切替（デスクトップ用）
document.addEventListener("keydown", (e)=>{
  if(e.key === "Escape" && modal.classList.contains("show")){
    closeModal();
    return;
  }
  if(modal.classList.contains("show")) return;
  if(e.key === "ArrowLeft") document.getElementById("btnPrevSub").click();
  if(e.key === "ArrowRight") document.getElementById("btnNextSub").click();
});

/**
 * ページネーション（mm実寸のoverflow判定版）
 * ブロック配列をA4に収まるようにSheetへ振り分ける
 */
function paginateBlocks(blocks) {
  const sheets = [];

  // 実測用：A4 sheet-innerを隠して用意（CSSと同一）
  const measWrap = document.createElement("div");
  measWrap.style.position = "absolute";
  measWrap.style.visibility = "hidden";
  measWrap.style.left = "-99999px";
  measWrap.style.top = "0";
  document.body.appendChild(measWrap);

  const measSheet = createSheetEl();
  measWrap.appendChild(measSheet);
  const measInner = measSheet.querySelector(".sheet-inner");

  // 1枚目
  let currentSheet = createSheetEl();
  let currentInner = currentSheet.querySelector(".sheet-inner");
  sheets.push(currentSheet);

  for (const block of blocks) {
    // overflow判定（現状ページに入るか）
    measInner.innerHTML = "";
    for (const ch of Array.from(currentInner.children)) measInner.appendChild(ch.cloneNode(true));
    const probe = block.cloneNode(true);
    measInner.appendChild(probe);
    const overflow = measInner.scrollHeight > measInner.clientHeight;

    // ブロック単体が1ページに入るか（巨大ブロック検知）
    measInner.innerHTML = "";
    measInner.appendChild(probe.cloneNode(true));
    const tooBig = measInner.scrollHeight > measInner.clientHeight;

    if (overflow && currentInner.childElementCount > 0) {
      currentSheet = createSheetEl();
      currentInner = currentSheet.querySelector(".sheet-inner");
      sheets.push(currentSheet);
    }

    currentInner.appendChild(block);

    // 巨大ブロックの場合：次ブロックは次ページから（破綻軽減）
    if (tooBig) {
      currentSheet = createSheetEl();
      currentInner = currentSheet.querySelector(".sheet-inner");
      sheets.push(currentSheet);
    }
  }

  document.body.removeChild(measWrap);

  // 末尾が空ページになった場合は落とす
  while (sheets.length > 1) {
    const last = sheets[sheets.length-1];
    const inner = last.querySelector(".sheet-inner");
    if (inner && inner.childElementCount === 0) sheets.pop();
    else break;
  }
  return sheets;
}

function createSheetEl() {
  const s = document.createElement("div");
  s.className = "sheet";
  s.innerHTML = `<div class="sheet-inner"></div>`;
  return s;
}

/**
 * 論理ページ（タブ）ごとのコンテンツブロック（DOM要素）の配列を生成
 */
function createPageBlocks(idx, isExport){
  const p = state.pages[idx];
  ensurePageUI(p);
  const f = p.fields;
  const blocks = [];

  const wrap = (els, className="p-block") => {
    const d = document.createElement("div");
    d.className = className;
    if(Array.isArray(els)) els.forEach(e=>d.appendChild(e));
    else d.appendChild(els);
    return d;
  };

  const section = (t)=>{
    const h = document.createElement("h2");
    h.className = "secTitle"; h.textContent = t;
    return wrap(h);
  };

  const box = (lbl, val, key, half=false) => {
    const currentLabel = p.textLabels[key] || lbl;
    const d = document.createElement("div");
    d.className = `box ${half ? "half" : ""}`;
    d.onclick = () => openTextModal(idx, key, lbl);
    const labelRow = document.createElement("div");
    labelRow.className = "lbl";
    labelRow.style.display = "flex";
    labelRow.style.justifyContent = "space-between";
    labelRow.style.alignItems = "center";
    labelRow.innerHTML = `<span>${escapeHtml(currentLabel)}</span>`;
    if(!isExport){
      const editBtn = document.createElement("button");
      editBtn.className = "btn";
      editBtn.style.padding = "2px 6px";
      editBtn.style.fontSize = "10px";
      editBtn.textContent = "✎";
      editBtn.onclick = (e)=>{
        e.stopPropagation();
        openLabelModal(idx, key, lbl);
      };
      labelRow.appendChild(editBtn);
    }
    d.appendChild(labelRow);
    const valueEl = document.createElement("div");
    valueEl.className = "val";
    valueEl.innerHTML = (val && String(val).trim().length) ? escapeHtml(val) : (isExport ? "" : `<span class="hint">タップして入力</span>`);
    d.appendChild(valueEl);
    return d;
  };

  const photo = (ph, key, size, slot, slotIndex) => {
    const d = document.createElement("div");
    d.className = `photoCard ${size}`;
    d.onclick = () => openPhotoModal(idx, key);
    if(ph?.src){
      const img = document.createElement("img");
      img.src = ph.src;
      img.style.transform = `translate(${ph.x||0}px, ${ph.y||0}px) translate(-50%, -50%) rotate(${ph.r||0}deg) scale(${ph.s||1})`;
      d.appendChild(img);
    }else{
      const phEl = document.createElement("div");
      phEl.className = "ph"; phEl.textContent = "写真";
      d.appendChild(phEl);
    }
    const cap = document.createElement("div");
    cap.className = "cap"; cap.textContent = ph?.cap || slot?.label || "写真";
    d.appendChild(cap);

    if(!isExport){
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn";
      removeBtn.textContent = "×";
      removeBtn.style.position = "absolute";
      removeBtn.style.top = "4px";
      removeBtn.style.right = "4px";
      removeBtn.style.padding = "2px 7px";
      removeBtn.style.borderRadius = "999px";
      removeBtn.style.zIndex = "2";
      removeBtn.onclick = (e)=>{
        e.stopPropagation();
        snapshotState();
        p.photoSlots.splice(slotIndex, 1);
        delete p.fields[key];
        showToast("画像枠を削除しました");
        render();
      };
      d.appendChild(removeBtn);
    }
    return d;
  };

  const photoSlotsBlock = (title)=>{
    const slotWrap = document.createElement("div");
    slotWrap.className = "meta";
    p.photoSlots.forEach((slot, slotIndex)=>{
      const ph = f[slot.key] || createPhotoField(slot.label);
      slotWrap.appendChild(photo(ph, slot.key, slot.size || "small", slot, slotIndex));
    });
    const items = [section(title), wrap(slotWrap)];
    if(!isExport){
      const ctl = document.createElement("div");
      ctl.style.display = "flex";
      ctl.style.gap = "8px";
      const add = document.createElement("button");
      add.className = "btn";
      add.textContent = "＋ 画像枠を追加";
      add.onclick = ()=>{
        snapshotState();
        const next = p.photoSlots.length + 1;
        const key = `photo_custom_${p.id}_${Date.now()}`;
        const label = `写真${next}`;
        p.photoSlots.push({ key, size:"small", label });
        p.fields[key] = createPhotoField(label);
        showToast("画像枠を追加しました");
        render();
      };
      ctl.appendChild(add);
      items.push(wrap(ctl));
    }
    return items;
  };

  // --- コンテンツ生成 ---

  if(p.id==="p1"){
    const h = document.createElement("div");
    h.innerHTML = `<div class="h1">サポートブック</div><div class="note">学校・支援者の方へ</div>`;
    blocks.push(wrap(h));

    const m = document.createElement("div");
    m.className = "meta";
    m.appendChild(photo(f.photoMain, "photoMain", "large"));

    const g = document.createElement("div");
    g.className = "infoGrid flow-grid";
    g.style.flex = "1";

    const bUp = box("更新日", f.updatedDate, "updatedDate", true);
    bUp.onclick = () => openDateModal(idx, "updatedDate", "更新日");
    g.appendChild(bUp);

    g.appendChild(box("氏名", f.childName, "childName", true));

    const bBi = box("生年月日", f.birth, "birth", true);
    bBi.onclick = () => openDateModal(idx, "birth", "生年月日");
    g.appendChild(bBi);

    g.appendChild(box("年齢", f.age, "age", true));
    g.appendChild(box("診断名（任意）", f.diagnosis, "diagnosis", true));
    g.appendChild(box("ひとこと（任意）", f.messageShort, "messageShort", false));

    m.appendChild(g);
    blocks.push(wrap(m));

    blocks.push(...photoSlotsBlock("写真（好きなもの・安心グッズなど）"));
  }

  else if(p.id==="p5"){
    blocks.push(section("📝 場面別のポイント"));

    const th = document.createElement("div");
    th.className = "table-wrap";
    th.style.borderBottom = "none";
    th.style.borderRadius = "10px 10px 0 0";
    th.innerHTML = `
      <div class="trow thead">
        <div class="tcell">場面</div><div class="tcell">困りポイント</div><div class="tcell">お願いしたいこと</div>
      </div>
    `;
    blocks.push(wrap(th));

    f.rows.forEach((r, ri) => {
      const trWrap = document.createElement("div");
      trWrap.className = "table-wrap";
      trWrap.style.borderRadius = "0";
      trWrap.style.borderTop = "none";

      const tr = document.createElement("div");
      tr.className = "trow";
      tr.style.borderTop = "none";
      tr.appendChild(cell(r.scene, idx, `rows.${ri}.scene`, isExport));
      tr.appendChild(cell(r.fact, idx, `rows.${ri}.fact`, isExport));
      tr.appendChild(cell(r.support, idx, `rows.${ri}.support`, isExport));

      trWrap.appendChild(tr);
      blocks.push(wrap(trWrap, "p-block-tight"));
    });

    if(!isExport){
      const ctl = document.createElement("div");
      ctl.style.display="flex"; ctl.style.gap="8px"; ctl.style.padding="4px 0";
      const add = document.createElement("button"); add.className="btn"; add.textContent="＋ 行を追加";
      add.onclick=()=>{
        snapshotState();
        f.rows.push({scene:"",fact:"",support:""});
        showToast("行を追加しました");
        render();
      };
      const del = document.createElement("button"); del.className="btn"; del.textContent="− 削除";
      del.onclick=()=>{
        if(f.rows.length>1){
          snapshotState();
          f.rows.pop();
          showToast("行を削除しました");
          render();
        }
      };
      ctl.appendChild(add); ctl.appendChild(del);
      blocks.push(wrap(ctl));
    }

    blocks.push(...photoSlotsBlock("📸 補足写真"));

    blocks.push(section("✉️ 先生へのメッセージ"));
    blocks.push(wrap(box("メッセージ", f.teacherMessage, "teacherMessage", false)));
  }

  else {
    let title = "";
    if(p.id==="p2") title = "🌟 いいところ・好きなこと";
    if(p.id==="p3") title = "📢 伝え方・コミュニケーション";
    if(p.id==="p4") title = "🏫 生活場面でここに困るかも…";

    blocks.push(section(title));

    const row = document.createElement("div");
    row.className = "meta";
    p.photoSlots.forEach((slot, slotIndex)=>{
      row.appendChild(photo(f[slot.key], slot.key, slot.size || "small", slot, slotIndex));
    });
    blocks.push(wrap(row));
    if(!isExport){
      const ctl = document.createElement("div");
      ctl.style.display = "flex";
      ctl.style.gap = "8px";
      const add = document.createElement("button");
      add.className = "btn";
      add.textContent = "＋ 画像枠を追加";
      add.onclick = ()=>{
        snapshotState();
        const next = p.photoSlots.length + 1;
        const key = `photo_custom_${p.id}_${Date.now()}`;
        const label = `写真${next}`;
        p.photoSlots.push({ key, size:"small", label });
        p.fields[key] = createPhotoField(label);
        showToast("画像枠を追加しました");
        render();
      };
      ctl.appendChild(add);
      blocks.push(wrap(ctl));
    }

    const addField = (lbl, key) => blocks.push(wrap(box(lbl, f[key], key, false)));

    if(p.id==="p2"){
      addField("強み", "strengths");
      addField("興味・好きなもの", "interests");
    }
    if(p.id==="p3"){
      addField("理解しやすい伝え方", "understand");
      addField("本人の伝え方", "express");
      addField("家庭での伝え方", "supportTips");
    }
    if(p.id==="p4"){
      addField("感覚（音・光など）", "sensory");
      addField("生活（トイレ・給食など）", "life");
      addField("学習（作業・板書など）", "learning");
      addField("朝の準備・登校", "schoolArrival");
      addField("授業中", "schoolClass");
      addField("休み時間・集団場面", "schoolRecess");
      addField("下校・切り替え", "schoolDismissal");
      addField("予兆（事実）", "panicSigns");
      addField("対応（対策）", "panicSupport");
    }
  }

  return blocks;

  function cell(v, pIdx, key, isExport){
    const c = document.createElement("div");
    c.className = "tcell";
    c.innerHTML = (v && String(v).trim().length) ? escapeHtml(v) : (isExport ? "" : `<span class="hint">入力</span>`);
    c.onclick = ()=> openTextModal(pIdx, key, "テーブル入力");
    return c;
  }
}

/* =========================
   モーダル・編集機能
========================= */
const modal = document.getElementById("modal");
const mContent = document.getElementById("m-content");
const fileInput = document.getElementById("fileInput");

function openDateModal(pIdx, key, lbl){
  let val = getByPath(state.pages[pIdx].fields, key) ?? "";
  let isoVal = "";
  const m = val.match(/(\d{4}).(\d{1,2}).(\d{1,2})/);
  if(m) isoVal = `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  mContent.innerHTML = `
    <h3>${escapeHtml(lbl)}</h3>
    <input type="date" id="m-date" value="${isoVal}" style="font-size:18px; padding:12px;">
    <div style="display:flex; gap:10px; margin-top:20px;">
      <button class="btn primary" id="m-save-date" style="flex:1">決定</button>
      <button class="btn" id="m-close" style="flex:1">閉じる</button>
    </div>
  `;
  document.getElementById("m-save-date").onclick = ()=>{
    const dVal = document.getElementById("m-date").value;
    if(dVal){
      const [y, mo, d] = dVal.split("-");
      setByPath(state.pages[pIdx].fields, key, `${y}年${parseInt(mo)}月${parseInt(d)}日`);
    } else {
      setByPath(state.pages[pIdx].fields, key, "");
    }
    closeModal();
  };
  document.getElementById("m-close").onclick = closeModal;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function openTextModal(pIdx, key, lbl){
  const val = getByPath(state.pages[pIdx].fields, key) ?? "";
  mContent.innerHTML = `
    <h3>${escapeHtml(lbl)}</h3>
    <textarea id="m-ta" placeholder="ここに入力（空欄OK）">${escapeHtml(val)}</textarea>
    <div style="display:flex; gap:10px; margin-top:10px;">
      <button class="btn primary" id="m-save" style="flex:1">保存</button>
      <button class="btn" id="m-close" style="flex:1">閉じる</button>
    </div>
  `;
  document.getElementById("m-save").onclick = ()=>{
    setByPath(state.pages[pIdx].fields, key, document.getElementById("m-ta").value);
    closeModal();
  };
  document.getElementById("m-close").onclick = closeModal;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function openLabelModal(pIdx, key, defaultLabel){
  const page = state.pages[pIdx];
  ensurePageUI(page);
  const now = page.textLabels[key] || defaultLabel;
  mContent.innerHTML = `
    <h3>タイトル名の変更</h3>
    <input type="text" id="m-label" value="${escapeHtml(now)}" placeholder="タイトルを入力">
    <div style="display:flex; gap:10px; margin-top:10px;">
      <button class="btn primary" id="m-save-label" style="flex:1">保存</button>
      <button class="btn" id="m-close" style="flex:1">閉じる</button>
    </div>
  `;
  document.getElementById("m-save-label").onclick = ()=>{
    const v = document.getElementById("m-label").value.trim();
    snapshotState();
    page.textLabels[key] = v || defaultLabel;
    closeModal();
  };
  document.getElementById("m-close").onclick = closeModal;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}
modal.addEventListener("click",(e)=>{ if(e.target===modal) closeModal(); });

function closeModal(){
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  render(); // 入力後にページ数が変わるので再計算
}

/* 写真編集 */
let phCtx = null;
function openPhotoModal(pIdx, key){
  const ph = state.pages[pIdx].fields[key];
  phCtx = { pIdx, key, ph };
  mContent.innerHTML = `
    <h3>写真編集</h3>
    <div class="editor-canvas" id="canvas">
      ${ph.src ? `<img id="e-img" src="${ph.src}" alt="">` : `<div style="color:#cbd5e1; text-align:center; padding-top:110px; font-weight:900;">写真なし</div>`}
    </div>
    <div class="controls">
      <button class="btn" id="e-pick">📸 選択</button>
      <button class="btn" id="e-zoom-in">＋ 拡大</button>
      <button class="btn" id="e-zoom-out">− 縮小</button>
      <button class="btn" id="e-rot">🔄 回転</button>
      <button class="btn" id="e-del">🗑 削除</button>
      <button class="btn" id="e-center">🎯 中央</button>
      <button class="btn" id="e-done">✅ 完了</button>
    </div>
    <div style="margin-top:10px;">
      <input type="text" id="e-cap" value="${escapeHtml(ph.cap || "")}" placeholder="キャプション">
    </div>
  `;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");

  document.getElementById("e-pick").onclick = ()=> fileInput.click();
  document.getElementById("e-zoom-in").onclick = ()=>{ snapshotState(); ph.s = Math.min(3, (ph.s||1) + 0.1); syncEditor(); };
  document.getElementById("e-zoom-out").onclick = ()=>{ snapshotState(); ph.s = Math.max(0.5, (ph.s||1) - 0.1); syncEditor(); };
  document.getElementById("e-rot").onclick = ()=>{ snapshotState(); ph.r = ((ph.r||0)+90)%360; syncEditor(); };
  document.getElementById("e-del").onclick = ()=>{ snapshotState(); ph.src=""; ph.s=1; ph.x=0; ph.y=0; ph.r=0; syncEditor(true); };
  document.getElementById("e-center").onclick = ()=>{ snapshotState(); ph.x=0; ph.y=0; ph.s=1; ph.r=0; syncEditor(); };
  document.getElementById("e-done").onclick = ()=>{ setByPath(state.pages[pIdx].fields, `${key}.cap`, document.getElementById("e-cap").value); closeModal(); };

  attachGestures();   // ←ここはそのまま
  syncEditor();
}

fileInput.onchange = (e)=>{
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    snapshotState();
    phCtx.ph.src = ev.target.result;
    phCtx.ph.s=1; phCtx.ph.x=0; phCtx.ph.y=0; phCtx.ph.r=0;
    showToast("写真を読み込みました");
    openPhotoModal(phCtx.pIdx, phCtx.key);
  };
  reader.readAsDataURL(f);
  fileInput.value = "";
};

function syncEditor(noImg){
  const img = document.getElementById("e-img");
  if(img && !noImg){
    img.style.transform =
      `translate(${phCtx.ph.x||0}px, ${phCtx.ph.y||0}px) translate(-50%, -50%) rotate(${phCtx.ph.r||0}deg) scale(${phCtx.ph.s||1})`;
  }
}

/* =========================
   ★修正点：ここだけ（ピンチ対応をPointerEventsで実装）
   他の部分は変更なし
========================= */
function attachGestures(){
  const canvas = document.getElementById("canvas");
  if(!canvas) return;

  // 既存ハンドラを上書き（openPhotoModalを複数回開いても増殖しない）
  canvas.onpointerdown = null;
  canvas.onpointermove = null;
  canvas.onpointerup = null;
  canvas.onpointercancel = null;

  const active = new Map(); // pointerId -> {x,y}
  let dragBase = null;      // {pid, sx, sy, bx, by}
  let pinchBase = null;     // {d0, s0, mid0:{x,y}, bx, by}

  const clamp = (v,min,max)=> Math.min(max, Math.max(min, v));
  const dist = (a,b)=> Math.hypot(a.x-b.x, a.y-b.y);
  const mid  = (a,b)=> ({ x:(a.x+b.x)/2, y:(a.y+b.y)/2 });

  const recalcBaseAfterChange = ()=>{
    if(active.size === 1){
      const [pid, p] = active.entries().next().value;
      dragBase = { pid, sx:p.x, sy:p.y, bx:phCtx.ph.x||0, by:phCtx.ph.y||0 };
      pinchBase = null;
    }else if(active.size === 2){
      const pts = [...active.values()];
      const m0 = mid(pts[0], pts[1]);
      pinchBase = {
        d0: Math.max(1, dist(pts[0], pts[1])),
        s0: phCtx.ph.s || 1,
        mid0: m0,
        bx: phCtx.ph.x || 0,
        by: phCtx.ph.y || 0
      };
      dragBase = null;
    }else{
      dragBase = null;
      pinchBase = null;
    }
  };

  canvas.onpointerdown = (e)=>{
    if(!phCtx?.ph?.src) return;
    if(active.size === 0) snapshotState();
    canvas.setPointerCapture(e.pointerId);
    active.set(e.pointerId, {x:e.clientX, y:e.clientY});
    recalcBaseAfterChange();
  };

  canvas.onpointermove = (e)=>{
    if(!phCtx?.ph?.src) return;
    if(!active.has(e.pointerId)) return;

    active.set(e.pointerId, {x:e.clientX, y:e.clientY});

    // 2本指: ピンチ（拡大縮小）＋ミッドポイント移動でパン
    if(active.size === 2 && pinchBase){
      const pts = [...active.values()];
      const d = Math.max(1, dist(pts[0], pts[1]));
      const mNow = mid(pts[0], pts[1]);

      phCtx.ph.s = clamp(pinchBase.s0 * (d / pinchBase.d0), 0.5, 3.0);
      phCtx.ph.x = pinchBase.bx + (mNow.x - pinchBase.mid0.x);
      phCtx.ph.y = pinchBase.by + (mNow.y - pinchBase.mid0.y);
      syncEditor();
      return;
    }

    // 1本指: ドラッグ移動
    if(active.size === 1 && dragBase && dragBase.pid === e.pointerId){
      phCtx.ph.x = dragBase.bx + (e.clientX - dragBase.sx);
      phCtx.ph.y = dragBase.by + (e.clientY - dragBase.sy);
      syncEditor();
      return;
    }
  };

  const onEnd = (e)=>{
    if(active.has(e.pointerId)) active.delete(e.pointerId);
    recalcBaseAfterChange();
  };
  canvas.onpointerup = onEnd;
  canvas.onpointercancel = onEnd;
  canvas.onwheel = (e)=>{
    if(!phCtx?.ph?.src) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    phCtx.ph.s = clamp((phCtx.ph.s || 1) + delta, 0.5, 3.0);
    syncEditor();
  };
}

/* =========================
   出力処理 (PDF / Print)
========================= */
const prog = document.getElementById("progress");
const pText = document.getElementById("p-text");
const pBar  = document.getElementById("p-bar");
const toast = document.getElementById("toast");
let toastTimer = null;

function showToast(message){
  if(!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>toast.classList.remove("show"), 2200);
}

function snapshotState(){
  historyStack.push(clone(state));
  if(historyStack.length > HISTORY_LIMIT) historyStack.shift();
  syncUndoButton();
}

function syncUndoButton(){
  const btnUndo = document.getElementById("btnUndo");
  if(btnUndo) btnUndo.disabled = historyStack.length === 0;
}

document.getElementById("btnPrintPdf").onclick = async ()=>{
  if(!isMobile) await printAll();
  else await genPDF();
};

async function printAll(){
  const host = document.getElementById("exportHost");
  host.innerHTML = "";

  for(let i=0; i<state.pages.length; i++){
    const blocks = createPageBlocks(i, true);
    const sheets = paginateBlocks(blocks);
    sheets.forEach(s => {
      const wrap = document.createElement("div");
      wrap.className = "sheet-wrap";
      wrap.appendChild(s);
      host.appendChild(wrap);
    });
  }

  const style = document.createElement("style");
  style.innerHTML = `@media print { #exportHost { display:block !important; position:static !important; opacity:1 !important; z-index:9999 !important; } }`;
  document.head.appendChild(style);

  window.print();

  setTimeout(()=>{ host.innerHTML = ""; document.head.removeChild(style); }, 1000);
}

async function genPDF(){
  if(!window.html2canvas || !window.jspdf){ alert("ライブラリ読込エラー"); return; }
  prog.style.display = "flex"; pBar.style.width = "0%";
  await new Promise(r=>setTimeout(r,100));
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  const host = document.getElementById("exportHost");
  host.innerHTML = "";

  const allSheets = [];
  for(let i=0; i<state.pages.length; i++){
    const blocks = createPageBlocks(i, true);
    const sheets = paginateBlocks(blocks);
    allSheets.push(...sheets);
  }

  try {
    for(let i=0; i<allSheets.length; i++){
      pText.textContent = `ページ ${i+1} / ${allSheets.length} 作成中...`;
      pBar.style.width = `${Math.round((i/allSheets.length)*100)}%`;

      const wrap = document.createElement("div");
      wrap.style.width = "210mm"; wrap.style.height = "297mm"; wrap.style.background="#fff";
      wrap.appendChild(allSheets[i]);
      host.appendChild(wrap);

      await new Promise(r=>requestAnimationFrame(r));

      const canvas = await html2canvas(wrap, { scale: 2, useCORS:true, backgroundColor:"#ffffff" });
      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      if(i>0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);

      host.innerHTML = "";
    }
  } catch(e){
    console.error(e); alert("エラーが発生しました"); prog.style.display="none"; return;
  }

  pText.textContent = "保存中...";
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `supportbook_${Date.now()}.pdf`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 60000);
  prog.style.display="none";
  showToast("PDFを保存しました");
}

/* =========================
   Utils / State
========================= */
document.getElementById("btnExport").onclick = ()=>{
  const b = new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = url;
  a.download = `supportbook_data_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 60_000);
  showToast("データを保存しました");
};
document.getElementById("btnUndo").onclick = ()=>{
  if(historyStack.length === 0) return;
  state = historyStack.pop();
  showToast("ひとつ前に戻しました");
  render();
};
document.getElementById("btnImport").onclick = ()=>{
  const i = document.createElement("input"); i.type="file"; i.accept=".json";
  i.onchange=async(e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    try{
      snapshotState();
      state = normalizeState(JSON.parse(await file.text()));
      currentPage=0;
      subPageByTab[0]=0;
      showToast("データを読み込みました");
      render();
    }
    catch{
      alert("読込失敗：JSONファイルの形式を確認してください");
    }
  };
  i.click();
};
document.getElementById("btnReset").onclick = ()=>{
  if(confirm("入力内容をすべて消去します。よろしいですか？")){
    snapshotState();
    state=clone(TEMPLATE);
    currentPage=0;
    for(const k of Object.keys(subPageByTab)) delete subPageByTab[k];
    subPageByTab[0]=0;
    showToast("入力内容をリセットしました");
    render();
  }
};

function persist(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch(e){
    console.warn("保存に失敗しました。容量上限の可能性があります。", e);
    showToast("自動保存に失敗しました。容量を確認してください");
  }
}
function loadState(){ try{ return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY))); }catch{ return clone(TEMPLATE); } }
function normalizeState(obj){
  const out = clone(TEMPLATE);
  if(!obj || !Array.isArray(obj.pages)) return out;
  out.pages.forEach(tp=>{
    const sp = obj.pages.find(p=>p.id===tp.id);
    if(sp && sp.fields) Object.keys(tp.fields).forEach(k=> tp.fields[k] = sp.fields[k] ?? tp.fields[k]);
    tp.textLabels = { ...(PAGE_TEXT_LABELS[tp.id] || {}), ...((sp && sp.textLabels) || {}) };
    tp.photoSlots = clone((sp && sp.photoSlots) || (PAGE_PHOTO_SLOTS[tp.id] || []));
    if(sp && sp.fields){
      Object.keys(sp.fields).forEach(k=>{
        if(tp.fields[k] == null && typeof sp.fields[k] === "object" && "src" in sp.fields[k]){
          tp.fields[k] = sp.fields[k];
        }
      });
    }
    ensurePageUI(tp);
  });
  return out;
}
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[m]); }
function getByPath(o,p){ return p.split('.').reduce((x,k)=>x&&x[k], o); }
function setByPath(o,p,v){
  const k=p.split('.');
  const last=k.pop();
  const t=k.reduce((x,key)=>x && x[key], o);
  if(!t) return;
  if(t[last] === v) return;
  snapshotState();
  t[last]=v;
}

// 初期化
subPageByTab[0]=0;
render();
