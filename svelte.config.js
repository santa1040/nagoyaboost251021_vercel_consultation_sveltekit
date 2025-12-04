import adapter from '@sveltejs/adapter-vercel'; // ← ここを変更
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter() // ← ここを変更
	}
};

export default config;