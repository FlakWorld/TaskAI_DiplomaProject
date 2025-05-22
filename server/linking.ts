import { Platform } from 'react-native';

const linking = {
  prefixes: [
    'msauth://com.taskai',
    'com.taskai://',
    'com.taskai://oauthredirect',   // добавлено для Google
    Platform.OS === 'ios' ? 'msauth.com.taskai://auth' : 'msauth://com.taskai'
  ].filter(Boolean) as string[],
  config: {
    screens: {
      AuthCallback: {
        path: 'auth/:token?',
        parse: {
          token: (token: string) => token,
        },
      },
    },
  },
};

export default linking;