<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchRandomUser, type User } from '$lib/fetchRandomUser';

  let user: User | null = null;
  let loading = true;
  let error: string | null = null;

  // ユーザーデータを読み込む関数
  async function loadUser() {
    loading = true;
    error = null;
    
    try {
      user = await fetchRandomUser();
    } catch (err) {
      error = err instanceof Error ? err.message : '不明なエラーが発生しました';
    } finally {
      loading = false;
    }
  }

  // 新しいユーザーを読み込む関数
  function loadNewUser() {
    loadUser();
  }

  // コンポーネントがマウントされた時に初回読み込み
  onMount(() => {
    loadUser();
  });
</script>

<main>
  <h1>ユーザー情報取得チェック</h1>

  <button on:click={loadNewUser} style="margin-bottom: 15pt;">新しいユーザーを表示</button>

  {#if loading}
    <p>読み込み中...</p>
  {:else if error}
    <p>エラー: {error}</p>
    <button on:click={loadNewUser}>ユーザーを変更</button>
  {:else if user}
    <div>
      <img src={user.picture.large} alt="ユーザープロフィール画像" />
      
      <h2>{user.name.title} {user.name.first} {user.name.last}</h2>
      
      <table>
        <tbody>
          <tr>
            <th>基本情報</th>
            <td>
              <ul>
                <li>性別: {user.gender}</li>
                <li>年齢: {user.dob.age}歳</li>
                <li>国籍: {user.nat}</li>
                <li>メール: {user.email}</li>
              </ul>
            </td>
          </tr>
          <tr>
            <th>連絡先</th>
            <td>
              <ul>
                <li>電話: {user.phone}</li>
                <li>携帯: {user.cell}</li>
              </ul>
            </td>
          </tr>
          <tr>
            <th>住所</th>
            <td>
              <ul>
                <li>国: {user.location.country}</li>
                <li>都市: {user.location.city}</li>
                <li>州/県: {user.location.state}</li>
                <li>番地: {user.location.street.number} {user.location.street.name}</li>
                <li>郵便番号: {user.location.postcode}</li>
              </ul>
            </td>
          </tr>
          <tr>
            <th>アカウント</th>
            <td>
              <ul>
                <li>ユーザー名: {user.login.username}</li>
                <li>UUID: {user.login.uuid}</li>
                <li>登録日: {new Date(user.registered.date).toLocaleDateString()}</li>
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
      
    </div>
  {/if}
</main>