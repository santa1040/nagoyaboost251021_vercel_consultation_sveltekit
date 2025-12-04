<script>
  import { Chat } from '@ai-sdk/svelte';
  import { onMount } from 'svelte';

  // --- 2つのAIインスタンスを用意 ---
  // 1. 30秒ごとの箇条書き用
  const liveChat = new Chat();
  // 2. 最終的な全体要約用
  const summaryChat = new Chat();

  // --- ステート管理 (Svelte 5 Runes) ---
  let isRecording = $state(false);
  let fullTranscript = $state("");    // 全体の文字起こしテキスト
  let bufferText = "";                // 30秒間に溜まったテキスト（要約に投げたら空にする）
  let timeElapsed = $state(0);        // 30秒カウント用
  let timerInterval;                  // タイマーID
  
  let recognition;                    // 音声認識API
  let statusMessage = $state("待機中");

  // --- 初期化 ---
  onMount(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      statusMessage = "エラー: Chromeブラウザを使用してください。";
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        // 画面表示用と、30秒バッファ用の両方に追加
        const newText = finalTranscript + "。";
        fullTranscript += newText;
        bufferText += newText;
      }
    };

    recognition.onerror = (event) => {
      console.error("音声認識エラー:", event);
      if (event.error === 'not-allowed') {
        statusMessage = "マイクの使用が許可されていません。";
        stopRecording();
      }
    };

    recognition.onend = () => {
      // 録音中フラグが立っているのに止まった場合は再開する（ブラウザの仕様対策）
      if (isRecording) {
        try {
          recognition.start();
        } catch (e) {
          // すでに動いている等のエラーは無視
        }
      }
    };
  });

  // --- 録音・タイマー制御 ---
  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function startRecording() {
    try {
      recognition.start();
      isRecording = true;
      statusMessage = "録音中...";
      
      // 30秒タイマー開始
      timeElapsed = 0;
      timerInterval = setInterval(() => {
        timeElapsed++;
        if (timeElapsed >= 30) {
          triggerIntervalSummary();
          timeElapsed = 0;
        }
      }, 1000);

    } catch (e) {
      console.error(e);
    }
  }

  function stopRecording() {
    isRecording = false;
    statusMessage = "停止中";
    recognition.stop();
    clearInterval(timerInterval);
    timeElapsed = 0;
  }

  // --- 30秒ごとの処理 ---
  async function triggerIntervalSummary() {
    if (!bufferText.trim()) return; // 話していない場合はスキップ

    const textToSummarize = bufferText;
    bufferText = ""; // バッファをリセット

    // AIに送信（liveChatインスタンスを使用）
    // 過去の文脈を引き継ぎすぎないよう、明確に指示を出します
    await liveChat.append({
      role: "user",
      content: `以下の文章を簡潔な箇条書きでまとめてください（挨拶不要、事実のみ）：\n\n${textToSummarize}`
    });
  }

  // --- 全体要約ボタンの処理 ---
  async function handleFinalSummary() {
    if (!fullTranscript.trim()) return;

    // AIに送信（summaryChatインスタンスを使用）
    await summaryChat.append({
      role: "user",
      content: `以下の会議/会話のログを、重要なポイントを整理して包括的に要約してください：\n\n${fullTranscript}`
    });
  }
</script>

<main class="app-container">
  <header class="control-panel">
    <div class="status-indicator">
      <div class="status-dot {isRecording ? 'active' : ''}"></div>
      <span>{statusMessage}</span>
      {#if isRecording}
        <span class="timer">（次の要約まで: {30 - timeElapsed}秒）</span>
      {/if}
    </div>

    <div class="buttons">
      <button 
        class="record-btn {isRecording ? 'stop' : 'start'}" 
        onclick={toggleRecording}
      >
        {isRecording ? '録音停止' : '録音開始'}
      </button>

      <button 
        class="summary-btn" 
        onclick={handleFinalSummary}
        disabled={!fullTranscript}
      >
        全体を要約する
      </button>
    </div>
  </header>

  <div class="workspace">
    
    <div class="column transcript-column">
      <h3>文字起こしログ</h3>
      <div class="scroll-area">
        <p class="transcript-text">
          {fullTranscript || "ここに文字起こしテキストが表示されます..."}
        </p>
      </div>
    </div>

    <div class="column ai-column">
      
      <div class="section interval-summaries">
        <h3>リアルタイム要約 (30秒ごと)</h3>
        <div class="scroll-area-cards">
          {#each liveChat.messages as message}
            {#if message.role === 'assistant'}
              <div class="summary-card">
                {#each message.parts as part}
                  {#if part.type === 'text'}
                    <p>{part.text}</p>
                  {/if}
                {/each}
              </div>
            {/if}
          {/each}
          {#if isRecording && bufferText.length > 0}
             <div class="typing-indicator">集音中...</div>
          {/if}
        </div>
      </div>

      <div class="section final-result">
        <h3>全体要約結果</h3>
        <div class="result-box">
          {#each summaryChat.messages as message}
            {#if message.role === 'assistant'}
              <div class="final-content">
                {#each message.parts as part}
                  {#if part.type === 'text'}
                    <p>{part.text}</p>
                  {/if}
                {/each}
              </div>
            {/if}
          {/each}
          {#if summaryChat.isLoading}
            <p class="loading">全体を分析中...</p>
          {/if}
        </div>
      </div>

    </div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    background-color: #f0f2f5;
    color: #333;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  /* ヘッダー */
  .control-panel {
    background-color: #fff;
    padding: 15px 30px;
    border-bottom: 1px solid #ddd;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    z-index: 10;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: bold;
    color: #555;
  }

  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: #ccc;
    transition: background-color 0.3s;
  }

  .status-dot.active {
    background-color: #ea4335;
    box-shadow: 0 0 0 4px rgba(234, 67, 53, 0.2);
    animation: pulse 1.5s infinite;
  }

  .timer {
    font-weight: normal;
    color: #888;
    font-size: 0.9em;
  }

  .buttons {
    display: flex;
    gap: 15px;
  }

  button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    font-size: 14px;
    transition: opacity 0.2s;
  }

  button:hover {
    opacity: 0.9;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .record-btn.start {
    background-color: #ea4335;
    color: white;
  }

  .record-btn.stop {
    background-color: #333;
    color: white;
  }

  .summary-btn {
    background-color: #1a73e8;
    color: white;
  }

  /* ワークスペース (左右カラム) */
  .workspace {
    flex: 1;
    display: flex;
    overflow: hidden; /* コンテナ自体はスクロールさせない */
  }

  .column {
    flex: 1;
    padding: 20px;
    display: flex;
    flex-direction: column;
  }

  .transcript-column {
    border-right: 1px solid #ddd;
    background-color: #fff;
    max-width: 40%;
  }

  .ai-column {
    background-color: #f8f9fa;
    gap: 20px;
  }

  h3 {
    margin: 0 0 15px 0;
    font-size: 16px;
    color: #444;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 2px solid #eee;
    padding-bottom: 10px;
  }

  .scroll-area {
    flex: 1;
    overflow-y: auto;
    background-color: #fff;
    border: 1px solid #eee;
    padding: 15px;
    border-radius: 4px;
  }

  .transcript-text {
    white-space: pre-wrap;
    line-height: 1.8;
    font-size: 16px;
    color: #222;
  }

  /* 右側のセクション分割 */
  .section {
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 8px;
    padding: 15px;
    border: 1px solid #e1e4e8;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  .interval-summaries {
    flex: 2; /* 箇条書きエリアを広めに */
    overflow: hidden;
  }

  .final-result {
    flex: 1;
    overflow: hidden;
  }

  .scroll-area-cards {
    flex: 1;
    overflow-y: auto;
    padding-right: 5px;
  }

  /* カードスタイル */
  .summary-card {
    background-color: #fff;
    border-left: 4px solid #34a853; /* 緑のアクセント */
    padding: 12px;
    margin-bottom: 10px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    font-size: 14px;
    line-height: 1.6;
    border-radius: 0 4px 4px 0;
  }
  
  .summary-card p {
    margin: 0;
    white-space: pre-wrap;
  }

  .result-box {
    flex: 1;
    overflow-y: auto;
    background-color: #f0f7ff; /* 薄い青 */
    padding: 15px;
    border-radius: 4px;
    font-size: 15px;
    line-height: 1.6;
  }

  .final-content p {
    margin-top: 0;
  }

  .typing-indicator {
    font-size: 12px;
    color: #888;
    font-style: italic;
    padding: 5px;
  }
  
  .loading {
    color: #1a73e8;
    font-weight: bold;
    animation: blink 1s infinite;
  }

  @keyframes blink {
    50% { opacity: 0.5; }
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(234, 67, 53, 0); }
    100% { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0); }
  }
</style>