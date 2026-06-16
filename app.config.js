/* global __dirname */

const fs = require('fs');
const path = require('path');

function readEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) return {};

  return fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .reduce((values, line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) return values;

      const key = line.slice(0, separatorIndex).trim();
      const value = line
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      values[key] = value;
      return values;
    }, {});
}

module.exports = ({ config }) => {
  const envLocal = readEnvLocal();
  const googleIosRedirectScheme =
    process.env.GOOGLE_IOS_REDIRECT_SCHEME || envLocal.GOOGLE_IOS_REDIRECT_SCHEME;
  const scheme = googleIosRedirectScheme ? ['fixy-app', googleIosRedirectScheme] : config.scheme;

  return {
    ...config,
    scheme,
    extra: {
      ...config.extra,
      apiUrl: process.env.API_URL || envLocal.API_URL,
      fptProxyUrl:
        process.env.FPT_PROXY_URL ||
        envLocal.FPT_PROXY_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        envLocal.NEXT_PUBLIC_APP_URL,
      fptAiApiKey: process.env.FPT_AI_API_KEY || envLocal.FPT_AI_API_KEY,
      chatHubUrl: process.env.CHAT_HUB_URL || envLocal.CHAT_HUB_URL,
      notificationHubUrl: process.env.NOTIFICATION_HUB_URL || envLocal.NOTIFICATION_HUB_URL,
      goongApiKey: process.env.GOONG_API_KEY || envLocal.GOONG_API_KEY,
      goongMaptilesApiKey: process.env.GOONG_MAPTILES_API_KEY || envLocal.GOONG_MAPTILES_API_KEY,
      vietnamProvincesApiUrl:
        process.env.VIETNAM_PROVINCES_API_URL ||
        envLocal.VIETNAM_PROVINCES_API_URL ||
        'https://provinces.open-api.vn/api/v2',
      googleClientId: process.env.GOOGLE_CLIENT_ID || envLocal.GOOGLE_CLIENT_ID,
      googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID || envLocal.GOOGLE_IOS_CLIENT_ID,
      googleAndroidClientId:
        process.env.GOOGLE_ANDROID_CLIENT_ID || envLocal.GOOGLE_ANDROID_CLIENT_ID,
      googleIosRedirectScheme,
    },
  };
};
