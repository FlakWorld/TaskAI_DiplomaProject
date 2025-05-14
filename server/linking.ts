import { Platform } from 'react-native';

const linking = {
  prefixes: [
    'msauth://com.taskai',
    'com.taskai://',
    Platform.OS === 'ios' ? 'msauth.com.taskai://auth' : 'msauth://com.taskai'
  ].filter(Boolean) as string[], // Убедимся, что все элементы строки
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