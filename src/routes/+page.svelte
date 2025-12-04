<script>
  import { Chat } from '@ai-sdk/svelte';
  import { onMount } from 'svelte';
  import { fetchRandomUser } from '$lib/fetchRandomUser';

  const chat = new Chat();
  let currentUser = $state(null);
  let isLoading = $state(true);
  let userMessage = $state("");
  let messagesContainer;
  
  let isRecording = $state(false);
  // 状態を確認するための変数を追加
  let debugStatus = $state("初期化待ち..."); 

  // ★ここにBlob Storeのロゴ画像のURLを貼る
  const logo_img_url = "https://qsbkq9revdprke1d.public.blob.vercel-storage.com/vercel_tutorial/logo.png";
  
  // 変数をグローバルスコープではなく、コンポーネントスコープで保持
  let recognition;

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

    // --- 音声認識の初期化 & デバッグ ---
    debugStatus = "音声認識APIを確認中...";
    
    // ブラウザがAPIを持っているかチェック
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      debugStatus = "エラー: このブラウザはAPIを持っていません。";
      return;
    }

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
        // エラー内容を画面に表示
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
  });

  const toggleRecording = () => {
    if (!recognition) {
      alert(`機能が利用できません。\n状態: ${debugStatus}`);
      return;
    }

    if (isRecording) {
      recognition.stop();
      isRecording = false;
      debugStatus = "待機中";
    } else {
      // 録音開始
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

    const contentToSend = `【以下の録音データを要約してください】\n\n${userMessage}`;

    await chat.append({
      data: { user: userData },
      content: contentToSend,
      role: "user"
    });
    
    userMessage = "";
  };
</script>

<div style="font-size: 12px; color: red; text-align: center; padding: 5px;">
  デバッグ状態: {debugStatus}
</div>