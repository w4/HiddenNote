# HiddenNote

Client-side decrypted self destructing notes. Falls backs to client side encryption and decryption if specifically allowed by the user, obviously decreasing security by a huge amount due to plain data traveling over the wire.

Uses Python 3 on the backend for handling retriving and caching ciphertext in the Redis data store—also handles encryption and decryption for non-js clients.

All JavaScript is written in ES6 then transpiled down by Babel, we use [crypto-js](https://github.com/brix/crypto-js) for encryption and decryption on the client side and [pycrypto](https://pypi.python.org/pypi/pycrypto) at the server side. The [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) is used to generate a key and a nonce for the paste.

All HiddenNote user data is encrypted using AES-256-CBC. If both ends have JavaScript enabled, the server will never know the keys. On first access to the note, it will be removed from our datastore—this is by design for OPSEC reasons.

On the frontend we're using [Foundation](http://foundation.zurb.com/) as the framework and indentation syntax SASS for styling.