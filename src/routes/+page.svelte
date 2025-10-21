<script>
  import { Chat } from '@ai-sdk/svelte';
  import { onMount } from 'svelte';
  import { fetchRandomUser } from '$lib/fetchRandomUser';

  const chat = new Chat();
  let currentUser = $state(null);
  let isLoading = $state(true);
  let userMessage = $state("");
  let messagesContainer;

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
  <div>
    <div>
      {#if isLoading}
        <div>ユーザー情報を読み込み中...</div>
      {/if}
      
      {#if currentUser}
        <div>
          <img src={currentUser.picture.medium} alt="Profile" />
          <div>
            <h2>@{currentUser.login.username}</h2>
            <p>{currentUser.name.first} {currentUser.name.last}</p>
            <p>{currentUser.location.country}, {currentUser.location.city}</p>
            <p>{currentUser.dob.age}歳</p>
          </div>
        </div>
      {/if}
    </div>

    <div>
      <div bind:this={messagesContainer}>
        {#each chat.messages as message, messageIndex (messageIndex)}
          <div>
            {#if message.role === 'user'}
              <div>
                <div>
                  {#each message.parts as part, partIndex (partIndex)}
                    {#if part.type === 'text'}
                      <p>{part.text}</p>
                    {/if}
                  {/each}
                </div>
                <div>
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <div>
                <div>You</div>
              </div>
            {:else if message.role === 'assistant'}
              <hr />
              <div>
                {#if currentUser}
                  <img src={currentUser.picture.thumbnail} alt="Avatar" />
                {/if}
              </div>
              <div>
                <div>
                  {#if currentUser}
                    <span>@{currentUser.login.username}</span>
                    <span>{currentUser.location.country}</span>
                  {/if}
                </div>
                <div>
                  {#each message.parts as part, partIndex (partIndex)}
                    {#if part.type === 'text'}
                      <p>{part.text}</p>
                    {/if}
                  {/each}
                </div>
                <div>
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <hr />
            {/if}
          </div>
        {/each}
      </div>
      
      <div>
        <form onsubmit={handleSubmit}>
          <input 
            bind:value={userMessage} 
            placeholder="メッセージを入力してください..." 
          />
          <button 
            type="submit" 
            disabled={isLoading}
          >
            送信
          </button>
        </form>
      </div>
    </div>
  </div>
</main>
