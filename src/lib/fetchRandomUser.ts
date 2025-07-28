// lib/api.ts

// ユーザーデータの型定義
export interface User {
    gender: string;
    name: {
      title: string;
      first: string;
      last: string;
    };
    email: string;
    picture: {
      large: string;
      medium: string;
      thumbnail: string;
    };
    location: {
      country: string;
      city: string;
      state: string;
      street: {
        number: number;
        name: string;
      };
      postcode: string | number;
      coordinates: {
        latitude: string;
        longitude: string;
      };
      timezone: {
        offset: string;
        description: string;
      };
    };
    phone: string;
    cell: string;
    login: {
      uuid: string;
      username: string;
      password: string;
      salt: string;
      md5: string;
      sha1: string;
      sha256: string;
    };
    dob: {
      date: string;
      age: number;
    };
    registered: {
      date: string;
      age: number;
    };
    id: {
      name: string;
      value: string | null;
    };
    nat: string;
  }
  
  // APIレスポンスの型定義
  export interface RandomUserResponse {
    results: User[];
    info: {
      seed: string;
      results: number;
      page: number;
      version: string;
    };
  }
  
  /**
   * Random User Generatorからランダムユーザーを取得する関数
   * @returns 取得したユーザーデータ
   */
  export async function fetchRandomUser(): Promise<User> {
    const response = await fetch('https://randomuser.me/api/');
    
    if (!response.ok) {
      throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as RandomUserResponse;
    return data.results[0];
  }