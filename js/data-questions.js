/**
 * 対人スタイル診断 - 設問データ
 *
 * 重要：axis / group はすべて開発者向けの内部ラベルであり、
 * ユーザーの画面には一切表示しない（軸を明示すると「望ましい回答」を
 * 意識してしまい、素の反応が測れなくなるため）。
 *
 * axis の値:
 *   'agency'  … 主導権について（IPC / PA-HI 軸）      → d1
 *   'candor'  … 素直さについて（IPC / BC-JK 軸）        → d2
 *   'warmth'  … 距離感・温度感について（IPC / DE-LM 軸） → d3
 *   'social'  … 社交性について（IPC / FG-NO 軸）        → d4
 *   'energy'  … 会話のエネルギー・ペースについて（ラポール理論 Coordination要素）
 *
 * 各設問は 1〜5 の5段階。left = 1点側のラベル、right = 5点側のラベル。
 */

const QUESTION_BANK = [
  // ── 主導権について（4問）
  { id: 'q01', axis: 'agency', prompt: 'グループ旅行の計画、気づけば…', left: '自分が仕切ってる', right: '誰かに任せてる' },
  { id: 'q02', axis: 'agency', prompt: '友達と意見が分かれたとき…', left: '最後まで自分の意見を通す', right: '早めに合わせにいく' },
  { id: 'q03', axis: 'agency', prompt: '初めて会う人が多い集まりでは…', left: '自然と場を回す役になる', right: '誰かが回すのを待つ' },
  { id: 'q04', axis: 'agency', prompt: '仕事や作業を任されたら…', left: '自分のやり方で進めたい', right: '言われた通りに進めたい' },

  // ── 距離感・温度感について（4問）
  { id: 'q05', axis: 'warmth', prompt: '友達が落ち込んでいると分かったとき、まず自分がしがちなのは…', left: '事実を聞き出そうとする', right: '「大丈夫？」と気持ちに寄り添おうとする' },
  { id: 'q06', axis: 'warmth', prompt: '誰かのミスを見つけたら…', left: 'はっきり指摘する', right: '言葉を選んでやわらかく伝える' },
  { id: 'q07', axis: 'warmth', prompt: '初対面の人とは…', left: 'しばらく距離を保ちたい', right: '早めにタメ口で話したい' },
  { id: 'q08', axis: 'warmth', prompt: '議論になったとき…', left: '感情より事実を優先する', right: '相手の気持ちを優先する' },

  // ── 素直さについて（4問）
  { id: 'q09', axis: 'candor', prompt: '頼み事をされたら、まず…', left: '「メリットあるかな」と考える', right: '深く考えずOKしちゃう' },
  { id: 'q10', axis: 'candor', prompt: '知らない人の話は…', left: 'まず話半分に聞く', right: 'とりあえず信じる' },
  { id: 'q11', axis: 'candor', prompt: '交渉ごとでは…', left: '自分に有利な条件を引き出す', right: '言われた条件をそのまま受け入れる' },
  { id: 'q12', axis: 'candor', prompt: '誘われたら、まず…', left: '「なんで誘われたんだろう」と考える', right: '素直に嬉しい' },

  // ── 社交性について（4問）
  { id: 'q13', axis: 'social', prompt: '週末は…', left: '一人でゆっくりしたい', right: '誰かと出かけたい' },
  { id: 'q14', axis: 'social', prompt: '新しい環境では…', left: 'しばらく様子を見るタイプ', right: 'すぐ話しかけにいくタイプ' },
  { id: 'q15', axis: 'social', prompt: '大人数の集まりの後は…', left: '一人になって充電したい', right: 'まだ誰かと話してたい' },
  { id: 'q16', axis: 'social', prompt: '知らない人と話す機会は…', left: 'できれば避けたい', right: 'むしろワクワクする' },

  // ── 会話のエネルギー・ペースについて（4問／ラポール理論）
  { id: 'q17', axis: 'energy', prompt: '会話のテンポは、自分はどちらかというと？', left: 'テンポよく次々話したい', right: 'ゆっくりじっくり話したい' },
  { id: 'q18', axis: 'energy', prompt: '相手の話を聞いているとき、自分はどちらかというと？', left: '相槌や反応が大きい', right: '静かにじっくり聞く' },
  { id: 'q19', axis: 'energy', prompt: '楽しい話をしているとき、自分はどちらかというと？', left: '声のトーンが上がる', right: 'トーンはあまり変わらない' },
  { id: 'q20', axis: 'energy', prompt: '会話が盛り上がってきたとき、自分はどちらかというと？', left: 'どんどんテンションが上がる', right: '落ち着いたまま楽しむ' },
];
