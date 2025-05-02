module.exports = {
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false, // <-- самое важное
  },
  extends: [
    '@react-native-community', // если используешь стандартные правила RN
  ],
};
