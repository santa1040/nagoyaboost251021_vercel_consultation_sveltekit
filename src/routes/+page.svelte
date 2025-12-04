<script>
  import { Chat } from '@ai-sdk/svelte';
  import { onMount } from 'svelte';
  import { fetchRandomUser } from '$lib/fetchRandomUser';

  const chat = new Chat();
  
  let currentUser = $state(null);
  let isLoading = $state(true);
  let userMessage = $state("");
  let messagesContainer;
  
  // 録音・デバッグ用ステート
  let isRecording = $state(false);
  let debugStatus = $state("初期化待ち..."); 
  let recognition; 

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
    // 1. マイクの準備
    debugStatus = "音声認識APIを確認中...";
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      debugStatus = "エラー: このブラウザは音声認識APIを持っていません (Chrome推奨)。";
    } else {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
          debugStatus = "録音中... (話しかけてください)";
        };

        recognition.onresult = (event) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            userMessage = (userMessage + " " + finalTranscript).trim();
          }
        };

        recognition.onerror = (event) => {
          console.error("詳細エラー:", event);
          isRecording = false;
          if (event.error === 'not-allowed') {
            debugStatus = "エラー: マイクの使用が許可されていません。";
          } else if (event.error === 'network') {
            debugStatus = "エラー: ネットワーク接続が必要です。";
          } else {
            debugStatus = `エラー発生: ${event.error}`;
          }
        };

        recognition.onend = () => {
          if (isRecording) {
            isRecording = false;
            debugStatus = "待機中 (自動停止しました)";
          }
        };
        debugStatus = "待機中 (準備OK)";
      } catch (e) {
        console.error(e);
        debugStatus = `初期化例外: ${e.message}`;
      }
    }

    // 2. ユーザー取得（失敗してもOKにする）
    try {
      currentUser = await fetchRandomUser();
    } catch (error) {
      console.error('ユーザー取得エラー（無視して続行）:', error);
    } finally {
      isLoading = false;
    }
  });

  const toggleRecording = () => {
    if (!recognition) {
      alert(`機能が利用できません。\n現在の状態: ${debugStatus}`);
      return;
    }
    if (isRecording) {
      recognition.stop();
      isRecording = false;
      debugStatus = "待機中 (停止)";
    } else {
      try {
        recognition.start();
        isRecording = true;
      } catch (e) {
        console.error(e);
        isRecording = false;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userMessage.trim()) return;

    if (isRecording) {
      toggleRecording();
    }

    // ユーザー情報がない場合はゲストとして扱う
    const userData = currentUser ? {
      name: `${currentUser.name.first} ${currentUser.name.last}`,
      gender: currentUser.gender,
      country: currentUser.location.country,
      city: currentUser.location.city,
      age: currentUser.dob.age,
      email: currentUser.email,
      username: currentUser.login.username,
      picture: currentUser.picture.thumbnail
    } : { 
      name: "Guest User",
      gender: "unknown",
      country: "Japan",
      city: "Tokyo",
      age: 30,
      email: "guest@example.com",
      username: "guest",
      picture: "https://via.placeholder.com/150" // 仮の画像
    };

    const contentToSend = `【以下の録音データを要約してください】\n\n${userMessage}`;

    await chat.append({
      data: { user: userData },
      content: contentToSend,
      role: "user"
    });
    
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
      {:else if !isLoading}
        <div class="profile-card">
          <div class="profile-image" style="background: #ccc; display:flex; align-items:center; justify-content:center;">G</div>
          <div class="profile-info">
            <h2>Guest</h2>
            <p class="real-name">ゲストユーザー</p>
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
                {:else}
                   <div style="width:100%; height:100%; background:#ccc;"></div>
                {/if}
              </div>
              <div class="message assistant-message">
                <div class="message-header">
                  {#if currentUser}
                    <span class="author-name">@{currentUser.login.username}</span>
                    <span class="author-location">{currentUser.location.country}</span>
                  {:else}
                    <span class="author-name">AI Assistant</span>
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
      
      <div style="font-size: 12px; color: #ea4335; text-align: center; padding: 5px; background-color: #f8f9fa;">
        システム状態: {debugStatus}
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
            placeholder={isRecording ? "聞いています..." : "メッセージを入力、またはマイクで録音して要約"} 
            class="message-input" 
          />
          <button 
            type="submit" 
            disabled={!userMessage} 
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
  .chat-container { display: flex; height: 100vh; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
  .profile-section { width: 300px; border-right: 1px solid #e1e4e8; padding: 20px; background-color: #f8f9fa; display: flex; flex-direction: column; justify-content: space-between; }
  .messages-section { flex: 1; display: flex; flex-direction: column; }
  .messages-container { flex: 1; padding: 20px; overflow-y: auto; background-color: #fff; scroll-behavior: smooth; }
  .input-section { padding: 15px; border-top: 1px solid #e1e4e8; background-color: #f8f9fa; }
  .message-form { display: flex; align-items: center; gap: 10px; }
  .message-input { flex: 1; padding: 12px; border: 1px solid #dfe1e5; border-radius: 24px; font-size: 16px; outline: none; }
  .send-button { padding: 0 20px; height: 44px; background-color: #1a73e8; color: white; border: none; border-radius: 24px; font-weight: bold; cursor: pointer; white-space: nowrap; }
  .send-button:disabled { background-color: #a8c7fa; cursor: not-allowed; }
  .mic-button { width: 44px; height: 44px; border-radius: 50%; border: 1px solid #dfe1e5; background-color: white; color: #5f6368; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .mic-button:hover { background-color: #f1f3f4; }
  .mic-button.recording { background-color: #ea4335; color: white; border-color: #ea4335; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(234, 67, 53, 0); } 100% { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0); } }
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
  .message-text p { margin: 0; line-height: 1.5; white-space: pre-wrap; }
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