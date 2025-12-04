<script>

  // @ts-nocheck
  import { Chat } from '@ai-sdk/svelte';
  import { onMount } from 'svelte';

  // --- 2つのAIインスタンス ---
  const liveChat = new Chat();     // 30秒ごとの箇条書き用
  const summaryChat = new Chat();  // 全体要約用

  // --- ステート管理 ---
  let isRecording = $state(false);
  let fullTranscript = $state("");    // 全体の文字起こし
  let bufferText = "";                // 一時保存用テキスト（要約に投げたら空にする）
  let timeElapsed = $state(0);        // タイマー
  let timerInterval;
  
  let recognition;
  let statusMessage = $state("待機中");

  // 読み上げ用ステート
  let isSpeaking = $state(false);

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
      if (isRecording) {
        try { recognition.start(); } catch (e) {}
      }
    };
  });

  // --- 録音制御 ---
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

    // ★修正1: 停止時にバッファに残っているテキストがあれば、即座に要約処理へ回す
    if (bufferText.trim().length > 0) {
      triggerIntervalSummary();
    }
  }

  // --- 箇条書き処理 ---
  async function triggerIntervalSummary() {
    if (!bufferText.trim()) return; 

    const textToSummarize = bufferText;
    bufferText = ""; // バッファリセット

    await liveChat.append({
      role: "user",
      content: `以下の文章を簡潔な箇条書きでまとめてください（挨拶不要、事実のみ、JSON不可）：\n\n${textToSummarize}`
    });
  }

  // --- 全体要約処理 ---
  async function handleFinalSummary() {
    // 読み上げ中なら止める
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
    }

    if (!fullTranscript.trim()) return;

    await summaryChat.append({
      role: "user",
      content: `以下の会議/会話のログを、重要なポイントを整理して包括的に要約してください。JSON形式ではなく、見出しや箇条書きを使った読みやすいテキスト形式（マークダウン）で出力してください：\n\n${fullTranscript}`
    });
  }

  // --- ★追加: 読み上げ機能 ---
  function toggleSpeech() {
    if (isSpeaking) {
      // 停止処理
      window.speechSynthesis.cancel();
      isSpeaking = false;
    } else {
      // 再生処理
      // AIの最後のメッセージ（要約結果）を取得
      const lastMessage = summaryChat.messages.filter(m => m.role === 'assistant').pop();
      
      if (!lastMessage) return; // まだ要約がない

      // テキスト部分を抽出
      let textToRead = "";
      lastMessage.parts.forEach(part => {
        if (part.type === 'text') textToRead += part.text;
      });

      // マークダウン記号（#や*）を読み上げないように簡易削除（正規表現）
      // ※厳密な除去ではないですが、聞きやすくなります
      textToRead = textToRead.replace(/[#*`\-]/g, '');

      const uttr = new SpeechSynthesisUtterance(textToRead);
      uttr.lang = 'ja-JP';
      uttr.rate = 1.0; // 速度
      
      uttr.onend = () => {
        isSpeaking = false;
      };

      window.speechSynthesis.speak(uttr);
      isSpeaking = true;
    }
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
        <div class="section-header">
          <h3>全体要約結果</h3>
          {#if summaryChat.messages.length > 0 && !summaryChat.isLoading}
            <button class="speak-btn {isSpeaking ? 'speaking' : ''}" onclick={toggleSpeech}>
              {#if isSpeaking}
                ■ 読み上げ停止
              {:else}
                ▶ 要約を読み上げ
              {/if}
            </button>
          {/if}
        </div>

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
  :global(body) { margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f0f2f5; color: #333; }
  .app-container { display: flex; flex-direction: column; height: 100vh; }
  .control-panel { background-color: #fff; padding: 15px 30px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); z-index: 10; }
  .status-indicator { display: flex; align-items: center; gap: 10px; font-weight: bold; color: #555; }
  .status-dot { width: 12px; height: 12px; border-radius: 50%; background-color: #ccc; transition: background-color 0.3s; }
  .status-dot.active { background-color: #ea4335; box-shadow: 0 0 0 4px rgba(234, 67, 53, 0.2); animation: pulse 1.5s infinite; }
  .timer { font-weight: normal; color: #888; font-size: 0.9em; }
  .buttons { display: flex; gap: 15px; }
  
  /* ボタン共通スタイル */
  button { padding: 8px 16px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; transition: opacity 0.2s; }
  button:hover { opacity: 0.9; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }

  .record-btn.start { background-color: #ea4335; color: white; }
  .record-btn.stop { background-color: #333; color: white; }
  .summary-btn { background-color: #1a73e8; color: white; }

  /* 読み上げボタン */
  .speak-btn { background-color: #e8f0fe; color: #1a73e8; border: 1px solid #d2e3fc; font-size: 12px; margin-left: auto; }
  .speak-btn:hover { background-color: #d2e3fc; }
  .speak-btn.speaking { background-color: #ea4335; color: white; border-color: #ea4335; }

  .workspace { flex: 1; display: flex; overflow: hidden; }
  .column { flex: 1; padding: 20px; display: flex; flex-direction: column; }
  .transcript-column { border-right: 1px solid #ddd; background-color: #fff; max-width: 40%; }
  .ai-column { background-color: #f8f9fa; gap: 20px; }
  
  .section-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
  h3 { margin: 0; font-size: 16px; color: #444; text-transform: uppercase; letter-spacing: 0.05em; }
  .transcript-column h3 { border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }

  .scroll-area { flex: 1; overflow-y: auto; background-color: #fff; border: 1px solid #eee; padding: 1