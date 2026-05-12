/* =========================================================
  推し身体推定メーカー - script.js
  ---------------------------------------------------------
  画像必須版：
  1. 入力欄は「名前・身長・手の印象」
  2. 頭身・脚長・肩幅・体格傾向は立ち絵画像の9点指定から補助推定
  3. 結果は「身体の輪郭」「手・指・足元」「あなたとの距離感」「画像補正の根拠」に分けて表示
========================================================= */

/* =========================================================
  0. DOM取得ショートカット
========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
  1. 状態管理
========================================================= */

const poseImageState = {
  image: null,
  objectUrl: null,
  naturalWidth: 0,
  naturalHeight: 0,
  canvasWidth: 0,
  canvasHeight: 0,
  scale: 1
};

const posePoints = [
  { key: "top", label: "頭頂" },
  { key: "chin", label: "あご" },
  { key: "leftShoulder", label: "左肩" },
  { key: "rightShoulder", label: "右肩" },
  { key: "leftWaist", label: "ウエスト左" },
  { key: "rightWaist", label: "ウエスト右" },
  { key: "crotch", label: "股下" },
  { key: "leftFoot", label: "左足先" },
  { key: "rightFoot", label: "右足先" }
];

const posePointState = {
  points: [],
  result: null
};

const imageAssistProfile = {
  enabled: false,
  headRatio: null,
  legType: null,
  frameType: null,
  bodyType: null
};

let lastPoseClickTime = 0;


/* =========================================================
  2. 推定用プロフィール定義
========================================================= */

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


/* =========================================================
  3. 汎用ユーティリティ
========================================================= */

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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resetImageAssistProfile() {
  imageAssistProfile.enabled = false;
  imageAssistProfile.headRatio = null;
  imageAssistProfile.legType = null;
  imageAssistProfile.frameType = null;
  imageAssistProfile.bodyType = null;
}

function clearImageAssistResult() {
  const resultBox = $("imageAssistResult");
  if (resultBox) {
    resultBox.innerHTML = "";
  }
}


/* =========================================================
  4. 身体推定メイン処理
========================================================= */

function estimate() {
  const name = $("oshiName")?.value.trim() || "あの人";
  const height = Number($("height")?.value);
  const handType = getSelectedValue("handType", "normal");

  if (!height || height < 100 || height > 250) {
    alert("推しの身長を100〜250cmの範囲で入力してください。");
    return;
  }

  const effectiveProfile = imageAssistProfile.enabled
    ? imageAssistProfile
    : getEffectiveImageProfile();

  if (!effectiveProfile) {
    alert("先に立ち絵画像を読み込み、9つの測定点を指定してください。");
    return;
  }

  const frameType = effectiveProfile.frameType || "adultMale";
  const bodyType = effectiveProfile.bodyType || "standard";
  const headRatio = Number(effectiveProfile.headRatio || 7.5);
  const legType = effectiveProfile.legType || "normal";

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

  const imageResult = posePointState.result || calculateImageAssist();
  const ringSizes = createRingSizeMap(ringSize);

const basicRows = createBodyContourRows({
  frame,
  body,
  hand,
  leg,
  height,
  minWeight,
  maxWeight,
  headHeight,
  neck,
  shoulder,
  chest,
  waist,
  hip,
  torso,
  inseam,
  arm,
  sleeve,
  imageResult
});

const handRows = createHandRows({
  handLength,
  handWidth,
  middleFinger,
  wrist,
  upperArm
});

const ringRows = createRingRows({
  ringSizes
});

const footRows = createFootRows({
  thigh,
  calf,
  footLength,
  footWidth,
  shoeSize
});

const detailRows = [
  ...handRows,
  ...ringRows,
  ...footRows
];

  const memos = createImageEvidenceMemos({
    imageResult,
    frame,
    body,
    leg
  });

  const compareMemos = createDistanceMemos({
    height,
    shoulder,
    arm,
    inseam,
    handLength,
    shoeSize,
    userHeight: Number($("userHeight")?.value),
    userHand: Number($("userHand")?.value),
    userShoe: Number($("userShoe")?.value)
  });

  if ($("resultTitle")) $("resultTitle").textContent = `${name}の推定身体情報`;

  if ($("summaryText")) {
    $("summaryText").textContent = createSummary(name, frame, body, hand, leg, height, shoulder, handLength);
  }

  renderTable($("basicTable"), basicRows);
  renderTable($("handTable"), handRows);
  renderTable($("ringTable"), ringRows);
  renderTable($("footTable"), footRows);
  renderList($("memoList"), memos);
  renderList($("compareList"), compareMemos);

  const compareCard = $("compareCard");
  if (compareCard) {
    compareCard.classList.toggle("hidden", compareMemos.length === 0);
  }

  if ($("resultSection")) $("resultSection").classList.remove("hidden");

  const resultText = buildCopyText(name, basicRows, detailRows, memos, compareMemos);
  if ($("copyButton")) $("copyButton").dataset.copyText = resultText;

  $("resultSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function createSummary(name, frame, body, hand, leg, height, shoulder, handLength) {
  const shoulderImpression =
    shoulder / height > 0.25
      ? "肩幅に少し存在感があり"
      : shoulder / height < 0.24
        ? "肩まわりはすっきりしていて"
        : "肩幅は自然で";

  return `${name}は、画像補正から${getBodyImpressionLabel(frame, body)}として推定しています。${round(height)}cm想定で、${shoulderImpression}、手の長さは約${round(handLength)}cm。手を重ねた時や隣に立った時のサイズ感を想像しやすい結果です。`;
}

function createBodyContourRows(data) {
  return [
    ["身体の印象", getBodyImpressionLabel(data.frame, data.body)],
    ["体格の輪郭", getBodyContourLabel(data.frame, data.body)],
    ["シルエット", getImageSilhouetteDescription(data.imageResult)],
    ["肩と腰の差", getShoulderWaistDescription(data.imageResult)],
    ["上半身の存在感", getUpperBodyPresenceDescription(data.imageResult, data.shoulder, data.height)],
    ["重心の印象", getBodyBalanceDescription(data.imageResult)],
    ["服越しのライン", getClothingLineDescription(data.frame, data.body, data.imageResult)],
    ["抱きしめた時の面積感", getEmbraceSurfaceDescription(data.shoulder, data.chest, data.height)],
    ["身長", `${round(data.height)}cm`],
    ["体重", `${rangeText(data.minWeight, data.maxWeight, "kg")}kg`],
    ["頭の大きさ", `${round(data.headHeight)}cm前後`],
    ["首まわり", `${round(data.neck)}cm前後 / ${getNeckImpression(data.neck, data.height)}`],
    ["肩幅", `${round(data.shoulder)}cm前後 / ${getShoulderImpression(data.shoulder, data.height)}`],
    ["胸まわり", `${rangeText(data.chest * 0.97, data.chest * 1.03)} / ${getChestImpression(data.chest, data.waist)}`],
    ["腰まわり", `${rangeText(data.waist * 0.97, data.waist * 1.03)} / ${getWaistImpression(data.waist, data.height)}`],
    ["ヒップライン", `${rangeText(data.hip * 0.97, data.hip * 1.03)}`],
    ["上半身の長さ", `${round(data.torso)}cm前後`],
    ["脚の長さ", `${round(data.inseam)}cm前後 / ${data.leg.label}`],
    ["腕の長さ", `${round(data.arm)}cm前後`],
    ["袖丈の目安", `${round(data.sleeve)}cm前後`]
  ];
}

function createHandRows(data) {
  return [
    ["手の長さ", `${round(data.handLength)}cm前後`],
    ["手幅", `${round(data.handWidth)}cm前後`],
    ["中指", `${round(data.middleFinger)}cm前後`],
    ["手首", `${round(data.wrist)}cm前後`],
    ["上腕", `${round(data.upperArm)}cm前後`]
  ];
}

function createRingRows(data) {
  return [
    ["親指", `${data.ringSizes.thumb}号相当`],
    ["人差指", `${data.ringSizes.index}号相当`],
    ["中指", `${data.ringSizes.middle}号相当`],
    ["薬指", `${data.ringSizes.ring}号相当`],
    ["小指", `${data.ringSizes.little}号相当`]
  ];
}

function createFootRows(data) {
  return [
    ["太もも", `${round(data.thigh)}cm前後`],
    ["ふくらはぎ", `${round(data.calf)}cm前後`],
    ["足長", `${round(data.footLength)}cm前後`],
    ["足幅", `${round(data.footWidth)}cm前後`],
    ["靴サイズ", `${round(data.shoeSize, 1)}cm前後`]
  ];
}

function createRingSizeMap(baseRingSize) {
  return {
    thumb: ringRangeText(baseRingSize + 4),
    index: ringRangeText(baseRingSize + 2),
    middle: ringRangeText(baseRingSize + 3),
    ring: ringRangeText(baseRingSize),
    little: ringRangeText(baseRingSize - 7)
  };
}

function ringRangeText(center) {
  const min = Math.max(1, Math.round(center - 1.5));
  const max = Math.max(min, Math.round(center + 1.5));
  return `${min}〜${max}`;
}

function createDistanceMemos(data) {
  const memos = [];

  if (!data.userHeight && !data.userHand && !data.userShoe) {
    return memos;
  }

  if (data.userHeight) {
    const diff = data.height - data.userHeight;
    const abs = Math.abs(diff);

    memos.push(createHeightDistanceMemo(diff, abs));
    memos.push(`目線の位置：${createEyeLineMemo(diff)}`);
    memos.push(`ハグした時：${estimateHugPosition(diff)}`);
    memos.push(`並んだ時のシルエット：${createStandingSilhouetteMemo(diff, data.shoulder)}`);

    const userInseam = data.userHeight * 0.455;
    const strideDiff = data.inseam * 0.48 - userInseam * 0.48;

    if (Math.abs(strideDiff) < 1.2) {
      memos.push(`歩幅の差：約${round(Math.abs(strideDiff))}cm。歩くテンポは近めで、横に並んでも置いていかれにくい距離感です。`);
    } else if (strideDiff > 0) {
      memos.push(`歩幅の差：約${round(Math.abs(strideDiff))}cm。相手の方が少し歩幅が大きく、並んで歩くとこちらが半歩追う感じになりやすいです。`);
    } else {
      memos.push(`歩幅の差：約${round(Math.abs(strideDiff))}cm。あなたの方が少し歩幅が大きめで、相手の歩調に合わせて歩く感じになりやすいです。`);
    }

    const armReach = data.arm - data.userHeight * 0.32;

    if (armReach > 2) {
      memos.push("腕を伸ばした時：相手の腕の方が長めで、肩や背中に手を回された時に包まれる感じが出やすいです。");
    } else if (armReach < -2) {
      memos.push("腕を伸ばした時：あなたの腕の方が少し長めで、こちらから抱き込む描写にも寄せやすいです。");
    } else {
      memos.push("腕を伸ばした時：腕の長さは近く、抱きしめ合った時にかなり対等な収まりになりやすいです。");
    }
  }

  const estimatedUserHand = data.userHand || (data.userHeight ? data.userHeight * 0.108 : null);

  if (estimatedUserHand) {
    const handDiff = data.handLength - estimatedUserHand;
    const absHand = Math.abs(handDiff);

    if (absHand < 0.8) {
      memos.push(`手を重ねた時：差は約${round(absHand)}cm。かなり近いサイズ感で、指先の距離が揃いやすいです。`);
      memos.push("恋人繋ぎ：手の大きさが近いので、ぎゅっと絡めた時に対等で自然な収まりになりやすいです。");
    } else if (handDiff > 0) {
      memos.push(`手を重ねた時：相手の手が約${round(handDiff)}cm大きめ。手の甲や指先を少し包まれる印象になります。`);
      memos.push("恋人繋ぎ：相手の指が外側からかぶさりやすく、握られている感じが出やすいです。");
    } else {
      memos.push(`手を重ねた時：あなたの手が約${round(absHand)}cm大きめ。相手の手元が少し繊細に見えやすいです。`);
      memos.push("恋人繋ぎ：こちらから包むような手元描写に寄せやすいです。");
    }
  }

  if (data.userShoe) {
    const shoeDiff = data.shoeSize - data.userShoe;
    const absShoe = Math.abs(shoeDiff);

    if (absShoe < 0.8) {
      memos.push(`靴を並べた時：差は約${round(absShoe)}cm。玄関に並んだ靴のサイズ感はかなり近めです。`);
    } else if (shoeDiff > 0) {
      memos.push(`靴を並べた時：相手の靴が約${round(shoeDiff)}cm大きめ。並べると少しだけ相手の足元が大きく見えます。`);
    } else {
      memos.push(`靴を並べた時：あなたの靴が約${round(absShoe)}cm大きめ。相手の足元はやや控えめに見えます。`);
    }
  }

  return memos;
}

function createImageEvidenceMemos(data) {
  const result = data.imageResult;
  const memos = [];

  if (!result) {
    memos.push("画像補正結果はまだありません。9つの測定点を指定すると、頭身・脚長・肩幅・ウエスト幅の補正候補が表示されます。");
    return memos;
  }

  memos.push(`頭身：約${round(result.rawHeadRatio, 2)}頭身 → 採用候補は${result.headRatio}頭身です。`);
  memos.push(`脚長傾向：股下比率は約${round(result.inseamRatio * 100, 1)}%。脚の印象は「${getLegTypeLabel(result.legType)}」として扱います。`);
  memos.push(`肩幅傾向：肩幅比率は約${round(result.shoulderRatio * 100, 1)}%。肩幅の印象は「${getShoulderTypeLabel(result.shoulderType)}」です。`);
  memos.push(`ウエスト傾向：ウエスト幅比率は約${round(result.waistRatio * 100, 1)}%。胴まわりの印象は「${getWaistTypeLabel(result.waistType)}」です。`);
  memos.push(`シルエット：肩幅÷ウエストは約${round(result.shoulderWaistRatio, 2)}。「${getSilhouetteTypeLabel(result.silhouetteType)}」として補正しています。`);
  memos.push(`最終補正：${data.frame.label}ベース / ${data.body.label}寄りとして推定しました。`);

  return memos;
}

function getProfileKey(profileMap, profileObject) {
  const found = Object.entries(profileMap).find(([, value]) => value === profileObject);
  return found ? found[0] : "";
}

function getBodyImpressionLabel(frame, body) {
  const key = `${getProfileKey(frameProfiles, frame)}_${getProfileKey(bodyProfiles, body)}`;

  const labels = {
    adultMale_slender: "骨格は男性寄りで、線はすっきり細い体型",
    adultMale_slim: "細身だけど骨格のある体型",
    adultMale_standard: "自然体で抱きしめやすい成人男性体型",
    adultMale_muscular: "肩と胸に存在感のある体型",
    adultMale_solid: "抱きしめた時に安定感のある体型",
    neutralMale_slender: "線が細く、儚さのある体型",
    neutralMale_slim: "中性的でしなやかな細身体型",
    neutralMale_standard: "すらっと自然な中性的体型",
    neutralMale_muscular: "細身に見えて芯のある体型",
    neutralMale_solid: "中性的ながら安定感のある体型",
    boyishMale_slender: "少年寄りで軽やかな華奢体型",
    boyishMale_slim: "成長途中のような細身体型",
    boyishMale_standard: "少年寄りで自然な体型",
    boyishMale_muscular: "若さと運動量を感じる体型",
    boyishMale_solid: "少年寄りながらしっかりした体型"
  };

  return labels[key] || `${frame.label}ベースの${body.label}寄り`;
}

function getBodyContourLabel(frame, body) {
  const frameKey = getProfileKey(frameProfiles, frame);
  const bodyKey = getProfileKey(bodyProfiles, body);

  if (bodyKey === "slender") {
    return "輪郭は細く、服の下の骨格がすっきり見えやすいタイプです。";
  }

  if (bodyKey === "slim") {
    return "全体は細身ですが、肩や腰に自然な骨格の線が残るタイプです。";
  }

  if (bodyKey === "muscular") {
    return "肩・胸・腕に厚みが出やすく、近くに立つと体格の良さが伝わりやすいタイプです。";
  }

  if (bodyKey === "solid") {
    return "全体に安定感があり、抱きしめた時にしっかりした重みを感じやすいタイプです。";
  }

  if (frameKey === "neutralMale") {
    return "すらっとした線と自然な厚みが両立した、柔らかい輪郭です。";
  }

  return "極端に細すぎず大きすぎず、日常描写に落とし込みやすい輪郭です。";
}

function getNeckImpression(neck, height) {
  const ratio = neck / height;

  if (ratio < 0.205) {
    return "首元はすっきり細め";
  }

  if (ratio > 0.225) {
    return "首元に少し厚みがある";
  }

  return "自然な首元";
}

function getShoulderImpression(shoulder, height) {
  const ratio = shoulder / height;

  if (ratio < 0.235) {
    return "肩まわりは控えめ";
  }

  if (ratio > 0.255) {
    return "肩幅に存在感がある";
  }

  return "自然な肩幅";
}

function getChestImpression(chest, waist) {
  const diff = chest - waist;

  if (diff > 18) {
    return "胸まわりと腰まわりの差が出やすい";
  }

  if (diff < 12) {
    return "上半身は直線的に見えやすい";
  }

  return "自然な上半身の厚み";
}

function getWaistImpression(waist, height) {
  const ratio = waist / height;

  if (ratio < 0.405) {
    return "腰まわりは細め";
  }

  if (ratio > 0.455) {
    return "腰まわりに安定感あり";
  }

  return "自然な腰まわり";
}

function getImageSilhouetteDescription(result) {
  if (!result) {
    return "画像補正なし";
  }

  const labels = {
    invertedTriangle: "逆三角形寄り。肩から腰にかけて絞られる、上半身の存在感が出やすいラインです。",
    slightlyInverted: "やや逆三角形寄り。肩まわりが自然に目立ち、腰へ向かってすっきり見えるラインです。",
    straight: "直線的。肩から腰までの差が強すぎず、すらっとした縦の印象が出やすいラインです。",
    soft: "なだらか。肩と腰の差が控えめで、柔らかく中性的に見えやすいラインです。"
  };

  return labels[result.silhouetteType] || "自然なシルエットです。";
}

function getShoulderWaistDescription(result) {
  if (!result) {
    return "画像補正なし";
  }

  const ratio = result.shoulderWaistRatio;

  if (ratio >= 1.6) {
    return `肩幅÷ウエスト：約${round(ratio, 2)}。肩幅がかなり勝つタイプで、正面立ちでも体格差が出やすいです。`;
  }

  if (ratio >= 1.4) {
    return `肩幅÷ウエスト：約${round(ratio, 2)}。肩から腰へ絞られる印象があり、服越しにも上半身の形が出やすいです。`;
  }

  if (ratio >= 1.2) {
    return `肩幅÷ウエスト：約${round(ratio, 2)}。肩と腰の差は自然で、すっきりした体型に見えやすいです。`;
  }

  return `肩幅÷ウエスト：約${round(ratio, 2)}。肩と腰の差は控えめで、柔らかくなだらかな輪郭に見えやすいです。`;
}

function getUpperBodyPresenceDescription(result, shoulder, height) {
  const shoulderRatio = shoulder / height;

  if (result?.shoulderType === "veryWide" || shoulderRatio > 0.255) {
    return "肩まわりにかなり存在感があります。近くに立つと、上半身の大きさや頼もしさが伝わりやすいです。";
  }

  if (result?.shoulderType === "wide" || shoulderRatio > 0.245) {
    return "肩まわりにほどよい存在感があります。服の上からでも体格の良さが出やすいです。";
  }

  if (result?.shoulderType === "narrow" || shoulderRatio < 0.235) {
    return "肩まわりは控えめで、線の細さや軽やかさが出やすいです。";
  }

  return "肩まわりは自然で、極端に細すぎず大きすぎない上半身です。";
}

function getBodyBalanceDescription(result) {
  if (!result) {
    return "画像補正なし";
  }

  if (result.legType === "veryLong" && result.silhouetteType === "invertedTriangle") {
    return "脚長かつ上半身にも存在感があり、かなり二次元映えする体型バランスです。";
  }

  if (result.legType === "veryLong" || result.legType === "long") {
    return "脚が長めに見えるため、立ち姿がすらっと伸びやすいバランスです。";
  }

  if (result.silhouetteType === "soft") {
    return "縦の迫力よりも、柔らかく自然な輪郭が出やすいバランスです。";
  }

  if (result.silhouetteType === "invertedTriangle") {
    return "上半身に視線が集まりやすく、肩・胸まわりの存在感が印象に残りやすいバランスです。";
  }

  return "全体の重心は自然で、日常描写にも落とし込みやすいバランスです。";
}

function getClothingLineDescription(frame, body, result) {
  const bodyKey = getProfileKey(bodyProfiles, body);

  if (result?.silhouetteType === "invertedTriangle") {
    return "ジャケット・シャツ・軍服系で肩のラインが映えやすいです。ウエストが絞られる服だと体格差が出やすいタイプです。";
  }

  if (result?.silhouetteType === "slightlyInverted") {
    return "スーツや制服のような直線的な服で、肩から腰にかけてのラインがきれいに出やすいです。";
  }

  if (bodyKey === "slender" || bodyKey === "slim") {
    return "薄手のシャツや細身の衣装で、すっきりした線が出やすいです。布の余りや袖口のゆるさも描写しやすいタイプです。";
  }

  if (bodyKey === "solid" || bodyKey === "muscular") {
    return "厚手の服やジャケットでも、肩・胸・腕まわりに身体の厚みが出やすいです。";
  }

  return "極端な主張は少なく、日常服でも衣装でも自然に馴染みやすいラインです。";
}

function getEmbraceSurfaceDescription(shoulder, chest, height) {
  const shoulderRatio = shoulder / height;
  const chestRatio = chest / height;

  if (shoulderRatio > 0.255 || chestRatio > 0.535) {
    return "抱きしめた時に上半身の面積を感じやすく、腕や胸元に包まれる印象が出やすいです。";
  }

  if (shoulderRatio < 0.235 || chestRatio < 0.5) {
    return "抱きしめた時の面積感は控えめで、細さや軽さを感じやすいです。";
  }

  return "抱きしめた時の面積感は自然で、近づいた時にほどよく身体の存在を感じるタイプです。";
}

function createHeightDistanceMemo(diff, abs) {
  if (abs < 2) {
    return `身長差：約${round(abs)}cm。ほぼ同じ目線で、正面から向き合うと表情の距離が近いです。`;
  }

  if (diff >= 40) {
    return `身長差：約${round(abs)}cm。かなり極端な体格差があります。並ぶと相手の身体が大きく視界に入り、見上げるだけで存在感に包まれる距離感です。`;
  }

  if (diff >= 35) {
    return `身長差：約${round(abs)}cm。かなり大きな体格差があります。相手の上半身が近く、見上げる動作そのものが分かりやすく出ます。`;
  }

  if (diff >= 28) {
    return `身長差：約${round(abs)}cm。はっきりした高低差があります。隣に立つと相手の肩や胸元が近く、包まれる印象がかなり出やすいです。`;
  }

  if (diff >= 20) {
    return `身長差：約${round(abs)}cm。かなり見上げる差です。向き合うと相手の顔がしっかり上にあり、身長差の甘さが分かりやすく出ます。`;
  }

  if (diff >= 12) {
    return `身長差：約${round(abs)}cm。あなたが自然に見上げる形になり、隣に立つと相手の肩口や首元が近く感じやすいです。`;
  }

  if (diff >= 5) {
    return `身長差：約${round(abs)}cm。少し見上げる距離で、並ぶとほどよい目線差が出ます。`;
  }

  if (diff > 0) {
    return `身長差：約${round(abs)}cm。ほぼ近い目線ですが、相手の方がほんの少し高く、向き合うと微妙な見上げ感があります。`;
  }

  if (diff <= -40) {
    return `身長差：約${round(abs)}cm。あなたの方がかなり高い、極端な逆身長差です。相手はしっかり見上げる形になり、こちらが抱き込む・包む側の構図がかなり作りやすいです。`;
  }

  if (diff <= -35) {
    return `身長差：約${round(abs)}cm。あなたの方がかなり高い差です。相手は見上げる形になりやすく、頭や肩を視界に収めやすい距離感です。`;
  }

  if (diff <= -28) {
    return `身長差：約${round(abs)}cm。あなたの方がはっきり高く、隣に立つと相手の頭や肩が視界に入りやすい距離感です。守る・覗き込む・抱き寄せる描写に寄せやすいです。`;
  }

  if (diff <= -20) {
    return `身長差：約${round(abs)}cm。あなたの方がかなり高めです。相手が見上げる構図になりやすく、手を引く・肩を抱くような描写が映えます。`;
  }

  if (diff <= -12) {
    return `身長差：約${round(abs)}cm。あなたの方が自然に見下ろす形になり、相手の表情や髪の動きが見えやすい距離感です。`;
  }

  if (diff <= -5) {
    return `身長差：約${round(abs)}cm。あなたの方が少し高く、相手の顔をやや上から見やすい距離です。`;
  }

  return `身長差：約${round(abs)}cm。ほぼ近い目線ですが、あなたの方がほんの少し高い距離感です。`;
}

function createEyeLineMemo(heightDiff) {
  if (heightDiff >= 40) {
    return "相手の胸元〜胸上が大きく視界に入り、顔を見るにはかなりしっかり見上げる高さです。";
  }

  if (heightDiff >= 35) {
    return "相手の胸元〜胸上あたりがかなり近く、顔を見るにはしっかり見上げる高さです。";
  }

  if (heightDiff >= 28) {
    return "相手の胸元〜鎖骨下あたりに視線が行きやすく、見上げる動作がはっきり出ます。";
  }

  if (heightDiff >= 20) {
    return "相手の鎖骨下〜胸元あたりに視線が行きやすい高さです。";
  }

  if (heightDiff >= 12) {
    return "相手の鎖骨〜肩口あたりに視線が行きやすい高さです。";
  }

  if (heightDiff >= 5) {
    return "少しだけ見上げる距離で、目線差にほどよい甘さが出ます。";
  }

  if (heightDiff > -5) {
    return "かなり近い目線で、表情の変化がすぐ分かる距離感です。";
  }

  if (heightDiff > -12) {
    return "あなたの方が少し高く、相手の顔をやや上から見やすい距離感です。";
  }

  if (heightDiff > -20) {
    return "あなたの方が自然に見下ろす形になり、相手の表情や前髪の動きが目に入りやすい高さです。";
  }

  if (heightDiff > -28) {
    return "相手はあなたを見上げる形になりやすく、こちらからは頭や肩のラインが見えやすい距離です。";
  }

  if (heightDiff > -35) {
    return "あなたの方がはっきり高く、相手の頭や肩を視界に収めやすい高さです。";
  }

  if (heightDiff > -40) {
    return "あなたの方がかなり高く、相手がしっかり見上げる構図になりやすい距離感です。";
  }

  return "あなたの方が非常に高く、相手が大きく見上げる構図になりやすい距離感です。";
}

function estimateHugPosition(heightDiff) {
  if (heightDiff >= 40) {
    return "あなたの顔は相手の胸元〜胸上あたりに来やすく、抱きしめられると身体ごと包まれる印象がかなり強く出ます。";
  }

  if (heightDiff >= 35) {
    return "あなたの顔は相手の胸元あたりに来やすいです。腕を回されると、上から覆われるような抱きしめ方になりやすいです。";
  }

  if (heightDiff >= 28) {
    return "あなたの顔は相手の胸元〜鎖骨下あたりに来やすく、相手の肩や腕の大きさを感じやすい距離です。";
  }

  if (heightDiff >= 20) {
    return "あなたの顔は相手の鎖骨下〜胸元あたりに来やすいです。身長差のあるハグとしてかなり分かりやすい収まりになります。";
  }

  if (heightDiff >= 12) {
    return "あなたの顔は相手の鎖骨〜肩口あたりに来やすいです。肩口に顔を寄せる描写に向いています。";
  }

  if (heightDiff >= 5) {
    return "目線差は少しあり、肩や首元に顔を寄せやすい高さです。";
  }

  if (heightDiff > -5) {
    return "かなり近い目線で、正面から抱きしめると顔の距離が近くなりやすいです。";
  }

  if (heightDiff > -12) {
    return "あなたの方が少し高く、相手の頭や肩をやや上から抱き込むような収まりになりやすいです。";
  }

  if (heightDiff > -20) {
    return "あなたの方が自然に高く、相手の頭が肩口〜首元に近づきやすいハグになります。";
  }

  if (heightDiff > -28) {
    return "あなたの方がかなり高めで、相手を腕の中に収める・肩ごと抱き寄せる構図が作りやすいです。";
  }

  if (heightDiff > -35) {
    return "あなたの方がはっきり高く、相手は見上げる形になりやすいです。抱きしめるとこちらが上から包む印象が強くなります。";
  }

  if (heightDiff > -40) {
    return "あなたの方がかなり高く、相手の頭や肩を抱え込むようなハグに寄せやすいです。逆身長差の印象が強く出ます。";
  }

  return "あなたの方が非常に高く、相手をしっかり包み込む構図になります。相手が見上げる・こちらが抱え込む描写がかなり映えます。";
}

function createStandingSilhouetteMemo(heightDiff, shoulder) {
  if (heightDiff >= 35) {
    return "相手の縦の存在感がかなり強く、肩幅や上半身の大きさも視界に入りやすいです。";
  }

  if (heightDiff >= 20) {
    return "相手の方がはっきり高く、隣に立つと肩の位置と頭の高さに分かりやすい差が出ます。";
  }

  if (heightDiff >= 8) {
    return "相手の方が少し高く、横に並ぶと自然な見上げ感が出ます。";
  }

  if (heightDiff > -8) {
    return "高さが近く、肩を並べた時の距離感はかなり対等に見えます。";
  }

  if (heightDiff > -20) {
    return "あなたの方が少し高く、相手の頭や肩が視界に入りやすい並びになります。";
  }

  if (heightDiff > -35) {
    return "あなたの方がはっきり高く、隣に立つと相手を見下ろす構図が自然に出ます。";
  }

  return "あなたの方がかなり高く、相手を横に置いた時の逆身長差が強く印象に残ります。";
}


/* =========================================================
  5. 結果表示・コピー・PNG保存
========================================================= */

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

  const evidenceText = memos.map((memo) => `・${memo}`).join("\n");
  const compareText = compareMemos.length
    ? `\n\n【あなたとの距離感】\n${compareMemos.map((memo) => `・${memo}`).join("\n")}`
    : "";

  return `【${name}の推定身体情報】\n\n${rowsToText("身体の輪郭", basicRows)}\n\n${rowsToText("手・指・足元", detailRows)}${compareText}\n\n【画像補正の根拠】\n${evidenceText}\n\n※この結果は公式情報ではありません。創作・妄想補助用の推定値です。`;
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

    const name = sanitizeFileName($("oshiName")?.value || "あの人");
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


/* =========================================================
  6. フォームリセット
========================================================= */

function resetForm() {
  if ($("oshiName")) $("oshiName").value = "";
  if ($("height")) $("height").value = "";

  setValueIfExists("handType", "normal");

  if ($("userHeight")) $("userHeight").value = "";
  if ($("userHand")) $("userHand").value = "";
  if ($("userShoe")) $("userShoe").value = "";

  resetImageAssistProfile();

  if ($("resultSection")) $("resultSection").classList.add("hidden");
  if ($("copyButton")) $("copyButton").dataset.copyText = "";
}


/* =========================================================
  7. 立ち絵画像表示
========================================================= */

function setPoseMessage(text) {
  const message = $("poseCanvasMessage");
  if (message) {
    message.textContent = text;
  }
}

function getPoseToolElement() {
  const canvas = $("poseCanvas");
  return canvas ? canvas.closest(".pose-tool") : null;
}

function clearPoseCanvas() {
  const canvas = $("poseCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  canvas.width = 0;
  canvas.height = 0;
}

function resetPoseImage() {
  const poseImageInput = $("poseImageInput");
  const poseTool = getPoseToolElement();

  if (poseImageState.objectUrl) {
    URL.revokeObjectURL(poseImageState.objectUrl);
  }

  poseImageState.image = null;
  poseImageState.objectUrl = null;
  poseImageState.naturalWidth = 0;
  poseImageState.naturalHeight = 0;
  poseImageState.canvasWidth = 0;
  poseImageState.canvasHeight = 0;
  poseImageState.scale = 1;

  posePointState.points = [];
  posePointState.result = null;
  resetImageAssistProfile();

  clearPoseCanvas();

  if (poseImageInput) {
    poseImageInput.value = "";
  }

  if (poseTool) {
    poseTool.classList.remove("is-loaded");
  }

  clearImageAssistResult();
  setPoseMessage("立ち絵画像を選択すると、ここに表示されます。");
}

function drawPoseImageToCanvas() {
  const canvas = $("poseCanvas");
  const image = poseImageState.image;

  if (!canvas || !image) return;

  const ctx = canvas.getContext("2d");
  const maxWidth = 760;
  const maxHeight = 900;

  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;

  const scale = Math.min(
    maxWidth / naturalWidth,
    maxHeight / naturalHeight,
    1
  );

  const canvasWidth = Math.round(naturalWidth * scale);
  const canvasHeight = Math.round(naturalHeight * scale);

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  poseImageState.naturalWidth = naturalWidth;
  poseImageState.naturalHeight = naturalHeight;
  poseImageState.canvasWidth = canvasWidth;
  poseImageState.canvasHeight = canvasHeight;
  poseImageState.scale = scale;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);

  const poseTool = getPoseToolElement();
  if (poseTool) {
    poseTool.classList.add("is-loaded");
  }
}

function handlePoseImageUpload(event) {
  const file = event.target.files?.[0];

  if (!file) {
    resetPoseImage();
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("画像ファイルを選択してください。");
    resetPoseImage();
    return;
  }

  if (poseImageState.objectUrl) {
    URL.revokeObjectURL(poseImageState.objectUrl);
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  setPoseMessage("画像を読み込んでいます...");

  image.onload = () => {
    poseImageState.image = image;
    poseImageState.objectUrl = objectUrl;

    posePointState.points = [];
    posePointState.result = null;
    resetImageAssistProfile();

    drawPoseOverlay();
    clearImageAssistResult();
    updateImageAssistResult();
    setPoseMessage("頭頂をクリックしてください。");
  };

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    alert("画像の読み込みに失敗しました。別の画像で試してください。");
    resetPoseImage();
  };

  image.src = objectUrl;
}


/* =========================================================
  8. 立ち絵画像クリック補助推定
========================================================= */

function getNextPosePoint() {
  return posePoints[posePointState.points.length] || null;
}

function getPosePoint(key) {
  return posePointState.points.find((point) => point.key === key);
}

function getCanvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function drawPoseOverlay() {
  drawPoseImageToCanvas();

  const canvas = $("poseCanvas");
  const ctx = canvas?.getContext("2d");

  if (!canvas || !ctx || !poseImageState.image) return;

  posePointState.points.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#7b4b35";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#2f2924";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;

    const text = `${index + 1}. ${point.label}`;
    ctx.strokeText(text, point.x + 12, point.y - 10);
    ctx.fillText(text, point.x + 12, point.y - 10);
  });

  if (posePointState.points.length >= 2) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(123, 75, 53, 0.65)";
    ctx.lineWidth = 2;

    posePointState.points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });

    ctx.stroke();
  }

  drawNextPoseGuide(ctx, canvas);
}

function drawNextPoseGuide(ctx, canvas) {
  const nextPoint = getNextPosePoint();

  if (!nextPoint) {
    drawGuideBadge(ctx, canvas, "ポイント指定完了", "この画像補正を使えます", "bottom");
    return;
  }

  const currentNumber = posePointState.points.length + 1;
  const totalNumber = posePoints.length;

  const position =
    nextPoint.key === "leftFoot" || nextPoint.key === "rightFoot"
      ? "top"
      : "bottom";

  drawGuideBadge(
    ctx,
    canvas,
    `次は ${currentNumber}/${totalNumber}：${nextPoint.label}`,
    getPosePointGuideText(nextPoint.key),
    position
  );
}

function drawGuideBadge(ctx, canvas, title, detail, position = "bottom") {
  const padding = 14;
  const width = Math.min(420, canvas.width - 32);
  const height = detail ? 74 : 48;
  const radius = 12;

  const x = (canvas.width - width) / 2;
  const y = position === "top"
    ? 16
    : canvas.height - height - 16;

  ctx.save();

  ctx.globalAlpha = 0.88;
  ctx.fillStyle = "#2f2924";
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(title, x + padding, y + 28);

  if (detail) {
    ctx.font = "12px sans-serif";
    ctx.fillText(detail, x + padding, y + 52);
  }

  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getPosePointGuideText(key) {
  const guides = {
    top: "髪や頭部本体の一番上",
    chin: "顔の輪郭の一番下",
    leftShoulder: "画面左側の肩の外端",
    rightShoulder: "画面右側の肩の外端",
    leftWaist: "画面左側の胴が細く見える位置",
    rightWaist: "画面右側の胴が細く見える位置",
    crotch: "脚が左右に分かれ始める位置",
    leftFoot: "画面左側の靴底・足先の一番下",
    rightFoot: "画面右側の靴底・足先の一番下"
  };

  return guides[key] || "該当する位置をクリック";
}

function handlePoseCanvasClick(event) {
  event.preventDefault();

  const now = Date.now();

  if (now - lastPoseClickTime < 200) {
    return;
  }

  lastPoseClickTime = now;

  const canvas = $("poseCanvas");

  if (!canvas || !poseImageState.image) {
    return;
  }

  const nextPoint = getNextPosePoint();

  if (!nextPoint) {
    alert("すべてのポイントを指定済みです。リセットする場合は「ポイントをリセット」を押してください。");
    return;
  }

  const point = getCanvasPoint(event, canvas);

  posePointState.points.push({
    key: nextPoint.key,
    label: nextPoint.label,
    x: point.x,
    y: point.y
  });

  resetImageAssistProfile();
  drawPoseOverlay();
  updateImageAssistResult();

  const afterNextPoint = getNextPosePoint();

  if (afterNextPoint) {
    setPoseMessage(`次は「${afterNextPoint.label}」をクリックしてください。`);
  } else {
    setPoseMessage("ポイント指定が完了しました。必要なら『この画像補正を使う』を押してください。");
  }
}

function calculateImageAssist() {
  const top = getPosePoint("top");
  const chin = getPosePoint("chin");
  const leftShoulder = getPosePoint("leftShoulder");
  const rightShoulder = getPosePoint("rightShoulder");
  const leftWaist = getPosePoint("leftWaist");
  const rightWaist = getPosePoint("rightWaist");
  const crotch = getPosePoint("crotch");
  const leftFoot = getPosePoint("leftFoot");
  const rightFoot = getPosePoint("rightFoot");

  if (
    !top ||
    !chin ||
    !leftShoulder ||
    !rightShoulder ||
    !leftWaist ||
    !rightWaist ||
    !crotch ||
    !leftFoot ||
    !rightFoot
  ) {
    return null;
  }

  const footY = Math.max(leftFoot.y, rightFoot.y);

  const headPx = Math.abs(chin.y - top.y);
  const bodyPx = Math.abs(footY - top.y);
  const inseamPx = Math.abs(footY - crotch.y);

  const shoulderPx = Math.abs(rightShoulder.x - leftShoulder.x);
  const waistPx = Math.abs(rightWaist.x - leftWaist.x);

  if (
    headPx <= 0 ||
    bodyPx <= 0 ||
    inseamPx <= 0 ||
    shoulderPx <= 0 ||
    waistPx <= 0
  ) {
    return null;
  }

  const rawHeadRatio = bodyPx / headPx;
  const inseamRatio = inseamPx / bodyPx;

  const shoulderRatio = shoulderPx / bodyPx;
  const waistRatio = waistPx / bodyPx;
  const shoulderWaistRatio = shoulderPx / waistPx;

  const headRatio = normalizeHeadRatio(rawHeadRatio);
  const legType = inferLegType(inseamRatio);
  const shoulderType = inferShoulderType(shoulderRatio);
  const waistType = inferWaistType(waistRatio);
  const silhouetteType = inferSilhouetteType(shoulderWaistRatio);

  return {
    rawHeadRatio,
    headRatio,
    inseamRatio,
    legType,
    shoulderRatio,
    waistRatio,
    shoulderWaistRatio,
    shoulderType,
    waistType,
    silhouetteType
  };
}

function normalizeHeadRatio(value) {
  const candidates = [6.5, 7, 7.5, 8, 8.5, 9];

  return candidates.reduce((nearest, current) => {
    return Math.abs(current - value) < Math.abs(nearest - value)
      ? current
      : nearest;
  }, candidates[0]);
}

function inferLegType(inseamRatio) {
  if (inseamRatio < 0.43) {
    return "short";
  }

  if (inseamRatio < 0.465) {
    return "normal";
  }

  if (inseamRatio < 0.49) {
    return "long";
  }

  return "veryLong";
}

function inferShoulderType(shoulderRatio) {
  if (shoulderRatio < 0.215) {
    return "narrow";
  }

  if (shoulderRatio < 0.245) {
    return "normal";
  }

  if (shoulderRatio < 0.275) {
    return "wide";
  }

  return "veryWide";
}

function inferWaistType(waistRatio) {
  if (waistRatio < 0.135) {
    return "slim";
  }

  if (waistRatio < 0.165) {
    return "normal";
  }

  return "thick";
}

function inferSilhouetteType(shoulderWaistRatio) {
  if (shoulderWaistRatio >= 1.55) {
    return "invertedTriangle";
  }

  if (shoulderWaistRatio >= 1.35) {
    return "slightlyInverted";
  }

  if (shoulderWaistRatio >= 1.15) {
    return "straight";
  }

  return "soft";
}

function inferFrameTypeFromImage(result) {
  if (!result) {
    return "adultMale";
  }

  if (result.shoulderType === "narrow" || result.silhouetteType === "soft") {
    return "neutralMale";
  }

  return "adultMale";
}

function inferBodyTypeFromImage(result) {
  if (!result) {
    return "standard";
  }

  if (
    result.waistType === "slim" &&
    (result.shoulderType === "narrow" || result.silhouetteType === "soft")
  ) {
    return "slender";
  }

  if (result.waistType === "slim" || result.silhouetteType === "slightlyInverted") {
    return "slim";
  }

  if (result.shoulderType === "wide" && result.waistType !== "thick") {
    return "muscular";
  }

  if (result.shoulderType === "veryWide" || result.waistType === "thick") {
    return "solid";
  }

  return "standard";
}

function getEffectiveImageProfile() {
  const result = posePointState.result || calculateImageAssist();

  if (!result) {
    return null;
  }

  return {
    headRatio: result.headRatio,
    legType: result.legType,
    frameType: inferFrameTypeFromImage(result),
    bodyType: inferBodyTypeFromImage(result)
  };
}

function getLegTypeLabel(value) {
  const labels = {
    short: "短め",
    normal: "標準",
    long: "長め",
    veryLong: "かなり長め"
  };

  return labels[value] || "標準";
}

function getShoulderTypeLabel(value) {
  const labels = {
    narrow: "華奢・肩幅控えめ",
    normal: "自然",
    wide: "やや広め",
    veryWide: "かなり広め"
  };

  return labels[value] || "自然";
}

function getWaistTypeLabel(value) {
  const labels = {
    slim: "細め",
    normal: "自然",
    thick: "厚みあり"
  };

  return labels[value] || "自然";
}

function getSilhouetteTypeLabel(value) {
  const labels = {
    invertedTriangle: "逆三角形寄り",
    slightlyInverted: "やや逆三角形寄り",
    straight: "直線的",
    soft: "なだらか"
  };

  return labels[value] || "直線的";
}

function updateImageAssistResult() {
  const resultBox = $("imageAssistResult");
  if (!resultBox) return;

  const nextPoint = getNextPosePoint();

  if (nextPoint) {
    resultBox.innerHTML = `
      <p class="assist-result__text">
        次にクリックする点：<strong>${escapeHtml(nextPoint.label)}</strong>
      </p>
    `;
    return;
  }

  const result = calculateImageAssist();
  posePointState.result = result;

  if (!result) {
    resultBox.innerHTML = `
      <p class="assist-result__text">
        ポイントの取得に失敗しました。もう一度リセットして指定してください。
      </p>
    `;
    return;
  }

  const profile = getEffectiveImageProfile();

  resultBox.innerHTML = `
    <div class="assist-result__box">
      <p><strong>画像からの補正候補</strong></p>
      <p>頭身：約${round(result.rawHeadRatio, 2)}頭身 → 採用候補：${profile.headRatio}頭身</p>
      <p>股下比率：約${round(result.inseamRatio * 100, 1)}% → 脚の印象：${escapeHtml(getLegTypeLabel(result.legType))}</p>
      <p>肩幅比率：約${round(result.shoulderRatio * 100, 1)}% → 肩幅の印象：${escapeHtml(getShoulderTypeLabel(result.shoulderType))}</p>
      <p>ウエスト幅比率：約${round(result.waistRatio * 100, 1)}% → 胴まわりの印象：${escapeHtml(getWaistTypeLabel(result.waistType))}</p>
      <p>肩幅÷ウエスト：約${round(result.shoulderWaistRatio, 2)} → シルエット：${escapeHtml(getSilhouetteTypeLabel(result.silhouetteType))}</p>
      <p>自動判定：${escapeHtml(frameProfiles[profile.frameType]?.label || "成人男性寄り")} / ${escapeHtml(bodyProfiles[profile.bodyType]?.label || "標準")}</p>
    </div>
  `;
}

function resetPosePointsOnly() {
  posePointState.points = [];
  posePointState.result = null;
  resetImageAssistProfile();

  if (poseImageState.image) {
    drawPoseOverlay();
    updateImageAssistResult();
    setPoseMessage("頭頂をクリックしてください。");
  } else {
    clearPoseCanvas();
    clearImageAssistResult();
    setPoseMessage("立ち絵画像を選択すると、ここに表示されます。");
  }
}

function applyImageAssistResult() {
  const profile = getEffectiveImageProfile();

  if (!profile) {
    alert("先に画像上で、頭頂・あご・左右肩・左右ウエスト・股下・左右足先を指定してください。");
    return;
  }

  imageAssistProfile.enabled = true;
  imageAssistProfile.headRatio = profile.headRatio;
  imageAssistProfile.legType = profile.legType;
  imageAssistProfile.frameType = profile.frameType;
  imageAssistProfile.bodyType = profile.bodyType;

  const resultBox = $("imageAssistResult");

  if (resultBox) {
    resultBox.innerHTML += `
      <p class="assist-result__applied">
        この画像補正を使用します。
      </p>
    `;
  }
}


/* =========================================================
  9. イベント登録
========================================================= */

function bindEvents() {
  const estimateButton = $("estimateButton");
  const resetButton = $("resetButton");
  const copyButton = $("copyButton");
  const savePngButton = $("savePngButton");

  const poseImageInput = $("poseImageInput");
  const poseCanvas = $("poseCanvas");
  const resetPointsButton = $("resetPointsButton");
  const applyImageAssistButton = $("applyImageAssistButton");

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

  if (poseImageInput) {
    poseImageInput.addEventListener("change", handlePoseImageUpload);
  } else {
    console.warn("poseImageInput が見つかりません。index.html の input ID を確認してください。");
  }

  if (poseCanvas) {
    poseCanvas.addEventListener("pointerdown", handlePoseCanvasClick);
  } else {
    console.warn("poseCanvas が見つかりません。index.html の canvas ID を確認してください。");
  }

  if (resetPointsButton) {
    resetPointsButton.addEventListener("click", resetPosePointsOnly);
  } else {
    console.warn("resetPointsButton が見つかりません。index.html のボタンIDを確認してください。");
  }

  if (applyImageAssistButton) {
    applyImageAssistButton.addEventListener("click", applyImageAssistResult);
  } else {
    console.warn("applyImageAssistButton が見つかりません。index.html のボタンIDを確認してください。");
  }
}


/* =========================================================
  10. 初期化
========================================================= */

bindEvents();
