<script>
  import { Chat } from '@ai-sdk/svelte';
  import { onMount } from 'svelte';
  import { fetchRandomUser } from '$lib/fetchRandomUser';

  const chat = new Chat();
  let currentUser = $state(null);
  let isLoading = $state(true);
  let userMessage = $state("");
  let messagesContainer;


  // ★ここにBlob Storeのロゴ画像のURLを貼る
  const logo_img_url = "https://qsbkq9revdprke1d.public.blob.vercel-storage.com/vercel_tutorial/logo.png";

  // メッセージが追加されるたびに実行される$effect
  $effect(() => {
    // chat.messagesが変更されたらスクロールする
    if (chat.messages && messagesContainer) {
      scrollToBottom();
    }
  });

  // 最下部にスクロールする関数
  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  onMount(async () => {
    try {
      currentUser = await fetchRandomUser();
      isLoading = false;
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
      isLoading = false;
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      try {
        currentUser = await fetchRandomUser();
      } catch (error) {
        console.error('ユーザー取得エラー:', error);
        return;
      }
    }

    // ユーザー情報をオプションとして渡す
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

    // ユーザーメッセージを追加
    await chat.append({
      data: { user: userData },
      content: userMessage,
      role: "user"
    });
    
    // Chat SDKのhandleSubmitを呼び出す
    await chat.handleSubmit(e);
    
    // 入力フィールドをクリア
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
          <input 
            bind:value={userMessage} 
            placeholder="メッセージを入力してください..." 
            class="message-input" 
          />
          <button 
            type="submit" 
            disabled={isLoading} 
            class="send-button"
          >
            送信
          </button>
        </form>
      </div>
    </div>
  </div>
</main>

<style>
  .chat-container {
    display: flex;
    height: 100vh;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  
  .profile-section {
    width: 300px;
    border-right: 1px solid #e1e4e8;
    padding: 20px;
    background-color: #f8f9fa;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  
  .messages-section {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .messages-container {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    background-color: #fff;
    scroll-behavior: smooth;
  }
  
  .input-section {
    padding: 15px;
    border-top: 1px solid #e1e4e8;
    background-color: #f8f9fa;
  }
  
  .message-form {
    display: flex;
  }
  
  .message-input {
    flex: 1;
    padding: 12px;
    border: 1px solid #dfe1e5;
    border-radius: 24px;
    font-size: 16px;
    outline: none;
  }
  
  .send-button {
    margin-left: 10px;
    padding: 0 20px;
    background-color: #1a73e8;
    color: white;
    border: none;
    border-radius: 24px;
    font-weight: bold;
    cursor: pointer;
  }
  
  .send-button:disabled {
    background-color: #a8c7fa;
    cursor: not-allowed;
  }
  
  .message-row {
    display: flex;
    margin-bottom: 20px;
  }
  
  .message-row.user {
    flex-direction: row-reverse;
  }
  
  .message {
    max-width: 70%;
    padding: 15px;
    border-radius: 18px;
    position: relative;
  }
  
  .user-message {
    background-color: #e6f7ff;
    margin-right: 15px;
    border-top-right-radius: 4px;
  }
  
  .assistant-message {
    background-color: #f1f3f4;
    margin-left: 15px;
    border-top-left-radius: 4px;
  }
  
  .user-avatar, .assistant-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .user-avatar {
    background-color: #1a73e8;
    color: white;
  }
  
  .assistant-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .avatar-placeholder {
    font-size: 12px;
    font-weight: bold;
  }
  
  .message-header {
    margin-bottom: 8px;
    font-weight: bold;
  }
  
  .author-name {
    font-size: 15px;
  }
  
  .author-location {
    font-size: 13px;
    color: #5f6368;
    margin-left: 8px;
  }
  
  .message-text p {
    margin: 0;
    line-height: 1.5;
  }
  
  .message-info {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }
  
  .message-time {
    font-size: 12px;
    color: #5f6368;
  }
  
  .profile-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 20px;
    border-radius: 12px;
    background-color: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .profile-image {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 15px;
    border: 4px solid white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  
  .profile-info h2 {
    margin: 0 0 5px 0;
    font-size: 22px;
  }
  
  .real-name {
    color: #5f6368;
    margin: 0 0 15px 0;
    font-size: 16px;
  }
  
  .location, .age {
    margin: 5px 0;
    color: #5f6368;
    font-size: 14px;
  }
  
  .loading {
    text-align: center;
    padding: 20px;
    color: #5f6368;
  }
  
  .logo-section {
    margin-top: auto;
    padding-top: 20px;
  }
  
  .logo-image {
    width: 100%;
    height: auto;
    max-width: 260px;
    display: block;
  }
</style>
