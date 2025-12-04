<script>
  import { Chat } from '@ai-sdk/svelte';
  import { onMount } from 'svelte';
  import { fetchRandomUser } from '$lib/fetchRandomUser';

  const chat = new Chat();
  let currentUser = $state(null);
  let isLoading = $state(true);
  let userMessage = $state("");
  let messagesContainer;
  
  // ★追加: 録音関連のステート
  let isRecording = $state(false);
  let recognition;

  // ★ここにBlob Storeのロゴ画像のURLを貼る
  const logo_img_url = "https://qsbkq9revdprke1d.public.blob.vercel-storage.com/vercel_tutorial/logo.png";

  $effect(() => {
    if (chat.messages && messagesContainer) {
      scrollToBottom();
    }
  });

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  onMount(async () => {
    try {
      currentUser = await fetchRandomUser();
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
    } finally {
      isLoading = false;
    }

    // ★追加: Web Speech APIの初期化
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.lang = 'ja-JP'; // 日本語に設定
      recognition.continuous = true; // 連続入力を許可
      recognition.interimResults = true; // 途中経過も表示

      recognition.onresult = (event) => {
        let finalTranscript = '';
        // 確定した結果を取得
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        // 入力フォームに追記（既存のテキストを消さないように結合）
        if (finalTranscript) {
          userMessage = (userMessage + " " + finalTranscript).trim();
        }
      };

      recognition.onerror = (event) => {
        console.error("音声認識エラー:", event.error);
        isRecording = false;
      };

      recognition.onend = () => {
        // 自然に止まった場合はステートを戻す（意図的に止めた場合を除く）
        if (isRecording) {
           // continuousでも止まることがあるため、必要なら再開処理を書くが、今回はシンプルにOFFにする
           isRecording = false;
        }
      };
    } else {
      console.warn("このブラウザは音声認識をサポートしていません。");
    }
  });

  // ★追加: 録音の開始・停止切り替え
  const toggleRecording = () => {
    if (!recognition) {
      alert("お使いのブラウザは音声認識に対応していません（Chrome推奨）。");
      return;
    }

    if (isRecording) {
      recognition.stop();
      isRecording = false;
    } else {
      recognition.start();
      isRecording = true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userMessage.trim()) return;

    if (isRecording) {
      toggleRecording(); // 送信時に録音を停止
    }

    if (!currentUser) {
      try {
        currentUser = await fetchRandomUser();
      } catch (error) {
        return;
      }
    }

    const userData = {
      name: `${currentUser.name.first} ${currentUser.name.last}`,
      gender: currentUser.gender,
      country: currentUser.location.country,
      city: currentUser.location.city,
      age: currentUser.dob.age,
      email: currentUser.email,
      username: currentUser.login.username,
      picture: currentUser.picture.thumbnail
    };

    // ★修正: 要約を依頼するプロンプトを自動付与して送信
    // ユーザーには入力したテキストだけを見せたいが、AIへの指示には要約を含める
    // Chat SDKの仕様上、表示と送信内容を変えるのは少し工夫がいるため、
    // ここではシンプルに送信テキスト自体に指示を含める形にします。
    const contentToSend = `【以下の録音データを要約してください】\n\n${userMessage}`;

    await chat.append({
      data: { user: userData },
      content: contentToSend, // ここを変更
      role: "user"
    });
    
    // SDKのhandleSubmitを呼ぶ（ただしappendで送信済みなので、ここではinputクリアのみ行う手もあるが、
    // appendを使う場合はhandleSubmit(e)を呼ばなくて良いケースが多い。
    // ai-sdk/svelteのappendは自動的にリクエストをトリガーします）
    
    userMessage = "";
  };
</script>

<main>
  <div class="chat-container">
    <div class="profile-section">
      {#if isLoading}
        <div class="loading">ユーザー情報を読み込み中...</div>
      {/if}
      
      {#if currentUser}
        <div class="profile-card">
          <img src={currentUser.picture.medium} alt="Profile" class="profile-image" />
          <div class="profile-info">
            <h2>@{currentUser.login.username}</h2>
            <p class="real-name">{currentUser.name.first} {currentUser.name.last}</p>
            <p class="location">{currentUser.location.country}, {currentUser.location.city}</p>
            <p class="age">{currentUser.dob.age}歳</p>
          </div>
        </div>
      {/if}
      
      <div class="logo-section">
        <img src={logo_img_url} alt="Logo" class="logo-image" />
      </div>
    </div>

    <div class="messages-section">
      <div class="messages-container" bind:this={messagesContainer}>
        {#each chat.messages as message, messageIndex (messageIndex)}
          <div class="message-row {message.role}">
            {#if message.role === 'user'}
              <div class="message user-message">
                <div class="message-text">
                  {#each message.parts as part, partIndex (partIndex)}
                    {#if part.type === 'text'}
                      <p>{part.text}</p>
                    {/if}
                  {/each}
                </div>
                <div class="message-info">
                  <span class="message-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <div class="user-avatar">
                <div class="avatar-placeholder">You</div>
              </div>
            {:else if message.role === 'assistant'}
              <div class="assistant-avatar">
                {#if currentUser}
                  <img src={currentUser.picture.thumbnail} alt="Avatar" />
                {/if}
              </div>
              <div class="message assistant-message">
                <div class="message-header">
                  {#if currentUser}
                    <span class="author-name">@{currentUser.login.username}</span>
                    <span class="author-location">{currentUser.location.country}</span>
                  {/if}
                </div>
                <div class="message-text">
                  {#each message.parts as part, partIndex (partIndex)}
                    {#if part.type === 'text'}
                      <p>{part.text}</p>
                    {/if}
                  {/each}
                </div>
                <div class="message-info">
                  <span class="message-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
      
      <div class="input-section">
        <form onsubmit={handleSubmit} class="message-form">
          <button 
            type="button" 
            class="mic-button {isRecording ? 'recording' : ''}" 
            onclick={toggleRecording}
            aria-label="音声入力を開始"
          >
            {#if isRecording}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="12" height="12" rx="2" fill="white"/>
              </svg>
            {:else}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            {/if}
          </button>

          <input 
            bind:value={userMessage} 
            placeholder={isRecording ? "話し続けてください..." : "メッセージを入力、またはマイクで録音して要約"} 
            class="message-input" 
          />
          <button 
            type="submit" 
            disabled={isLoading || (!userMessage && !isRecording)} 
            class="send-button"
          >
            要約する
          </button>
        </form>
      </div>
    </div>
  </div>
</main>

<style>
  /* 既存のスタイル */
  .chat-container { display: flex; height: 100vh; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
  .profile-section { width: 300px; border-right: 1px solid #e1e4e8; padding: 20px; background-color: #f8f9fa; display: flex; flex-direction: column; justify-content: space-between; }
  .messages-section { flex: 1; display: flex; flex-direction: column; }
  .messages-container { flex: 1; padding: 20px; overflow-y: auto; background-color: #fff; scroll-behavior: smooth; }
  .input-section { padding: 15px; border-top: 1px solid #e1e4e8; background-color: #f8f9fa; }
  .message-form { display: flex; align-items: center; gap: 10px; } /* gap追加 */
  
  .message-input {
    flex: 1;
    padding: 12px;
    border: 1px solid #dfe1e5;
    border-radius: 24px;
    font-size: 16px;
    outline: none;
  }
  
  .send-button {
    padding: 0 20px;
    height: 44px; /* 高さ固定 */
    background-color: #1a73e8;
    color: white;
    border: none;
    border-radius: 24px;
    font-weight: bold;
    cursor: pointer;
    white-space: nowrap;
  }
  
  .send-button:disabled { background-color: #a8c7fa; cursor: not-allowed; }

  /* ★追加: マイクボタンのスタイル */
  .mic-button {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid #dfe1e5;
    background-color: white;
    color: #5f6368;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .mic-button:hover {
    background-color: #f1f3f4;
  }

  /* 録音中のスタイル */
  .mic-button.recording {
    background-color: #ea4335;
    color: white;
    border-color: #ea4335;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(234, 67, 53, 0); }
    100% { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0); }
  }

  /* 以下、既存のメッセージスタイル */
  .message-row { display: flex; margin-bottom: 20px; }
  .message-row.user { flex-direction: row-reverse; }
  .message { max-width: 70%; padding: 15px; border-radius: 18px; position: relative; }
  .user-message { background-color: #e6f7ff; margin-right: 15px; border-top-right-radius: 4px; }
  .assistant-message { background-color: #f1f3f4; margin-left: 15px; border-top-left-radius: 4px; }
  .user-avatar, .assistant-avatar { width: 36px; height: 36px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .user-avatar { background-color: #1a73e8; color: white; }
  .assistant-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-placeholder { font-size: 12px; font-weight: bold; }
  .message-header { margin-bottom: 8px; font-weight: bold; }
  .author-name { font-size: 15px; }
  .author-location { font-size: 13px; color: #5f6368; margin-left: 8px; }
  .message-text p { margin: 0; line-height: 1.5; white-space: pre-wrap; } /* 改行対応 */
  .message-info { display: flex; justify-content: flex-end; margin-top: 8px; }
  .message-time { font-size: 12px; color: #5f6368; }
  .profile-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px; border-radius: 12px; background-color: white; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
  .profile-image { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 4px solid white; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); }
  .profile-info h2 { margin: 0 0 5px 0; font-size: 22px; }
  .real-name { color: #5f6368; margin: 0 0 15px 0; font-size: 16px; }
  .location, .age { margin: 5px 0; color: #5f6368; font-size: 14px; }
  .loading { text-align: center; padding: 20px; color: #5f6368; }
  .logo-section { margin-top: auto; padding-top: 20px; }
  .logo-image { width: 100%; height: auto; max-width: 260px; display: block; }
</style>