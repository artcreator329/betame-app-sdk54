// Crypto polyfill for React Native Web
if (typeof global !== 'undefined' && !global.crypto) {
  global.crypto = {};
}

if (typeof window !== 'undefined' && !window.crypto) {
  window.crypto = {};
}

// Polyfill crypto.getRandomValues for environments that don't support it
if (typeof crypto !== 'undefined' && !crypto.getRandomValues) {
  crypto.getRandomValues = function(array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

// Also add to global and window objects
if (typeof global !== 'undefined' && global.crypto && !global.crypto.getRandomValues) {
  global.crypto.getRandomValues = function(array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

if (typeof window !== 'undefined' && window.crypto && !window.crypto.getRandomValues) {
  window.crypto.getRandomValues = function(array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

export {};