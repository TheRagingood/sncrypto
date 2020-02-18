import { SNPureCrypto } from './pure_crypto';
import { getGlobalScope, getSubtleCrypto } from "@Lib/utils";
const subtleCrypto = getSubtleCrypto();

export class SNWebCrypto extends SNPureCrypto {

  /**
  Public
  */

  async pbkdf2({password, salt, iterations, length}) {
    var key = await this.webCryptoImportKey(password, "PBKDF2", ["deriveBits"]);
    if(!key) {
      console.log("Key is null, unable to continue");
      return null;
    }

    return this.webCryptoDeriveBits(key, salt, iterations, length);
  }

  async generateRandomKey(bits) {
    const bytes = bits/8;
    const arrayBuffer = getGlobalScope().crypto.getRandomValues(new Uint8Array(bytes));
    return this.arrayBufferToHexString(arrayBuffer);
  }

  async aes256CbcEncrypt(text, keyData, ivData) {
    const alg = { name: 'AES-CBC', iv: ivData };
    const importedKeyData = await this.webCryptoImportKey(keyData, alg.name, ["encrypt"]);
    const textData = await this.stringToArrayBuffer(text);
    const result = await crypto.subtle.encrypt(alg, importedKeyData, textData);
    const ciphertext = await this.arrayBufferToBase64(result);
    return ciphertext;
  }

  async aes256CbcDecrypt(ciphertext, keyData, ivData) {
    const alg = { name: 'AES-CBC', iv: ivData };
    const importedKeyData = await this.webCryptoImportKey(keyData, alg.name, ["decrypt"]);
    const textData = await this.base64ToArrayBuffer(ciphertext);
    return crypto.subtle.decrypt(alg, importedKeyData, textData).then(async (result) => {
      const decoded = await this.arrayBufferToString(result);
      return decoded;
    }).catch((error) => {
      console.error("Error decrypting:", error);
    })
  }

  async aes256GcmEncrypt(text, keyData, ivData, aadData) {
    const alg = {
      name: 'AES-GCM',
      iv: ivData
    };
    if(aadData) { alg.additionalData = aadData }
    const importedKeyData = await this.webCryptoImportKey(keyData, alg.name, ["encrypt"]);
    const textData = await this.stringToArrayBuffer(text);
    const result = await crypto.subtle.encrypt(alg, importedKeyData, textData);
    const ciphertext = await this.arrayBufferToBase64(result);
    return ciphertext;
  }

  async aes256GcmDecrypt(ciphertext, keyData, ivData, aadData) {
    const alg = {
      name: 'AES-GCM',
      iv: ivData
    };
    if(aadData) { alg.additionalData = aadData }
    const importedKeyData = await this.webCryptoImportKey(keyData, alg.name, ["decrypt"]);
    const textData = await this.base64ToArrayBuffer(ciphertext);
    return crypto.subtle.decrypt(alg, importedKeyData, textData).then(async (result) => {
      const decoded = await this.arrayBufferToString(result);
      return decoded;
    }).catch((error) => {
      console.error("Error decrypting:", error);
    })
  }

  async hmac256(message, key) {
    var keyHexData = await this.hexStringToArrayBuffer(key);
    var keyData = await this.webCryptoImportKey(keyHexData, "HMAC", ["sign"], {name: "SHA-256"});
    var messageData = await this.stringToArrayBuffer(message);
    return crypto.subtle.sign({name: "HMAC"}, keyData, messageData)
    .then(async (signature) => {
      var hash = await this.arrayBufferToHexString(signature);
      return hash;
    })
    .catch(function(err){
      console.error("Error computing hmac", err);
    });
  }

  async sha256(text) {
    const textData = await this.stringToArrayBuffer(text);
    const digest = await crypto.subtle.digest("SHA-256", textData);
    return this.arrayBufferToHexString(digest);
  }

  /**
   * Use only for legacy applications.
  */
  async unsafe_sha1(text) {
    const textData = await this.stringToArrayBuffer(text);
    const digest = await crypto.subtle.digest("SHA-1", textData);
    return this.arrayBufferToHexString(digest);
  }

  /**
  Internal
  */

  async webCryptoImportKey(input, alg, actions, hash) {
    var text = typeof input === "string" ? await this.stringToArrayBuffer(input) : input;
    return subtleCrypto.importKey("raw", text, { name: alg, hash: hash }, false, actions)
    .then((key) => {
      return key;
    })
    .catch((err) => {
      console.error(err);
      return null;
    });
  }

  async webCryptoDeriveBits(key, pw_salt, pw_cost, length) {
    var params = {
      "name": "PBKDF2",
      salt: await this.stringToArrayBuffer(pw_salt),
      iterations: pw_cost,
      hash: {name: "SHA-512"},
    }

    return subtleCrypto.deriveBits(params, key, length)
    .then(async (bits) => {
      var key = await this.arrayBufferToHexString(new Uint8Array(bits));
      return key;
    })
    .catch((err) => {
      console.error(err);
      return null;
    });
  }

  async stringToArrayBuffer(string) {
    // Using FileReader for higher performance amongst larger files
    return new Promise((resolve, reject) => {
      var blob = new Blob([string]);
      var f = new FileReader();
      f.onload = function(e) {
        resolve(e.target.result);
      }
      f.readAsArrayBuffer(blob);
    })
  }

  async arrayBufferToString(arrayBuffer) {
    // Using FileReader for higher performance amongst larger files
    return new Promise((resolve, reject) => {
      var blob = new Blob([arrayBuffer]);
      var f = new FileReader();
      f.onload = function(e) {
        resolve(e.target.result);
      }
      f.readAsText(blob);
    })
  }

  async arrayBufferToHexString(arrayBuffer) {
    var byteArray = new Uint8Array(arrayBuffer);
    var hexString = "";
    var nextHexByte;

    for (var i=0; i<byteArray.byteLength; i++) {
      nextHexByte = byteArray[i].toString(16);
      if(nextHexByte.length < 2) {
        nextHexByte = "0" + nextHexByte;
      }
      hexString += nextHexByte;
    }
    return hexString;
  }

  async hexStringToArrayBuffer(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
    return new Uint8Array(bytes);
  }

  async base64ToArrayBuffer(base64) {
    var binary_string = await this.base64Decode(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for(var i = 0; i < len; i++)        {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async arrayBufferToBase64(buffer) {
    return new Promise((resolve, reject) => {
      var blob = new Blob([buffer],{type:'application/octet-binary'});
      var reader = new FileReader();
      reader.onload = function(evt){
        var dataurl = evt.target.result;
        resolve(dataurl.substr(dataurl.indexOf(',') + 1));
      };
      reader.readAsDataURL(blob);
    })
  }

}
