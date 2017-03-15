module.exports = {
    extends: 'airbnb',
    rules: {
        indent: ['error', 4, {SwitchCase: 1}], // 4 is more readable than 2
        quotes: [2, 'single', 'avoid-escape'],
        curly: [2, 'all'], // Even single line should use {
        'comma-dangle': [2, 'never'],
        // We want args: none so we don't check args. Good for place holders from api callbacks
        'no-unused-vars': [2, {vars: 'local', args: 'none'}],
        'object-curly-spacing': ['error', 'never'],
        'consistent-this': [2, 'that'],
        camelcase: [2, {properties: 'always'}],
        'max-len': [2, 120, 4, {
            ignoreComments: true,
            ignoreUrls: true,
            ignorePattern: '^\\s*var\\s.+=\\s*require\\s*\\('
        }],
        'no-plusplus': 0, // a++ useful at times
        'arrow-parens': ['error', 'always'], // (a) => a should mirror syntax for (a,b) => a + b
        'no-use-before-define': 0, // Hoisting makes for cleaner code
        'no-underscore-dangle': 0, // We support private by convention
        'class-methods-use-this': 0 // I like calling foo.bar() instead of Foo.bar() for something that might not always be static
    }
};


