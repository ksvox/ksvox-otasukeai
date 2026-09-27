import { useState, useRef } from 'react';
import Head from 'next/head';

const TEMPO_OPTIONS = [
  { key: 'バラード', label: 'バラード', icon: 'fa-heart' },
  { key: 'スロー', label: 'スロー', icon: 'fa-mug-hot' },
  { key: 'ミドル', label: 'ミドル', icon: 'fa-drum' },
  { key: 'アップ', label: 'アップ', icon: 'fa-bolt' },
];

function containsJapanese(text) {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text || '');
}

// 単語1つを音節分解して装飾付きで描画する
function WordNode({ word }) {
  if (!word.isContentWord) {
    return <>{word.text} </>;
  }
  const syllables =
    word.syllables && word.syllables.length > 0 ? word.syllables : [word.text];
  return (
    <span className="content-word">
      {syllables.map((syl, i) => (
        <span key={i}>
          {i > 0 && '-'}
          {syllables.length > 1 && i === word.accentSyllableIndex ? (
            <span className="accent-syllable">{syl}</span>
          ) : (
            syl
          )}
        </span>
      ))}
    </span>
  );
}

function SyllableView({ lines }) {
  if (!lines || lines.length === 0) return null;
  return (
    <>
      {lines.map((line, li) => (
        <span key={li}>
          {line.phrases.map((phrase, pi) => (
            <span key={pi}>
              {phrase.words.map((w, wi) => (
                <span key={wi}>
                  <WordNode word={w} />{' '}
                </span>
              ))}
              {pi < line.phrases.length - 1 && <span className="slash-mark">/ </span>}
            </span>
          ))}
          {li < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

export default function Home() {
  const [artist, setArtist] = useState('');
  const [song, setSong] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [tempo, setTempo] = useState('ミドル');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  const analysisRef = useRef(null);

  const handleSample = () => {
    setArtist('Adele');
    setSong('Someone Like You');
    setLyrics(
      "Never mind, I'll find someone like you\nI wish nothing but the best for you, too"
    );
    setTempo('スロー');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!song.trim()) {
      setErrorMsg('曲名を入力してください。');
      return;
    }

    if (!lyrics.trim()) return;

    if (containsJapanese(lyrics)) {
      setErrorMsg('英語曲の歌詞を入力してください。');
      return;
    }

    setLoading(true);
    setResult(null);

    // 分析中の表示が見える位置までスクロール
    setTimeout(() => {
      analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist, song, tempo, lyrics }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error || '解析中にエラーが発生しました。もう一度お試しください。');
        setLoading(false);
        return;
      }

      setResult(data);
      setLoading(false);

      setTimeout(() => {
        analysisRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error(err);
      setErrorMsg('通信エラーが発生しました。もう一度お試しください。');
      setLoading(false);
    }
  };

  const handleSaveTxt = () => {
    if (!result) return;

    const syllablesText = (result.lines || [])
      .map((line) =>
        line.phrases
          .map((phrase) =>
            phrase.words
              .map((w) =>
                w.isContentWord && w.syllables ? w.syllables.join('-') : w.text
              )
              .join(' ')
          )
          .join(' / ')
      )
      .join('\n');

    const vocabText =
      result.vocabNotes && result.vocabNotes.length > 0
        ? result.vocabNotes.map((v) => `${v.word} ${v.ipa} : ${v.meaning}`).join('\n')
        : result.vocabNoneMessage || '';

    const linkingText =
      result.linkingNotes && result.linkingNotes.length > 0
        ? result.linkingNotes.map((l) => `${l.phrase} -> ${l.kana}`).join('\n')
        : result.linkingNoneMessage || '';

    const textContent = `========================================
 英語歌唱お助けAI - 分析レポート
 提供：ボーカル道場K's VOX
========================================
■ 楽曲情報
${artist.trim() ? `・アーティスト: ${artist.trim()}\n` : ''}・曲名: ${song.trim()}
・テンポ: ${tempo}

----------------------------------------
① 音楽的で自然な和訳
----------------------------------------
${result.translation || ''}

----------------------------------------
② 音節とアクセントの可視化
----------------------------------------
${syllablesText}

----------------------------------------
③ 注意すべき単語
----------------------------------------
${vocabText}

----------------------------------------
④ 特徴的なリンキング（音の繋がり）
----------------------------------------
${linkingText}

----------------------------------------
⑤ K's VOX 歌唱メソッド・アドバイス
----------------------------------------
${result.advice || ''}

========================================
門弟制ボーカルスクール K's VOX
https://www.ksvox.net/
========================================`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitize = (t) => t.replace(/[/\\?%*:|"<>]/g, '_');
    const namePart = artist.trim()
      ? `${sanitize(artist.trim())}_${sanitize(song.trim() || 'Song')}`
      : sanitize(song.trim() || 'Song');
    link.download = `KsVOX_VocalAnalysis_${namePart}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const outputSongLabel = `${artist.trim() ? artist.trim() + ' - ' : ''}${song.trim()} [${tempo}]`;

  return (
    <>
      <Head>
        <title>英語歌唱お助けAI | K&apos;s VOX</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <style jsx global>{`
        .hourglass-flip {
          display: inline-block;
          animation: hourglassFlip 2s ease-in-out infinite;
        }
        @keyframes hourglassFlip {
          0%,
          40% {
            transform: rotate(0deg);
          }
          50%,
          90% {
            transform: rotate(180deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .loading-dots span {
          display: inline-block;
          animation: loadingDot 1.2s ease-in-out infinite;
        }
        .loading-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .loading-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes loadingDot {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .hourglass-flip,
          .loading-dots span {
            animation: none;
          }
        }
      `}</style>

      <div className="max-w-md md:max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* HEADER */}
        <header className="text-center relative py-5 bg-vintage-card rounded-2xl neon-tube-border overflow-hidden">
          <div className="absolute -top-6 -left-6 opacity-20 text-vintage-neonCyan pointer-events-none">
            <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z" />
            </svg>
          </div>
          <div className="absolute -bottom-6 -right-6 opacity-20 text-vintage-neonPink pointer-events-none">
            <i className="fa-solid fa-microphone-lines text-7xl"></i>
          </div>

          <div className="relative z-10 px-4">
            <div className="inline-flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full border border-vintage-neonYellow/60 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-xs font-bold tracking-widest text-vintage-neonYellow uppercase">
                K&apos;s VOX APPLICATION
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <img
                src="/logo.png"
                alt="K's VOX APP"
                className="h-12 w-12 md:h-14 md:w-14 flex-shrink-0"
              />
              <h1 className="text-3xl md:text-4xl font-black font-vintageTitle tracking-wider text-white">
                英語歌唱お助けAI
              </h1>
              <span className="bg-pink-600 text-white font-black text-[10px] md:text-xs px-2 py-0.5 rounded-md shadow-md transform -translate-y-1">
                Ver2.0
              </span>
            </div>

            <p className="text-xs md:text-sm text-gray-300 mt-1.5 font-medium">
              洋楽を格好よく歌うための
              <span className="text-vintage-neonCyan">発音・音節・リズム</span>
              即時アナライザー
            </p>
          </div>
        </header>

        {/* INPUT SECTION */}
        <section className="vintage-panel rounded-2xl p-5 md:p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-gray-700/80 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-sliders text-vintage-neonCyan"></i> 楽曲・歌詞データの入力
            </h2>
            <button
              type="button"
              onClick={handleSample}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-vintage-neonCyan px-2.5 py-1 rounded border border-vintage-neonCyan/40 transition"
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i> サンプル入力
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  ① アーティスト名 <span className="text-gray-500 font-normal">(任意)</span>
                </label>
                <div className="relative">
                  <i className="fa-solid fa-user-ninja absolute left-3 top-3 text-gray-400 text-sm"></i>
                  <input
                    type="text"
                    placeholder="例: Bruno Mars（オリジナル曲なら空欄でOK）"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-vintage-neonPink transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  ② 曲名 <span className="text-vintage-neonPink">*</span>
                </label>
                <div className="relative">
                  <i className="fa-solid fa-compact-disc absolute left-3 top-3 text-gray-400 text-sm"></i>
                  <input
                    type="text"
                    required
                    placeholder="例: Just the Way You Are"
                    value={song}
                    onChange={(e) => setSong(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-vintage-neonCyan transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                ③ 楽曲テンポ <span className="text-vintage-neonPink">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TEMPO_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setTempo(opt.key)}
                    className={`tempo-btn py-2 text-xs font-bold rounded-xl border border-gray-700 bg-slate-900 hover:bg-slate-800 transition flex items-center justify-center gap-1 ${
                      tempo === opt.key ? 'active' : ''
                    }`}
                  >
                    <i className={`fa-solid ${opt.icon}`}></i> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                ④ 英語の歌詞をコピペ(1コーラス程度/最大500文字まで){' '}
                <span className="text-vintage-neonPink">*</span>
              </label>
              <textarea
                rows={4}
                maxLength={500}
                required
                placeholder="ここに英語の歌詞を入力してください（最大500文字）..."
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                className="w-full bg-slate-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-vintage-neonPink transition leading-relaxed"
              ></textarea>
              {errorMsg && (
                <p className="text-xs font-bold text-vintage-neonPink mt-1.5">{errorMsg}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-white text-base bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 shadow-lg shadow-pink-600/30 transition transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="hourglass-flip" aria-hidden="true">⏳</span>
                  <span>ただ今分析中…</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-microchip"></i> AI分析を実行する
                </>
              )}
            </button>
          </form>
        </section>

        {/* OUTPUT SECTION */}
        {(result || loading) && (
          <section
            ref={analysisRef}
            className="bg-vintage-cream rounded-2xl p-5 md:p-6 text-vintage-textDark shadow-2xl space-y-5 relative border-4 border-amber-900/10"
          >
            <div className="flex items-center justify-between border-b-2 border-amber-900/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="bg-amber-900 text-amber-100 text-xs font-black px-2.5 py-1 rounded-md tracking-wider">
                  ANALYSIS REPORT
                </span>
                <h2 className="font-bold text-lg text-gray-900">分析結果</h2>
              </div>
              <span className="text-xs font-bold text-pink-700 bg-pink-100 px-2 py-1 rounded-full">
                {outputSongLabel}
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center space-y-3" role="status" aria-live="polite">
                <div className="text-5xl leading-none">
                  <span className="hourglass-flip" aria-hidden="true">⏳</span>
                </div>
                <p className="text-base font-bold text-gray-800">
                  只今分析中
                  <span className="loading-dots" aria-hidden="true">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </p>
                <p className="text-xs text-gray-500">ボーカルメソッドナレッジを照合しています。少しお待ちください。</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* ① 和訳 */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-900/10 space-y-1">
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                    <i className="fa-solid fa-language text-pink-600"></i> ① 音楽的で自然な和訳
                  </h3>
                  <p className="text-sm font-medium text-gray-800 leading-relaxed pt-1">
                    {result.translation}
                  </p>
                </div>

                {/* ② 音節・アクセント */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-900/10 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                      <i className="fa-solid fa-music text-pink-600"></i> ② 音節とアクセントの可視化
                    </h3>
                    <div className="text-[11px] flex gap-2 font-medium text-gray-600">
                      <span>
                        音節: <span className="font-bold text-gray-700">-</span>
                      </span>
                      <span>
                        句・節区切り: <strong className="text-sky-600">/</strong>
                      </span>
                      <span>
                        アクセント: <span className="bg-red-100 text-red-700 font-bold px-1">赤</span>
                      </span>
                      <span>
                        内容語: <span className="underline decoration-pink-500 font-bold">下線</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-sm md:text-base font-mono leading-loose tracking-wide pt-1 bg-amber-50/50 p-3 rounded-lg border border-amber-200/50">
                    <SyllableView lines={result.lines} />
                  </div>
                </div>

                {/* ③ 注意すべき単語 */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-900/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                      <i className="fa-solid fa-spell-check text-pink-600"></i> ③ 注意すべき単語
                    </h3>
                    <span className="text-[10px] text-gray-500 font-medium">
                      ※日本人難関発音・高校高学年相当レベル
                    </span>
                  </div>
                  <div className="space-y-2">
                    {result.vocabNotes && result.vocabNotes.length > 0 ? (
                      result.vocabNotes.map((v, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                        >
                          <div>
                            <span className="font-bold text-sm text-gray-900">{v.word}</span>
                            <span className="text-xs text-gray-500 font-mono ml-2">{v.ipa}</span>
                          </div>
                          <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            {v.meaning}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500">{result.vocabNoneMessage}</p>
                    )}
                  </div>
                </div>

                {/* ④ リンキング */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-900/10 space-y-2">
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                    <i className="fa-solid fa-link text-pink-600"></i> ④ 特徴的なリンキング（音の繋がり）
                  </h3>
                  {result.linkingNotes && result.linkingNotes.length > 0 ? (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium">
                      {result.linkingNotes.map((l, i) => (
                        <li
                          key={i}
                          className="bg-pink-50/80 p-2.5 rounded-lg border border-pink-100 flex items-center justify-between"
                        >
                          <span className="font-mono text-gray-700">{l.phrase}</span>
                          <span className="font-bold text-pink-700">{l.kana}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500">{result.linkingNoneMessage}</p>
                  )}
                </div>

                {/* ⑤ アドバイス */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-900/10 space-y-2">
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                    <i className="fa-solid fa-graduation-cap text-pink-600"></i> ⑤ K&apos;s VOX 歌唱メソッド・アドバイス
                  </h3>
                  <p className="text-xs md:text-sm text-gray-800 leading-relaxed font-medium bg-amber-50/60 p-3 rounded-lg border border-amber-200/50">
                    {result.advice}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveTxt}
                    className="w-full py-3 px-4 rounded-xl font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 border border-slate-300 transition shadow-sm flex items-center justify-center gap-2 text-sm"
                  >
                    <i className="fa-solid fa-file-arrow-down text-pink-600"></i> 分析結果をテキストで保存
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* PR SECTION */}
        <section className="space-y-5 pt-2">
          <div className="vintage-panel rounded-2xl p-4 shadow-xl border-t-2 border-red-600">
            <div className="flex items-center justify-between mb-3">
              <a
                href="https://www.youtube.com/@Ksvox"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold tracking-wider text-white hover:text-red-400 transition uppercase flex items-center gap-2 group"
              >
                <i className="fa-brands fa-youtube text-red-600 text-lg group-hover:scale-110 transition"></i>
                <span className="underline decoration-red-500/50">K&apos;s VOX YouTubeチャンネル</span>
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-gray-400"></i>
              </a>
              <span className="text-[10px] font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                RECOMMENDED
              </span>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-slate-900 border border-gray-800 p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded">
                  PLAYLIST
                </span>
                <h4 className="text-sm font-bold text-white">再生リスト: 「洋楽を歌おう」</h4>
              </div>
              <p className="text-xs text-gray-400">プロメソッドで学ぶ実践洋楽歌唱トレーニング</p>

              <div
                className="relative w-full rounded-lg overflow-hidden border border-gray-800"
                style={{ paddingBottom: '42%' }}
              >
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/videoseries?list=PLtNoF8CCU5z3WnkCN1-QDOCsJUwVJYhv3"
                  title="K's VOX 再生リスト: 洋楽を歌おう"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>

              <a
                href="https://youtube.com/playlist?list=PLtNoF8CCU5z3WnkCN1-QDOCsJUwVJYhv3&si=N-S7n3UIHixgoQuT"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition shadow flex items-center justify-center gap-1.5"
              >
                <i className="fa-brands fa-youtube"></i> 再生リストを視聴
              </a>
            </div>
          </div>

          <a
            href="https://www.ksvox.net/apply/"
            target="_blank"
            rel="noopener noreferrer"
            className="block group relative overflow-hidden rounded-2xl p-0.5 bg-gradient-to-r from-vintage-neonPink via-amber-400 to-vintage-neonCyan shadow-lg hover:shadow-pink-500/20 transition transform hover:-translate-y-0.5"
          >
            <div className="pr-banner-bg bg-vintage-card rounded-[14px] p-4 flex items-center justify-between gap-3 relative z-10">
              <div className="space-y-1 relative z-10">
                <span className="text-[10px] font-black tracking-widest bg-red-600 text-white px-2 py-0.5 rounded shadow">
                  お試しレッスン随時申込受付中！
                </span>
                <h3 className="text-sm md:text-base font-extrabold text-white group-hover:text-vintage-neonYellow transition leading-snug drop-shadow-md">
                  本気で歌が上手くなりたいなら、
                  <br className="hidden sm:block" />
                  門弟制ボーカルスクールK&apos;s VOXへ
                </h3>
              </div>
              <div className="flex-shrink-0 bg-vintage-neonPink text-white font-bold text-xs px-3 py-2.5 rounded-xl flex items-center gap-1 shadow-md group-hover:bg-pink-500 transition relative z-10">
                詳細 <i className="fa-solid fa-arrow-right"></i>
              </div>
            </div>
          </a>

          <footer className="text-center pt-2">
            <a
              href="https://www.ksvox.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-vintage-neonCyan transition font-medium inline-flex items-center gap-1"
            >
              提供：ボーカル道場K&apos;s VOX{' '}
              <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
            </a>
          </footer>
        </section>
      </div>
    </>
  );
}
