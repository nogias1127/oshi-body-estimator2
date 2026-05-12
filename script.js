const $ = (id) => document.getElementById(id);

const frameProfiles = {
  adultMale: {
    label: "成人男性寄り",
    bmi: 1.0,
    shoulder: 1.0,
    chest: 1.0,
    waist: 1.0,
    hip: 1.0,
    neck: 1.0,
    limb: 1.0,
    hand: 1.0,
    foot: 1.0,
    comment: "成人男性らしい肩幅・胸囲・手足の存在感が出やすい比率です。"
  },
  neutralMale: {
    label: "中性的男性",
    bmi: 0.96,
    shoulder: 0.96,
    chest: 0.96,
    waist: 0.97,
    hip: 0.98,
    neck: 0.94,
    limb: 0.95,
    hand: 0.97,
    foot: 0.98,
    comment: "肩幅や首周りはやや控えめで、線の細さや中性的なすっきり感が出やすい比率です。"
  },
  boyishMale: {
    label: "少年寄り男性",
    bmi: 0.92,
    shoulder: 0.93,
    chest: 0.93,
    waist: 0.95,
    hip: 0.96,
    neck: 0.90,
    limb: 0.91,
    hand: 0.94,
    foot: 0.96,
    comment: "全体的に細く軽めで、成長途中・少年寄りの体格に近い印象になります。"
  }
};

const bodyProfiles = {
  slender: {
    label: "華奢",
    bmi: [18.2, 20.0],
    shoulder: 0.97,
    chest: 0.94,
    waist: 0.95,
    hip: 0.96,
    neck: 0.94,
    limb: 0.96,
    comment: "全体的に線が細く、衣装のシルエットがすっきり出やすいタイプです。"
  },
  slim: {
    label: "細身",
    bmi: [19.2, 21.2],
    shoulder: 0.99,
    chest: 0.97,
    waist: 0.96,
    hip: 0.98,
    neck: 0.97,
    limb: 0.98,
    comment: "細身ながら、身長に対して自然な骨格の存在感が出るタイプです。"
  },
  standard: {
    label: "標準",
    bmi: [20.8, 22.8],
    shoulder: 1.0,
    chest: 1.0,
    waist: 1.0,
    hip: 1.0,
    neck: 1.0,
    limb: 1.0,
    comment: "極端に細すぎず大きすぎず、日常描写に落とし込みやすい体格です。"
  },
  muscular: {
    label: "筋肉質",
    bmi: [22.5, 24.8],
    shoulder: 1.04,
    chest: 1.07,
    waist: 1.02,
    hip: 1.03,
    neck: 1.05,
    limb: 1.07,
    comment: "肩・胸・腕に厚みが出やすく、服越しにも体格の良さが見えやすいタイプです。"
  },
  solid: {
    label: "がっしり",
    bmi: [24.0, 27.0],
    shoulder: 1.06,
    chest: 1.09,
    waist: 1.06,
    hip: 1.06,
    neck: 1.08,
    limb: 1.09,
    comment: "全体に安定感があり、隣に立った時の存在感が大きく出るタイプです。"
  }
};

const handProfiles = {
  small: {
    label: "小さめ",
    factor: 0.96,
    comment: "手は身長に対して少し控えめで、指先の印象はすっきりしやすいです。"
  },
  normal: {
    label: "標準",
    factor: 1.0,
    comment: "手の大きさは身長相応で、自然なサイズ感です。"
  },
  large: {
    label: "大きめ",
    factor: 1.05,
    comment: "手を重ねた時に、包まれる印象が出やすい大きさです。"
  },
  long: {
    label: "指が長い",
    factor: 1.04,
    comment: "手全体というより、指の長さが印象に残りやすいタイプです。"
  }
};

const legProfiles = {
  short: {
    label: "短め",
    factor: -0.015,
    comment: "脚の長さはやや現実寄りで、安定した立ち姿になりやすいです。"
  },
  normal: {
    label: "標準",
    factor: 0,
    comment: "身長に対して自然な脚の長さです。"
  },
  long: {
    label: "長め",
    factor: 0.018,
    comment: "脚が長めに見え、立ち絵やスーツ姿で映えやすい比率です。"
  },
  veryLong: {
    label: "かなり長め",
    factor: 0.032,
    comment: "かなり二次元寄りの脚長体型で、全身シルエットがすらっと見えます。"
  }
};

function round(value, digits = 1) {
  return Number(value).toFixed(digits);
}

function rangeText(min, max, unit = "cm") {
  return `${round(min)}〜${round(max)}${unit}`;
}

function sanitizeFileName(name) {
  return String(name || "あの人")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80) || "あの人";
}

function getSelectedValue(id, fallback) {
  const element = $(id);
  return element ? element.value : fallback;
}

function setValueIfExists(id, value) {
  const element = $(id);
  if (element) {
    element.value = value;
  }
}

function estimate() {
  const name = $("oshiName").value.trim() || "あの人";
  const height = Number($("height").value);

  const frameType = getSelectedValue("frameType", "adultMale");
  const bodyType = getSelectedValue("bodyType", "standard");
  const headRatio = Number(getSelectedValue("headRatio", "7.5"));
  const handType = getSelectedValue("handType", "normal");
  const legType = getSelectedValue("legType", "normal");

  if (!height || height < 100 || height > 250) {
    alert("推しの身長を100〜250cmの範囲で入力してください。");
    return;
  }

  const frame = frameProfiles[frameType] || frameProfiles.adultMale;
  const body = bodyProfiles[bodyType] || bodyProfiles.standard;
  const hand = handProfiles[handType] || handProfiles.normal;
  const leg = legProfiles[legType] || legProfiles.normal;

  const heightM = height / 100;
  const minWeight = body.bmi[0] * frame.bmi * heightM * heightM;
  const maxWeight = body.bmi[1] * frame.bmi * heightM * heightM;

  const headHeight = height / headRatio;

  const shoulder = height * 0.245 * frame.shoulder * body.shoulder;
  const chest = height * 0.52 * frame.chest * body.chest;
  const waist = height * 0.43 * frame.waist * body.waist;
  const hip = height * 0.50 * frame.hip * body.hip;
  const neck = height * 0.215 * frame.neck * body.neck;

  const inseamBase = 0.455 + leg.factor + ((headRatio - 7.5) * 0.006);
  const inseam = height * inseamBase;
  const torso = height - inseam - headHeight * 0.55;

  const arm = height * 0.32 * frame.limb;
  const sleeve = height * 0.45 * frame.limb;
  const upperArm = height * 0.158 * frame.limb * body.limb;
  const wrist = height * 0.088 * frame.limb * body.limb;
  const thigh = height * 0.295 * frame.limb * body.limb;
  const calf = height * 0.205 * frame.limb * body.limb;

  const handLength = height * 0.108 * frame.hand * hand.factor;
  const handWidth = handLength * 0.48;
  const middleFinger = handLength * (handType === "long" ? 0.465 : 0.435);

  const footLength = height * 0.151 * frame.foot;
  const shoeSize = footLength + 1.0;
  const footWidth = footLength * 0.39;

  const ringCircMm = handLength * 10 * 0.31;
  const ringSize = ringCircMm - 40;
  const ringMin = Math.max(1, ringSize - 1.5);
  const ringMax = ringSize + 1.5;

  const basicRows = [
    ["身体ベース", frame.label],
    ["体格タイプ", body.label],
    ["身長", `${round(height)}cm`],
    ["推定体重", rangeText(minWeight, maxWeight, "kg")],
    ["頭の高さ", `${round(headHeight)}cm`],
    ["首周り", `${round(neck)}cm前後`],
    ["肩幅", `${round(shoulder)}cm前後`],
    ["胸囲", rangeText(chest * 0.97, chest * 1.03)],
    ["ウエスト", rangeText(waist * 0.97, waist * 1.03)],
    ["ヒップ", rangeText(hip * 0.97, hip * 1.03)],
    ["背丈・胴まわり", `${round(torso)}cm前後`],
    ["股下", `${round(inseam)}cm前後`],
    ["腕の長さ", `${round(arm)}cm前後`],
    ["裄丈の目安", `${round(sleeve)}cm前後`]
  ];

  const detailRows = [
    ["手の長さ", `${round(handLength)}cm前後`],
    ["手幅", `${round(handWidth)}cm前後`],
    ["中指の長さ", `${round(middleFinger)}cm前後`],
    ["手首周り", `${round(wrist)}cm前後`],
    ["上腕周り", `${round(upperArm)}cm前後`],
    ["太もも周り", `${round(thigh)}cm前後`],
    ["ふくらはぎ", `${round(calf)}cm前後`],
    ["足長", `${round(footLength)}cm前後`],
    ["足幅", `${round(footWidth)}cm前後`],
    ["靴サイズ目安", `${round(shoeSize, 1)}cm前後`],
    ["指輪サイズ目安", `${Math.round(ringMin)}〜${Math.round(ringMax)}号相当`]
  ];

  const memos = createMemos({
    name,
    height,
    frame,
    body,
    hand,
    leg,
    shoulder,
    chest,
    waist,
    inseam,
    handLength,
    shoeSize,
    ringMin,
    ringMax
  });

  const compareMemos = createCompareMemos({
    name,
    height,
    handLength,
    shoeSize,
    userHeight: Number($("userHeight").value),
    userHand: Number($("userHand").value),
    userShoe: Number($("userShoe").value)
  });

  $("resultTitle").textContent = `${name}の推定身体情報`;
  $("summaryText").textContent = createSummary(name, frame, body, hand, leg, height, shoulder, handLength);

  renderTable($("basicTable"), basicRows);
  renderTable($("detailTable"), detailRows);
  renderList($("memoList"), memos);
  renderList($("compareList"), compareMemos);

  $("compareCard").classList.toggle("hidden", compareMemos.length === 0);
  $("resultSection").classList.remove("hidden");

  const resultText = buildCopyText(name, basicRows, detailRows, memos, compareMemos);
  $("copyButton").dataset.copyText = resultText;

  $("resultSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

function createSummary(name, frame, body, hand, leg, height, shoulder, handLength) {
  const shoulderImpression =
    shoulder / height > 0.25
      ? "肩幅に少し存在感があり"
      : shoulder / height < 0.24
        ? "肩まわりはすっきりしていて"
        : "肩幅は自然で";

  return `${name}は、${frame.label}ベースの${body.label}寄り、${round(height)}cm想定です。${shoulderImpression}、${frame.comment}${body.comment}${hand.comment}${leg.comment} 手の長さは約${round(handLength)}cmで、触れた時のサイズ感を想像しやすい推定になっています。`;
}

function createMemos(data) {
  const memos = [];

  memos.push(`身体ベースは「${data.frame.label}」。${data.frame.comment}`);
  memos.push(`体格タイプは「${data.body.label}」。${data.body.comment}`);
  memos.push(`手の印象は「${data.hand.label}」。手長は約${round(data.handLength)}cmで、手を重ねる描写や恋人繋ぎのサイズ感の目安になります。`);
  memos.push(`脚の印象は「${data.leg.label}」。股下は約${round(data.inseam)}cmで、立ち姿や歩幅のイメージ作りに使えます。`);

  if (data.chest - data.waist > 16) {
    memos.push("胸囲とウエストの差が出やすく、服越しにも上半身のラインがすっきり見えるタイプです。");
  } else {
    memos.push("胸囲とウエストの差は控えめで、自然体・生活感のあるシルエットに寄せやすいです。");
  }

  if (data.shoeSize >= 27) {
    memos.push(`靴サイズは約${round(data.shoeSize)}cm。玄関に並べた時、足元の存在感がかなり出やすいです。`);
  } else {
    memos.push(`靴サイズは約${round(data.shoeSize)}cm。身長に対して自然な足元のサイズ感です。`);
  }

  memos.push(`指輪サイズは${Math.round(data.ringMin)}〜${Math.round(data.ringMax)}号相当の推定です。ペアリングや手元描写の目安にできます。`);

  return memos;
}

function createCompareMemos(data) {
  const memos = [];

  if (!data.userHeight && !data.userHand && !data.userShoe) {
    return memos;
  }

  if (data.userHeight) {
    const diff = data.height - data.userHeight;
    const abs = Math.abs(diff);

    if (abs < 2) {
      memos.push(`身長差は約${round(abs)}cm。ほぼ同じ目線で、並んだ時の距離感はかなり近めです。`);
    } else if (diff > 0) {
      memos.push(`身長差は約${round(abs)}cm。あなたが少し見上げる形になり、正面で向き合うと目線差が出ます。`);
    } else {
      memos.push(`身長差は約${round(abs)}cm。あなたの方が少し高く、相手の表情を上から見やすい距離感です。`);
    }

    memos.push(`ハグ位置の目安：${estimateHugPosition(diff)}`);
  }

  const estimatedUserHand = data.userHand || (data.userHeight ? data.userHeight * 0.108 : null);

  if (estimatedUserHand) {
    const handDiff = data.handLength - estimatedUserHand;

    if (Math.abs(handDiff) < 0.8) {
      memos.push(`手の長さ差は約${round(Math.abs(handDiff))}cm。手を重ねても差は控えめで、近いサイズ感です。`);
    } else if (handDiff > 0) {
      memos.push(`手の長さ差は約${round(handDiff)}cm。相手の手の方が大きく、包まれる印象が出やすいです。`);
    } else {
      memos.push(`手の長さ差は約${round(Math.abs(handDiff))}cm。あなたの手の方が少し大きめの推定です。`);
    }
  }

  if (data.userShoe) {
    const shoeDiff = data.shoeSize - data.userShoe;

    if (Math.abs(shoeDiff) < 0.8) {
      memos.push(`靴サイズ差は約${round(Math.abs(shoeDiff))}cm。玄関に並べても近いサイズ感です。`);
    } else if (shoeDiff > 0) {
      memos.push(`靴サイズ差は約${round(shoeDiff)}cm。相手の靴の方が大きく、並べた時に生活感が出やすいです。`);
    } else {
      memos.push(`靴サイズ差は約${round(Math.abs(shoeDiff))}cm。あなたの靴の方が少し大きめの推定です。`);
    }
  }

  return memos;
}

function estimateHugPosition(heightDiff) {
  if (heightDiff >= 22) {
    return "あなたの顔は相手の胸元〜鎖骨下あたりに来やすいです。";
  }
  if (heightDiff >= 12) {
    return "あなたの顔は相手の鎖骨〜肩口あたりに来やすいです。";
  }
  if (heightDiff >= 5) {
    return "目線差は少しあり、肩に顔を寄せやすい高さです。";
  }
  if (heightDiff > -5) {
    return "かなり近い目線で、正面から抱きしめると顔の距離が近くなりやすいです。";
  }
  return "あなたの方が少し高めで、相手の頭や肩を抱き込む描写に寄せやすいです。";
}

function renderTable(target, rows) {
  if (!target) return;

  target.innerHTML = rows
    .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
    .join("");
}

function renderList(target, items) {
  if (!target) return;

  target.innerHTML = items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function buildCopyText(name, basicRows, detailRows, memos, compareMemos) {
  const rowsToText = (title, rows) => {
    const body = rows.map(([label, value]) => `・${label}：${value}`).join("\n");
    return `【${title}】\n${body}`;
  };

  const memoText = memos.map((memo) => `・${memo}`).join("\n");
  const compareText = compareMemos.length
    ? `\n\n【あなたとの比較】\n${compareMemos.map((memo) => `・${memo}`).join("\n")}`
    : "";

  return `【${name}の推定身体情報】\n\n${rowsToText("基本寸法", basicRows)}\n\n${rowsToText("手・足・指まわり", detailRows)}\n\n【創作メモ】\n${memoText}${compareText}\n\n※この結果は公式情報ではありません。創作・妄想補助用の推定値です。`;
}

async function copyResult() {
  const copyButton = $("copyButton");
  const text = copyButton?.dataset.copyText;

  if (!text) {
    alert("先に「推定する」を押して結果を表示してください。");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    const originalText = copyButton.textContent;
    copyButton.textContent = "コピーしました";

    setTimeout(() => {
      copyButton.textContent = originalText;
    }, 1600);
  } catch (error) {
    console.error(error);
    alert("コピーに失敗しました。ブラウザの設定をご確認ください。");
  }
}

async function saveResultAsPng() {
  const resultSection = $("resultSection");
  const button = $("savePngButton");

  if (!resultSection || resultSection.classList.contains("hidden")) {
    alert("先に「推定する」を押して結果を表示してください。");
    return;
  }

  if (typeof html2canvas === "undefined") {
    alert("画像保存用ライブラリの読み込みに失敗しています。ページを再読み込みしてください。");
    return;
  }

  if (!button) {
    alert("PNG保存ボタンが見つかりません。ページを再読み込みしてください。");
    return;
  }

  const originalText = button.textContent;

  try {
    button.textContent = "生成中...";
    button.disabled = true;

    await new Promise((resolve) => setTimeout(resolve, 80));

    const canvas = await html2canvas(resultSection, {
      backgroundColor: "#f7f2ee",
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      useCORS: true,
      logging: false,
      ignoreElements: (element) => element.hasAttribute("data-html2canvas-ignore")
    });

    const name = sanitizeFileName($("oshiName").value || "あの人");
    const fileName = `${name}_推定身体情報.png`;

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });

    if (!blob) {
      throw new Error("canvas.toBlob returned null");
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    button.textContent = "保存しました";

    setTimeout(() => {
      button.textContent = originalText;
    }, 1600);
  } catch (error) {
    console.error(error);
    alert("PNG保存に失敗しました。ブラウザのコンソールをご確認ください。");
    button.textContent = originalText;
  } finally {
    button.disabled = false;
  }
}

function resetForm() {
  $("oshiName").value = "";
  $("height").value = "";

  setValueIfExists("frameType", "adultMale");
  setValueIfExists("bodyType", "standard");
  setValueIfExists("headRatio", "7.5");
  setValueIfExists("handType", "normal");
  setValueIfExists("legType", "normal");

  $("userHeight").value = "";
  $("userHand").value = "";
  $("userShoe").value = "";

  $("resultSection").classList.add("hidden");
  $("copyButton").dataset.copyText = "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindEvents() {
  const estimateButton = $("estimateButton");
  const resetButton = $("resetButton");
  const copyButton = $("copyButton");
  const savePngButton = $("savePngButton");

  if (estimateButton) {
    estimateButton.addEventListener("click", estimate);
  }

  if (resetButton) {
    resetButton.addEventListener("click", resetForm);
  }

  if (copyButton) {
    copyButton.addEventListener("click", copyResult);
  }

  if (savePngButton) {
    savePngButton.addEventListener("click", saveResultAsPng);
  } else {
    console.warn("savePngButton が見つかりません。index.html のボタンIDを確認してください。");
  }
}

document.addEventListener("DOMContentLoaded", bindEvents);
